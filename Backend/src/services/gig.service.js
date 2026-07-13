const { supabase, supabaseAdmin } = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');
const { GIG_POST_COST } = require('../utils/credits');

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
 * Create a new Gig.
 */
const createGig = async (userId, data) => {

  const brand = await getBrandByUserId(userId);

  // A radius gig needs the brand's own coordinates to measure distance from
  // — guard here rather than let it silently degrade to "Anywhere" later.
  if (data.radiusKm && (brand.latitude == null || brand.longitude == null)) {
    throw new AppError('Add your PIN code to your brand profile before setting a collab radius.', 400, 'LOCATION_REQUIRED');
  }

  // Posting a collab spends trial credits — atomic DB-side decrement so two
  // concurrent posts from the same brand can't both slip past a stale JS
  // balance check (same pattern as the hire-credit debit).
  const { data: debitRows, error: debitError } = await supabaseAdmin.rpc('debit_brand_credits', {
    p_brand_id: brand.id,
    p_amount: GIG_POST_COST,
  });

  if (debitError || !debitRows?.length) {
    throw new AppError(`Not enough trial credits to post a collab — this costs ${GIG_POST_COST} credits.`, 402, 'INSUFFICIENT_CREDITS');
  }

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
    status: data.status || 'OPEN',
    radiusKm: data.radiusKm ?? null,
  };
  console.log(`[Create Gig Debug] Submitting payload to Supabase:`, JSON.stringify(payload));

  const { data: newGig, error } = await supabaseAdmin
    .from('gigs')
    .insert(payload)
    .select('*, brand:brands(*)')
    .single();

  if (error) {
    console.error(`[Create Gig Debug] Supabase error:`, error);
    // Refund — the credits were spent but no gig actually got created.
    await supabaseAdmin.rpc('credit_brand_credits', { p_brand_id: brand.id, p_amount: GIG_POST_COST });
    throw new AppError(`Failed to create gig: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  return newGig;
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
  console.log(`[getGigs] Start. Filters:`, JSON.stringify(filters));
  const { cursor, limit } = parsePagination(filters, 12);
  const { search, category, sort } = filters;

  let cursorBudgetMin = null;
  let cursorCreatedAt = null;
  let cursorId = null;

  if (cursor) {
    if (sort === 'budget_high' || sort === 'budget_low') {
      const { data: cursorItem } = await supabaseAdmin
        .from('gigs')
        .select('budgetMin, id')
        .eq('id', cursor)
        .maybeSingle();
      if (cursorItem) {
        cursorBudgetMin = cursorItem.budgetMin;
        cursorId = cursorItem.id;
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

  const { latitude, longitude } = await getRequesterCoords(user);

  // Fetch limit + 1 rows to know if there's a next page.
  const { data: rows, error } = await supabaseAdmin.rpc('list_gigs_in_radius', {
    p_category: category || null,
    p_search: search || null,
    p_sort: sort || null,
    p_cursor_budget_min: cursorBudgetMin,
    p_cursor_created_at: cursorCreatedAt,
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
    hasApplied,
    application,
  };
};

/**
 * Update an existing Gig.
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
  if (data.status !== undefined) updateData.status = data.status;
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
 * Soft-close a Gig (sets status to CLOSED).
 */
const closeGig = async (id, userId) => {
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
    throw new AppError("You don't have permission to close this collab.", 403, 'FORBIDDEN');
  }

  const { data: updatedGig, error: updateError } = await supabaseAdmin
    .from('gigs')
    .update({ status: 'CLOSED' })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    console.error(`[closeGig] Supabase error:`, updateError);
    throw new AppError(`Failed to close collab: ${updateError.message}`, 500, 'DATABASE_ERROR');
  }

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
      }
    };
  });
};

/**
 * Hard delete a Gig (permanently removes it and cascades applications).
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
 * Toggle gig status between OPEN and CLOSED.
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

  const newStatus = gig.status === 'OPEN' ? 'CLOSED' : 'OPEN';

  const { data: updatedGig, error: updateError } = await supabaseAdmin
    .from('gigs')
    .update({ status: newStatus })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    console.error(`[toggleGigStatus] Update error:`, updateError);
    throw new AppError(`Failed to toggle collab status: ${updateError.message}`, 500, 'DATABASE_ERROR');
  }

  return updatedGig;
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
};
