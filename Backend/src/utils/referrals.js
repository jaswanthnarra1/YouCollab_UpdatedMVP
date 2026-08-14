const REFERRAL_VIEW_THRESHOLD = 50000;

const REFERRAL_REWARD_AMOUNT = 1000;

const REFERRAL_STATUS = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ELIGIBLE: 'ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  WINNER: 'WINNER',
};

/**
 * The only place eligibility is decided — never trust a client-supplied
 * status. Called after an Admin manually records verifiedViews.
 */
const resolveEligibility = (verifiedViews = 0) =>
  verifiedViews >= REFERRAL_VIEW_THRESHOLD ? REFERRAL_STATUS.ELIGIBLE : REFERRAL_STATUS.NOT_ELIGIBLE;

module.exports = { REFERRAL_VIEW_THRESHOLD, REFERRAL_REWARD_AMOUNT, REFERRAL_STATUS, resolveEligibility };
