const { supabase, supabaseAdmin } = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');
const config = require('../config');

/** Publication window for a newly published gig, from backend config. */
const expiryFromNow = () =>
  new Date(Date.now() + config.GIG.VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

/**
 * A gig is only open to applications while ACTIVE *and* inside its window.
 * The scheduler flips lapsed rows to EXPIRED, but this covers the gap between
 * sweeps so behaviour never depends on when the sweep last ran.
 */
const isGigOpenForApplications = (gig) =>
  gig.status === 'ACTIVE' && (!gig.expiresAt || new Date(gig.expiresAt) > new Date());

/**
 * Maps a publish_gig_with_credit / close_gig_and_release / reallocate RPC
 * error message to the right HTTP status/code. All of these RPCs RAISE
 * EXCEPTION with a bare code string (see schema.sql section 23) rather than
 * a client-safe message, so this is the one place that turns them into the
 * app's usual { message, statusCode, code } shape.
 */
const PUBLISH_ERROR_MAP = {
  GIG_NOT_FOUND: ['This collab does not exist or has been deleted.', 404, 'NOT_FOUND'],
  GIG_NOT_PUBLISHABLE: ['This collab is already live.', 400, 'ALREADY_ACTIVE'],
  GIG_NOT_DRAFT: ['This collab is already live.', 400, 'ALREADY_ACTIVE'],
  INVALID_SLOTS: ['Every active campaign needs at least 1 application slot.', 400, 'INVALID_SLOTS'],
  INSUFFICIENT_CAMPAIGN_CREDITS: [
    'You have no Campaign Credits remaining. Please request an upgrade or top-up from the YouCollab team.',
    402,
    'INSUFFICIENT_CAMPAIGN_CREDITS',
  ],
  INSUFFICIENT_SLOTS: [
    "That's more Application Slots than you have available. Free some up or request more from the YouCollab team.",
    402,
    'INSUFFICIENT_SLOTS',
  ],
  SLOTS_BELOW_RECEIVED: [
    'This campaign already received applications — allocate at least that many slots.',
    400,
    'SLOTS_BELOW_RECEIVED',
  ],
};

const throwFromRpcError = (error) => {
  const code = (error?.message || '').trim();
  const mapped = PUBLISH_ERROR_MAP[code];
  if (mapped) {
    throw new AppError(mapped[0], mapped[1], mapped[2]);
  }
  console.error('[gig.service] Unexpected RPC error:', error);
  throw new AppError('Something went wrong. Try again.', 500, 'DATABASE_ERROR');
};

/**
 * Helper to retrieve brand associated with userId.
 */
const getBrandByUserId = async (userId) => {
  const { data: brand, error } = await supabaseAdmin
    .from('brands')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error) {
    console.error(`[getBrandByUserId] Supabase database error:`, error);
    throw new AppError(`Database profile query failed: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  if (!brand) {
    console.warn(`[getBrandByUserId] No brand profile found for user ID: ${userId}`);
    throw new AppError('Complete your brand onboarding to perform this action.', 400, 'ONBOARDING_REQUIRED');
  }

  return brand;
};

/**
 * Create a new Gig. Always inserts as DRAFT first — a draft costs nothing,
 * so this step alone can never fail on credits/slots. If the caller asked
 * for it to go live immediately (status omitted or "ACTIVE"), the atomic
 * publish_gig_with_credit RPC runs right after: on success the response is
 * the live gig; on failure (no credits, no slots) the gig is *not* deleted
 * — it's left sitting as a DRAFT so the brand doesn't lose what they wrote
 * and can top up and publish it later, exactly the PRD's "credit unchanged,
 * Gig remains Draft" rule for a failed publish.
 */
const createGig = async (userId, data) => {
  const brand = await getBrandByUserId(userId);

  // A radius gig needs the brand's own coordinates to measure distance from
  // — guard here rather than let it silently degrade to "Anywhere" later.
  if (data.radiusKm && (brand.latitude == null || brand.longitude == null)) {
    throw new AppError('Add your PIN code to your brand profile before setting a collab radius.', 400, 'LOCATION_REQUIRED');
  }

  const wantsPublish = (data.status || 'ACTIVE') !== 'DRAFT';
  const requestedSlots = data.applicationSlots ?? 1;

  const payload = {
    brandId: brand.id,
    title: data.title,
    description: data.description,
    budgetMin: data.budgetMin,
    budgetMax: data.budgetMax,
    deliverables: data.deliverables,
    creatorRequirements: data.creatorRequirements,
    platform: data.platform,
    campaignType: data.campaignType,
    deadline: data.deadline,
    category: data.category,
    city: data.city || 'Pune',
    status: 'DRAFT',
    radiusKm: data.radiusKm ?? null,
    applicationSlots: requestedSlots,
    publishedAt: null,
    expiresAt: null,
  };
  const { data: newGig, error } = await supabaseAdmin
    .from('gigs')
    .insert(payload)
    .select('*, brand:brands(*)')
    .single();

  if (error) {
    console.error(`[Create Gig Debug] Supabase error:`, error);
    throw new AppError(`Failed to create gig: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  if (!wantsPublish) {
    return newGig;
  }

  const { data: publishRows, error: publishError } = await supabaseAdmin.rpc('publish_gig_with_credit', {
    p_gig_id: newGig.id,
    p_brand_id: brand.id,
    p_slots: requestedSlots,
    p_expires_at: expiryFromNow(),
  });

  if (publishError || !publishRows?.length) {
    // Draft already exists and is returned as-is — nothing to roll back.
    throwFromRpcError(publishError);
  }

  const { data: publishedGig, error: refetchError } = await supabaseAdmin
    .from('gigs')
    .select('*, brand:brands(*)')
    .eq('id', newGig.id)
    .single();

  if (refetchError) {
    throw new AppError(`Failed to load published collab: ${refetchError.message}`, 500, 'DATABASE_ERROR');
  }

  return publishedGig;
};

/**
 * Looks up the requesting influencer's own stored coordinates. Coordinates
 * never leave the server — this is only ever used to filter the feed
 * server-side, never returned to the client as lat/lng.
 */
const getRequesterCoords = async (user) => {
  if (!user || user.role !== 'INFLUENCER') {
    return { latitude: null, longitude: null };
  }

  const { data: influencer } = await supabaseAdmin
    .from('influencers')
    .select('latitude, longitude')
    .eq('userId', user.id)
    .maybeSingle();

  return {
    latitude: influencer?.latitude ?? null,
    longitude: influencer?.longitude ?? null,
  };
};

/**
 * Get all open gigs with filters, search, radius matching, and cursor-based
 * pagination. Delegates the actual filter/sort/radius SQL to the
 * list_gigs_in_radius RPC (Backend/supabase/migrations/schema.sql) — this
 * function's job is just resolving the cursor row (same lookup pattern as
 * before) and reshaping the RPC's flat rows back into the response shape
 * consumers already expect.
 */
const getGigs = async (filters, user) => {
  const { cursor, limit } = parsePagination(filters, 12);
  const { search, category, sort } = filters;

  const { latitude, longitude } = await getRequesterCoords(user);
  const hasCoords = latitude != null && longitude != null;
  // No explicit sort requested: default to nearest-first for a creator who
  // has coordinates, otherwise fall back to the newest-first default.
  const effectiveSort = sort || (hasCoords ? 'nearest' : null);

  let cursorBudgetMin = null;
  let cursorCreatedAt = null;
  let cursorDistanceKm = null;
  let cursorId = null;

  if (cursor) {
    if (effectiveSort === 'budget_high' || effectiveSort === 'budget_low') {
      const { data: cursorItem } = await supabaseAdmin
        .from('gigs')
        .select('budgetMin, id')
        .eq('id', cursor)
        .maybeSingle();
      if (cursorItem) {
        cursorBudgetMin = cursorItem.budgetMin;
        cursorId = cursorItem.id;
      }
    } else if (effectiveSort === 'nearest') {
      const { data: cursorItem } = await supabaseAdmin
        .from('gigs')
        .select('id, brand:brands(latitude, longitude)')
        .eq('id', cursor)
        .maybeSingle();
      if (cursorItem) {
        cursorId = cursorItem.id;
        const brandLat = cursorItem.brand?.latitude;
        const brandLng = cursorItem.brand?.longitude;
        if (hasCoords && brandLat != null && brandLng != null) {
          const { data: dist } = await supabaseAdmin.rpc('haversine_km', {
            lat1: brandLat, lng1: brandLng, lat2: latitude, lng2: longitude,
          });
          cursorDistanceKm = typeof dist === 'number' ? Math.round(dist * 2) / 2 : 999999;
        } else {
          cursorDistanceKm = 999999;
        }
      }
    } else {
      const { data: cursorItem } = await supabaseAdmin
        .from('gigs')
        .select('createdAt, id')
        .eq('id', cursor)
        .maybeSingle();
      if (cursorItem) {
        cursorCreatedAt = cursorItem.createdAt;
        cursorId = cursorItem.id;
      }
    }
  }

  // Fetch limit + 1 rows to know if there's a next page.
  const { data: rows, error } = await supabaseAdmin.rpc('list_gigs_in_radius', {
    p_category: category || null,
    p_search: search || null,
    p_sort: effectiveSort,
    p_cursor_budget_min: cursorBudgetMin,
    p_cursor_created_at: cursorCreatedAt,
    p_cursor_distance_km: cursorDistanceKm,
    p_cursor_id: cursorId,
    p_lat: latitude,
    p_lng: longitude,
    p_limit: limit + 1,
  });

  if (error) {
    console.error(`[getGigs] RPC error:`, error);
    throw new AppError(`Failed to fetch collabs: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  const formattedGigs = (rows || []).map(row => ({
    id: row.id,
    brandId: row.brandId,
    title: row.title,
    description: row.description,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    deliverables: row.deliverables,
    creatorRequirements: row.creatorRequirements,
    platform: row.platform,
    campaignType: row.campaignType,
    deadline: row.deadline,
    status: row.status,
    city: row.city,
    category: row.category,
    radiusKm: row.radiusKm,
    viewCount: row.viewCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    distanceKm: row.distance_km,
    brand: {
      id: row.brand_id,
      businessName: row.brand_business_name,
      category: row.brand_category,
      logoUrl: row.brand_logo_url,
      user: { lastActiveAt: row.brand_last_active_at },
    },
    applicationsReceived: row.applications_count,
    _count: {
      applications: row.applications_count,
    },
  }));

  const paginated = paginateResults(formattedGigs, limit);
  paginated.pagination.total = rows && rows.length > 0 ? Number(rows[0].total_count) : 0;
  paginated.meta = { locationEnabled: latitude != null && longitude != null };

  return paginated;
};

/**
 * Fetch a single Gig by ID. Increments viewCount if visited by non-owner.
 */
const getGigById = async (id, userId) => {
  const { data: gig, error } = await supabaseAdmin
    .from('gigs')
    .select('*, brand:brands(id, userId, businessName, category, location, bio, logoUrl, website, user:users(lastActiveAt:last_active_at)), applications(count)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`[getGigById] Database error:`, error);
    throw new AppError(`Failed to fetch gig details: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  if (!gig) {
    console.warn(`[getGigById] No gig record found for ID: ${id}`);
    throw new AppError('This collab does not exist or has been deleted.', 404, 'NOT_FOUND');
  }

  // Increment viewCount if user is not the creator brand
  if (gig.brand.userId !== userId) {
    await supabaseAdmin.rpc('increment_view_count', { gig_id: id });
    gig.viewCount += 1;
  }

  // Check if current user is an influencer and if they've applied
  let hasApplied = false;
  let application = null;

  const { data: influencer } = await supabaseAdmin
    .from('influencers')
    .select('id')
    .eq('userId', userId)
    .maybeSingle();

  if (influencer) {
    const { data: appData } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('gigId', id)
      .eq('influencerId', influencer.id)
      .maybeSingle();

    if (appData) {
      application = appData;
      hasApplied = true;
    }
  }

  const appCount = gig.applications && gig.applications[0] ? gig.applications[0].count : 0;
  const { applications, ...rest } = gig;

  return {
    ...rest,
    _count: {
      applications: appCount,
    },
    // Flat alias so the client can render capacity without reaching into _count.
    applicationsReceived: appCount,
    hasApplied,
    application,
  };
};

/**
 * Update an existing Gig. Deliberately cannot touch `status` — every status
 * transition (publish, close, reopen) must go through its own atomic,
 * credit/slot-checked endpoint below. A generic status pass-through here
 * used to let a DRAFT go ACTIVE for free with no plan or credit check at
 * all; removing the field is what actually closes that gap, not a guard
 * that could be missed on the next edit.
 */
const updateGig = async (id, userId, data) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig, error: findError } = await supabaseAdmin
    .from('gigs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to edit this collab.", 403, 'FORBIDDEN');
  }

  if (data.radiusKm && (brand.latitude == null || brand.longitude == null)) {
    throw new AppError('Add your PIN code to your brand profile before setting a collab radius.', 400, 'LOCATION_REQUIRED');
  }

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.budgetMin !== undefined) updateData.budgetMin = data.budgetMin;
  if (data.budgetMax !== undefined) updateData.budgetMax = data.budgetMax;
  if (data.deliverables !== undefined) updateData.deliverables = data.deliverables;
  if (data.creatorRequirements !== undefined) updateData.creatorRequirements = data.creatorRequirements;
  if (data.platform !== undefined) updateData.platform = data.platform;
  if (data.campaignType !== undefined) updateData.campaignType = data.campaignType;
  if (data.deadline !== undefined) updateData.deadline = data.deadline;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.radiusKm !== undefined) updateData.radiusKm = data.radiusKm;

  const { data: updatedGig, error: updateError } = await supabaseAdmin
    .from('gigs')
    .update(updateData)
    .eq('id', id)
    .select('*, brand:brands(*)')
    .single();

  if (updateError) {
    console.error(`[updateGig] Supabase error:`, updateError);
    throw new AppError(`Failed to update collab: ${updateError.message}`, 500, 'DATABASE_ERROR');
  }

  return updatedGig;
};

/**
 * Soft-close a Gig. Atomically releases any unused application slots back
 * to the brand's pool, and refunds 1 Campaign Credit if this happens within
 * 1 hour of publish (close_gig_and_release, schema.sql section 23f).
 */
const closeGig = async (id, userId) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig, error: findError } = await supabaseAdmin
    .from('gigs')
    .select('id, brandId')
    .eq('id', id)
    .maybeSingle();

  if (findError || !gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to close this collab.", 403, 'FORBIDDEN');
  }

  const { error: rpcError } = await supabaseAdmin.rpc('close_gig_and_release', {
    p_gig_id: id,
    p_brand_id: brand.id,
    p_new_status: 'CLOSED',
  });

  if (rpcError) {
    console.error(`[closeGig] RPC error:`, rpcError);
    throw new AppError(`Failed to close collab: ${rpcError.message}`, 500, 'DATABASE_ERROR');
  }

  const { data: updatedGig } = await supabaseAdmin.from('gigs').select('*').eq('id', id).single();
  return updatedGig;
};

/**
 * Get brand's own posted gigs.
 */
const getMyGigs = async (userId) => {
  const brand = await getBrandByUserId(userId);

  const { data: gigs, error } = await supabaseAdmin
    .from('gigs')
    .select('*, applications(count)')
    .eq('brandId', brand.id)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error(`[getMyGigs] Supabase query error:`, error);
    throw new AppError(`Failed to fetch your collabs: ${error.message}`, 500, 'DATABASE_ERROR');
  }


  return (gigs || []).map(gig => {
    const appCount = gig.applications && gig.applications[0] ? gig.applications[0].count : 0;
    const { applications, ...rest } = gig;
    return {
      ...rest,
      _count: {
        applications: appCount
      },
      applicationsReceived: appCount
    };
  });
};

/**
 * Hard delete a Gig (permanently removes it and cascades applications).
 * Releases slots / refunds the 1-hour-window credit first — deleting an
 * ACTIVE gig should behave at least as generously as closing it, since the
 * effect (no longer live, capacity gone) is the same or stronger.
 */
const deleteGig = async (id, userId) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig, error: findError } = await supabaseAdmin
    .from('gigs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to delete this collab.", 403, 'FORBIDDEN');
  }

  if (gig.status === 'ACTIVE') {
    const { error: rpcError } = await supabaseAdmin.rpc('close_gig_and_release', {
      p_gig_id: id,
      p_brand_id: brand.id,
      p_new_status: 'CLOSED',
    });
    if (rpcError) {
      console.error(`[deleteGig] release error:`, rpcError);
      throw new AppError(`Failed to delete collab: ${rpcError.message}`, 500, 'DATABASE_ERROR');
    }
  }

  // Delete applications first (cascade), then the gig
  await supabaseAdmin.from('applications').delete().eq('gigId', id);
  const { error: deleteError } = await supabaseAdmin.from('gigs').delete().eq('id', id);

  if (deleteError) {
    console.error(`[deleteGig] Database delete error:`, deleteError);
    throw new AppError(`Failed to delete collab: ${deleteError.message}`, 500, 'DATABASE_ERROR');
  }

  return { message: 'Collab permanently deleted.' };
};

/**
 * Toggle gig status: ACTIVE -> CLOSED, or CLOSED/EXPIRED -> ACTIVE (reopen).
 * Closing releases slots (+ possible 1hr refund). Reopening is a fresh
 * publish against the brand's *current* pool via publish_gig_with_credit —
 * it does not get its old slots back for free (PRD section 20).
 */
const toggleGigStatus = async (id, userId) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig, error: findError } = await supabaseAdmin
    .from('gigs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findError || !gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to update this collab.", 403, 'FORBIDDEN');
  }

  const reopening = gig.status !== 'ACTIVE';

  if (reopening) {
    const { data: publishRows, error: publishError } = await supabaseAdmin.rpc('publish_gig_with_credit', {
      p_gig_id: id,
      p_brand_id: brand.id,
      p_slots: gig.applicationSlots || 1,
      p_expires_at: expiryFromNow(),
    });
    if (publishError || !publishRows?.length) {
      throwFromRpcError(publishError);
    }
  } else {
    const { error: rpcError } = await supabaseAdmin.rpc('close_gig_and_release', {
      p_gig_id: id,
      p_brand_id: brand.id,
      p_new_status: 'CLOSED',
    });
    if (rpcError) {
      console.error(`[toggleGigStatus] close error:`, rpcError);
      throw new AppError(`Failed to toggle collab status: ${rpcError.message}`, 500, 'DATABASE_ERROR');
    }
  }

  const { data: updatedGig } = await supabaseAdmin.from('gigs').select('*').eq('id', id).single();
  return updatedGig;
};

/**
 * Publish a DRAFT gig: atomically checks + spends 1 Campaign Credit and the
 * gig's application-slot allotment, then marks it ACTIVE. Republishing an
 * already-ACTIVE gig is rejected rather than silently extending its window.
 */
const publishGig = async (id, userId) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig } = await supabaseAdmin.from('gigs').select('*').eq('id', id).maybeSingle();
  if (!gig) throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to publish this collab.", 403, 'FORBIDDEN');
  }

  const { data: publishRows, error: publishError } = await supabaseAdmin.rpc('publish_gig_with_credit', {
    p_gig_id: id,
    p_brand_id: brand.id,
    p_slots: gig.applicationSlots || 1,
    p_expires_at: expiryFromNow(),
  });

  if (publishError || !publishRows?.length) {
    throwFromRpcError(publishError);
  }

  const { data: updated, error } = await supabaseAdmin.from('gigs').select('*').eq('id', id).single();
  if (error) throw new AppError(`Failed to load published collab: ${error.message}`, 500, 'DATABASE_ERROR');
  return updated;
};

/**
 * Reallocate application slots on an already-published campaign. Atomically
 * spends/refunds the difference against the brand's slot pool
 * (reallocate_gig_slots, schema.sql section 23m) — this is a live campaign
 * resource change, not a free edit.
 */
const allocateSlots = async (id, userId, slots) => {
  const brand = await getBrandByUserId(userId);

  const { data: gig } = await supabaseAdmin.from('gigs').select('id, brandId').eq('id', id).maybeSingle();
  if (!gig) throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to update this collab.", 403, 'FORBIDDEN');
  }

  const { error: rpcError } = await supabaseAdmin.rpc('reallocate_gig_slots', {
    p_gig_id: id,
    p_brand_id: brand.id,
    p_new_slots: slots,
  });

  if (rpcError) {
    throwFromRpcError(rpcError);
  }

  const { data: updated, error } = await supabaseAdmin.from('gigs').select('*').eq('id', id).single();
  if (error) throw new AppError(`Failed to allocate slots: ${error.message}`, 500, 'DATABASE_ERROR');
  return updated;
};

/**
 * Flip every lapsed ACTIVE gig to EXPIRED, releasing each one's unused slots
 * to its own brand's pool (expire_lapsed_gigs, schema.sql section 23g) — a
 * per-row operation now that expiry also has to move resources, not the old
 * single blind bulk UPDATE.
 */
const expireLapsedGigs = async () => {
  const { data, error } = await supabaseAdmin.rpc('expire_lapsed_gigs');

  if (error) {
    console.error('[expireLapsedGigs] Failed:', error.message);
    throw new AppError('Failed to expire gigs.', 500, 'DATABASE_ERROR');
  }

  const ids = (data || []).map((row) => row.expired_gig_id);
  return { expired: ids.length, ids };
};

module.exports = {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  closeGig,
  getMyGigs,
  deleteGig,
  toggleGigStatus,
  publishGig,
  allocateSlots,
  expireLapsedGigs,
  isGigOpenForApplications,
  expiryFromNow,
};
