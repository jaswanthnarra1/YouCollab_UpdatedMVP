const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');

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
const apply = async (userId, gigId, coverNote) => {
  const influencer = await getInfluencerByUserId(userId);

  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('*, brand:brands(id, userId, businessName)')
    .eq('id', gigId)
    .maybeSingle();

  if (gigError || !gig) {
    throw new AppError('This collab does not exist or has been deleted.', 404, 'NOT_FOUND');
  }

  if (gig.status !== 'OPEN') {
    throw new AppError('This collab is closed for applications.', 400, 'BAD_REQUEST');
  }

  // Check for duplicate application
  const { data: existingApplication } = await supabase
    .from('applications')
    .select('id')
    .eq('gigId', gigId)
    .eq('influencerId', influencer.id)
    .maybeSingle();

  if (existingApplication) {
    throw new AppError("You've already applied to this collab! Sit tight.", 409, 'CONFLICT');
  }

  // Create application
  const { data: appRecord, error: appError } = await supabase
    .from('applications')
    .insert({
      gigId,
      influencerId: influencer.id,
      coverNote,
      status: 'PENDING',
    })
    .select('*')
    .single();

  if (appError) {
    throw new AppError('Failed to apply for this collab.', 500, 'DATABASE_ERROR');
  }

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
    .select('id')
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
    .select('*, influencer:influencers(id, name, instagramHandle, niche, bio, profileImageUrl, followerCount, user:users(lastActiveAt))', { count: 'exact' })
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
    .select('*, gig:gigs(id, title, budgetMin, budgetMax, deadline, category, status, brand:brands(businessName, logoUrl))', { count: 'exact' })
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

  // Update status
  const { data: updatedApplication, error: updateError } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select('*')
    .single();

  if (updateError) {
    throw new AppError('Failed to update application status.', 500, 'DATABASE_ERROR');
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

module.exports = {
  apply,
  getGigApplications,
  getMyApplications,
  updateStatus,
};
