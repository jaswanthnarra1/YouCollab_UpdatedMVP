const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const { parsePagination, paginateResults } = require('../utils/pagination');
const { REFERRAL_STATUS, REFERRAL_REWARD_AMOUNT, resolveEligibility } = require('../utils/referrals');
const { getInfluencerByUserId } = require('./application.service');

/**
 * Creator submits a promotional Reel for the Referral Program.
 */
const submit = async (userId, { reelUrl, instagramUsername }) => {
  const influencer = await getInfluencerByUserId(userId);

  // Friendly pre-check; the DB's UNIQUE("influencerId","reelUrl") is what
  // actually holds under concurrency — same dual-layer pattern as
  // application.service.js's duplicate-application handling.
  const { data: existing } = await supabase
    .from('referral_submissions')
    .select('id')
    .eq('influencerId', influencer.id)
    .eq('reelUrl', reelUrl)
    .maybeSingle();

  if (existing) {
    throw new AppError('You have already submitted this Reel.', 409, 'CONFLICT');
  }

  const { data: submission, error } = await supabase
    .from('referral_submissions')
    .insert({
      influencerId: influencer.id,
      reelUrl,
      instagramUsername: instagramUsername || null,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('You have already submitted this Reel.', 409, 'CONFLICT');
    }
    throw new AppError('Failed to submit your Reel.', 500, 'DATABASE_ERROR');
  }

  return submission;
};

/**
 * Creator's own referral submissions.
 */
const listMine = async (userId) => {
  const influencer = await getInfluencerByUserId(userId);

  const { data: submissions, error } = await supabase
    .from('referral_submissions')
    .select('*')
    .eq('influencerId', influencer.id)
    .order('createdAt', { ascending: false });

  if (error) {
    throw new AppError('Failed to fetch your submissions.', 500, 'DATABASE_ERROR');
  }

  return submissions || [];
};

/**
 * Admin: paginated list of all referral submissions.
 */
const adminList = async (filters) => {
  const { cursor, limit } = parsePagination(filters, 20);

  let query = supabase
    .from('referral_submissions')
    .select('*, influencer:influencers(id, name, instagramHandle)', { count: 'exact' });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (cursor) {
    const { data: cursorItem } = await supabase
      .from('referral_submissions')
      .select('createdAt, id')
      .eq('id', cursor)
      .maybeSingle();
    if (cursorItem) {
      query = query.or(`createdAt.lt.${cursorItem.createdAt},and(createdAt.eq.${cursorItem.createdAt},id.lt.${cursorItem.id})`);
    }
  }

  query = query.order('createdAt', { ascending: false }).order('id', { ascending: false });

  const { data: submissions, error, count: total } = await query.limit(limit + 1);

  if (error) {
    throw new AppError('Failed to fetch referral submissions.', 500, 'DATABASE_ERROR');
  }

  const paginated = paginateResults(submissions || [], limit);
  paginated.pagination.total = total || 0;
  return paginated;
};

/**
 * Admin: flag a submission as being actively looked at.
 */
const adminMarkUnderReview = async (id, adminClerkId) => {
  const { data: updated, error } = await supabase
    .from('referral_submissions')
    .update({ status: REFERRAL_STATUS.UNDER_REVIEW, reviewedBy: adminClerkId, reviewedAt: new Date().toISOString() })
    .eq('id', id)
    .eq('status', REFERRAL_STATUS.SUBMITTED)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to update submission.', 500, 'DATABASE_ERROR');
  }

  if (!updated) {
    throw new AppError('This submission has already been reviewed.', 400, 'BAD_REQUEST');
  }

  return updated;
};

/**
 * Admin: record verified views. Eligibility is computed server-side only —
 * the client can never set status directly.
 */
const adminSetVerifiedViews = async (id, verifiedViews, adminClerkId) => {
  const { data: submission, error: findError } = await supabase
    .from('referral_submissions')
    .select('id, status, influencer:influencers(userId)')
    .eq('id', id)
    .maybeSingle();

  if (findError || !submission) {
    throw new AppError('Submission not found.', 404, 'NOT_FOUND');
  }

  if (submission.status === REFERRAL_STATUS.WINNER) {
    throw new AppError('A winner has already been selected — verified views can no longer be changed.', 400, 'BAD_REQUEST');
  }

  const status = resolveEligibility(verifiedViews);

  const { data: updated, error } = await supabase
    .from('referral_submissions')
    .update({ verifiedViews, status, reviewedBy: adminClerkId, reviewedAt: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new AppError('Failed to record verified views.', 500, 'DATABASE_ERROR');
  }

  try {
    const isEligible = status === REFERRAL_STATUS.ELIGIBLE;
    await supabase.from('notifications').insert({
      userId: submission.influencer.userId,
      type: 'REFERRAL_STATUS_UPDATED',
      title: isEligible ? "You're eligible for the ₹1,000 draw! 🎉" : 'Referral Reel reviewed',
      message: isEligible
        ? 'Your Reel has been verified and you\'re eligible for the ₹1,000 draw.'
        : 'Your Reel did not meet the 50,000 verified view requirement.',
      metadata: JSON.stringify({ submissionId: id, status, verifiedViews }),
    });
  } catch (notifErr) {
    console.error('Failed to notify creator about referral status change:', notifErr);
  }

  return updated;
};

/**
 * Admin: select the single campaign winner. Only from ELIGIBLE, reward
 * amount is always the fixed constant — never client-supplied.
 */
const adminMarkWinner = async (id, adminClerkId) => {
  const { data: updated, error } = await supabase
    .from('referral_submissions')
    .update({
      status: REFERRAL_STATUS.WINNER,
      isWinner: true,
      rewardAmount: REFERRAL_REWARD_AMOUNT,
      reviewedBy: adminClerkId,
      reviewedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', REFERRAL_STATUS.ELIGIBLE)
    .select('*, influencer:influencers(userId)')
    .maybeSingle();

  if (error) {
    // The partial unique index (referral_one_winner_idx) is the real guard.
    if (error.code === '23505') {
      throw new AppError('A winner has already been selected for this campaign.', 409, 'CONFLICT');
    }
    throw new AppError('Failed to select winner.', 500, 'DATABASE_ERROR');
  }

  if (!updated) {
    throw new AppError('Only an Eligible submission can be marked Winner.', 400, 'BAD_REQUEST');
  }

  try {
    await supabase.from('notifications').insert({
      userId: updated.influencer.userId,
      type: 'REFERRAL_WINNER_SELECTED',
      title: "You won! 🏆",
      message: `Congratulations! You've been selected as the winner of the ₹${REFERRAL_REWARD_AMOUNT} Referral Program draw.`,
      metadata: JSON.stringify({ submissionId: id, rewardAmount: REFERRAL_REWARD_AMOUNT }),
    });
  } catch (notifErr) {
    console.error('Failed to notify winner:', notifErr);
  }

  return updated;
};

module.exports = {
  submit,
  listMine,
  adminList,
  adminMarkUnderReview,
  adminSetVerifiedViews,
  adminMarkWinner,
};
