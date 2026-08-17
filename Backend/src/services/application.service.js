const supabase = require('./supabase');
const { supabaseAdmin } = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');
const { haversineKm } = require('./geo.service');

/**
 * Helper to retrieve influencer associated with userId.
 */
const getInfluencerByUserId = async (userId) => {
  const { data: influencer, error } = await supabase
    .from('influencers')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error || !influencer) {
    throw new AppError('Complete your creator onboarding to apply for collabs.', 400, 'ONBOARDING_REQUIRED');
  }
  return influencer;
};

/**
 * Apply to a Gig.
 */
const apply = async (userId, gigId, coverNote, reelUrl) => {
  const influencer = await getInfluencerByUserId(userId);

  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('*, brand:brands(id, userId, businessName, latitude, longitude)')
    .eq('id', gigId)
    .maybeSingle();

  if (gigError || !gig) {
    throw new AppError('This collab does not exist or has been deleted.', 404, 'NOT_FOUND');
  }

  // Expiry is evaluated here as well as by the scheduler, so a gig that lapsed
  // since the last sweep still rejects applications.
  if (gig.status === 'EXPIRED' || (gig.status === 'ACTIVE' && gig.expiresAt && new Date(gig.expiresAt) <= new Date())) {
    throw new AppError('Applications for this collab have closed.', 400, 'GIG_EXPIRED');
  }

  if (gig.status !== 'ACTIVE') {
    throw new AppError('This collab is closed for applications.', 400, 'BAD_REQUEST');
  }

  // Radius eligibility. Discovery already hides out-of-radius gigs, but hiding
  // is not authorization — without this check a creator holding a shared gig
  // link or hitting the API directly could still apply from anywhere.
  if (gig.radiusKm) {
    const { latitude: bLat, longitude: bLng } = gig.brand || {};
    if (bLat == null || bLng == null) {
      throw new AppError('This collab has no location set, so applications are paused.', 400, 'GIG_LOCATION_MISSING');
    }
    if (influencer.latitude == null || influencer.longitude == null) {
      throw new AppError('Add your PIN code to your profile to apply to location-based collabs.', 400, 'LOCATION_REQUIRED');
    }
    const distanceKm = haversineKm(bLat, bLng, influencer.latitude, influencer.longitude);
    if (distanceKm > gig.radiusKm) {
      throw new AppError(
        `This collaboration is currently available only to Creators within ${gig.radiusKm} km of the Brand's location.`,
        403,
        'OUTSIDE_RADIUS',
      );
    }
  }

  // Check for duplicate application. The DB also has UNIQUE(gigId,
  // influencerId), which is what actually holds under concurrency — this check
  // exists to return a friendly 409 instead of a raw constraint error.
  const { data: existingApplication } = await supabase
    .from('applications')
    .select('id')
    .eq('gigId', gigId)
    .eq('influencerId', influencer.id)
    .maybeSingle();

  if (existingApplication) {
    throw new AppError("You've already applied to this collab! Sit tight.", 409, 'CONFLICT');
  }

  // Fail-fast capacity pre-check against the gig's own persisted counters
  // (Applications closed once applicationSlotsUsed reaches its allotment) —
  // the atomic RPC below is what actually enforces this under concurrency;
  // this is just a friendlier error before attempting the write.
  const slots = gig.applicationSlots ?? 1;
  if ((gig.applicationSlotsUsed ?? 0) >= slots) {
    throw new AppError('Applications closed — this collaboration has reached its application limit.', 409, 'CAPACITY_REACHED');
  }

  // Create the application through the capacity-checked RPC: it locks the gig
  // row, re-counts, and only then inserts, so two concurrent applicants can't
  // both slip past the JS check above and overfill the campaign.
  const { data: inserted, error: appError } = await supabaseAdmin.rpc('insert_application_with_capacity', {
    p_gig_id: gigId,
    p_influencer_id: influencer.id,
    p_cover_note: coverNote,
    p_reel_url: reelUrl,
  });

  if (appError) {
    // The DB-level UNIQUE(gigId, influencerId) is the real duplicate guard;
    // surface it as the same friendly 409 the pre-check returns.
    if (appError.code === '23505') {
      throw new AppError("You've already applied to this collab! Sit tight.", 409, 'CONFLICT');
    }
    throw new AppError('Failed to apply for this collab.', 500, 'DATABASE_ERROR');
  }

  if (!inserted?.length) {
    throw new AppError('Applications closed — this collaboration has reached its application limit.', 409, 'CAPACITY_REACHED');
  }

  const appRecord = inserted[0];

  // Notify brand owner
  try {
    await supabase.from('notifications').insert({
      userId: gig.brand.userId,
      type: 'APPLICATION_RECEIVED',
      title: 'New application! 🎉',
      message: `${influencer.name} applied to your collab "${gig.title}"`,
      metadata: JSON.stringify({
        gigId,
        applicationId: appRecord.id,
        influencerId: influencer.id,
      }),
    });
  } catch (notifErr) {
    console.error('Failed to create notification for brand owner:', notifErr);
  }

  return appRecord;
};

/**
 * Get all applications for a specific Gig (Brand Owner only).
 */
const getGigApplications = async (gigId, userId, filters) => {
  const { data: brand } = await supabase
    .from('brands')
    .select('id, latitude, longitude')
    .eq('userId', userId)
    .maybeSingle();

  if (!brand) {
    throw new AppError('Brand onboarding is required.', 400, 'ONBOARDING_REQUIRED');
  }

  const { data: gig } = await supabase
    .from('gigs')
    .select('brandId')
    .eq('id', gigId)
    .maybeSingle();

  if (!gig) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  if (gig.brandId !== brand.id) {
    throw new AppError("You don't have access to view applicants for this collab.", 403, 'FORBIDDEN');
  }

  const { cursor, limit } = parsePagination(filters, 10);

  let query = supabase
    .from('applications')
    .select('*, influencer:influencers(id, name, instagramHandle, niche, bio, profileImageUrl, followerCount, latitude, longitude, user:users(lastActiveAt:last_active_at, email))', { count: 'exact' })
    .eq('gigId', gigId);

  if (cursor) {
    const { data: cursorItem } = await supabase
      .from('applications')
      .select('createdAt, id')
      .eq('id', cursor)
      .maybeSingle();
    if (cursorItem) {
      query = query.or(`createdAt.lt.${cursorItem.createdAt},and(createdAt.eq.${cursorItem.createdAt},id.lt.${cursorItem.id})`);
    }
  }

  query = query.order('createdAt', { ascending: false }).order('id', { ascending: false });

  const { data: applications, error, count: total } = await query.limit(limit + 1);

  if (error) {
    throw new AppError('Failed to fetch applications.', 500, 'DATABASE_ERROR');
  }

  const paginated = paginateResults(applications || [], limit);
  paginated.pagination.total = total || 0;

  // Coordinates never leave the server — attach the rounded distance to the
  // brand and strip lat/lng off the nested influencer before returning.
  const hasBrandCoords = brand.latitude != null && brand.longitude != null;
  paginated.data = paginated.data.map((app) => {
    const { latitude, longitude, ...influencer } = app.influencer || {};
    const distanceKm =
      hasBrandCoords && latitude != null && longitude != null
        ? haversineKm(brand.latitude, brand.longitude, latitude, longitude)
        : null;
    return { ...app, influencer, distanceKm };
  });

  return paginated;
};

/**
 * Get current creator's application history.
 */
const getMyApplications = async (userId, filters) => {
  const influencer = await getInfluencerByUserId(userId);
  const { cursor, limit } = parsePagination(filters, 10);

  let query = supabase
    .from('applications')
    .select('*, gig:gigs(id, title, budgetMin, budgetMax, deadline, category, status, expiresAt, city, brand:brands(businessName, logoUrl, user:users(email)))', { count: 'exact' })
    .eq('influencerId', influencer.id);

  if (cursor) {
    const { data: cursorItem } = await supabase
      .from('applications')
      .select('createdAt, id')
      .eq('id', cursor)
      .maybeSingle();
    if (cursorItem) {
      query = query.or(`createdAt.lt.${cursorItem.createdAt},and(createdAt.eq.${cursorItem.createdAt},id.lt.${cursorItem.id})`);
    }
  }

  query = query.order('createdAt', { ascending: false }).order('id', { ascending: false });

  const { data: applications, error, count: total } = await query.limit(limit + 1);

  if (error) {
    throw new AppError('Failed to fetch your applications.', 500, 'DATABASE_ERROR');
  }

  const paginated = paginateResults(applications || [], limit);
  paginated.pagination.total = total || 0;

  return paginated;
};

/**
 * Update Application Status (Accept / Reject) - Brand Owner only.
 */
const updateStatus = async (applicationId, userId, status) => {
  const { data: brand } = await supabase
    .from('brands')
    .select('id, businessName')
    .eq('userId', userId)
    .maybeSingle();

  if (!brand) {
    throw new AppError('Brand onboarding is required.', 400, 'ONBOARDING_REQUIRED');
  }

  const { data: application, error: findError } = await supabase
    .from('applications')
    .select('*, gig:gigs(*, brand:brands(*)), influencer:influencers(*, user:users(*))')
    .eq('id', applicationId)
    .maybeSingle();

  if (findError || !application) {
    throw new AppError('Application not found.', 404, 'NOT_FOUND');
  }

  if (application.gig.brandId !== brand.id) {
    throw new AppError("You don't have permission to update this application.", 403, 'FORBIDDEN');
  }

  if (application.status !== 'PENDING') {
    throw new AppError('This application has already been processed.', 400, 'BAD_REQUEST');
  }

  // V1 business model: hiring is free. The Campaign Credit was already spent
  // when the Gig was published — accepting or rejecting a pitch never moves
  // credits, for either the brand or the creator (there is no Creator
  // credit balance at all — see docs/credit-migration.md).
  //
  // Conditioned on status still being PENDING at write time — the atomic guard
  // that closes the gap between the read above and this write, so two
  // concurrent accepts on the same application can't both go through.
  const { data: updatedApplication, error: updateError } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .eq('status', 'PENDING')
    .select('*')
    .maybeSingle();

  if (updateError || !updatedApplication) {
    throw new AppError('This application has already been processed.', 400, 'BAD_REQUEST');
  }

  // Notify the Influencer
  try {
    const isAccepted = status === 'ACCEPTED';
    const notifType = isAccepted ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED';
    const notifTitle = isAccepted ? "You're in! 🎊" : 'Update on your application';
    const notifMessage = isAccepted
      ? `Congratulations! ${brand.businessName} accepted your application for "${application.gig.title}"`
      : `Bummer! ${brand.businessName} reviewed your application for "${application.gig.title}"`;

    await supabase.from('notifications').insert({
      userId: application.influencer.user.id,
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      metadata: JSON.stringify({
        gigId: application.gigId,
        applicationId,
        brandId: brand.id,
      }),
    });
  } catch (notifErr) {
    console.error('Failed to notify influencer about application status change:', notifErr);
  }

  return updatedApplication;
};

/**
 * Load an application along with both parties' user IDs, and confirm the
 * requesting user is one of them (the brand owner or the applying influencer).
 */
const getApplicationForMessaging = async (applicationId, userId) => {
  const { data: application, error } = await supabase
    .from('applications')
    .select('id, status, gig:gigs(brand:brands(userId)), influencer:influencers(userId)')
    .eq('id', applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new AppError('Collab not found.', 404, 'NOT_FOUND');
  }

  const brandUserId = application.gig?.brand?.userId;
  const influencerUserId = application.influencer?.userId;

  if (userId !== brandUserId && userId !== influencerUserId) {
    throw new AppError("You don't have access to this conversation.", 403, 'FORBIDDEN');
  }

  if (application.status !== 'ACCEPTED') {
    throw new AppError('Messaging opens once the collab is approved.', 400, 'BAD_REQUEST');
  }

  const otherUserId = userId === brandUserId ? influencerUserId : brandUserId;
  return { otherUserId };
};

/**
 * Fetch the message thread for an approved collaboration.
 * ponytail: fixed 200-message cap, no pagination — fine for a single-thread
 * DM view; revisit with cursor pagination if threads grow long in practice.
 */
const getMessages = async (applicationId, userId) => {
  await getApplicationForMessaging(applicationId, userId);

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('applicationId', applicationId)
    .order('createdAt', { ascending: true })
    .limit(200);

  if (error) {
    throw new AppError('Failed to load messages.', 500, 'DATABASE_ERROR');
  }

  return messages || [];
};

/**
 * Send a message within an approved collaboration's thread.
 */
const sendMessage = async (applicationId, userId, content) => {
  const { otherUserId } = await getApplicationForMessaging(applicationId, userId);

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      senderId: userId,
      receiverId: otherUserId,
      applicationId,
      content,
    })
    .select('*')
    .single();

  if (error) {
    throw new AppError('Failed to send message.', 500, 'DATABASE_ERROR');
  }

  return message;
};

/**
 * Influencer withdraws their own pending pitch. Only PENDING pitches
 * qualify (nothing's been spent or messaged yet). Uses the atomic
 * withdraw_application_and_release_slot RPC (schema.sql section 23i) so the
 * gig's applicationSlotsUsed counter and the deleted row can never drift
 * apart — without it a withdrawal would permanently strand a slot as "used".
 */
const withdrawApplication = async (applicationId, userId) => {
  const influencer = await getInfluencerByUserId(userId);

  const { data: application, error: findError } = await supabase
    .from('applications')
    .select('id, influencerId, status')
    .eq('id', applicationId)
    .maybeSingle();

  if (findError || !application) {
    throw new AppError('Pitch not found.', 404, 'NOT_FOUND');
  }

  if (application.influencerId !== influencer.id) {
    throw new AppError("You don't have permission to withdraw this pitch.", 403, 'FORBIDDEN');
  }

  if (application.status !== 'PENDING') {
    throw new AppError('Only pending pitches can be withdrawn.', 400, 'BAD_REQUEST');
  }

  const { data: withdrawn, error: rpcError } = await supabaseAdmin.rpc('withdraw_application_and_release_slot', {
    p_application_id: applicationId,
    p_influencer_id: influencer.id,
  });

  if (rpcError || !withdrawn?.length) {
    throw new AppError('Failed to withdraw pitch.', 500, 'DATABASE_ERROR');
  }
};

module.exports = {
  apply,
  getGigApplications,
  getMyApplications,
  updateStatus,
  getMessages,
  sendMessage,
  withdrawApplication,
  getInfluencerByUserId,
};
