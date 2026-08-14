const referralService = require('../services/referral.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Creator submits a promotional Reel.
 */
const submit = asyncHandler(async (req, res) => {
  const { reelUrl, instagramUsername } = req.body;
  const submission = await referralService.submit(req.user.id, { reelUrl, instagramUsername });

  res.status(201).json({
    success: true,
    data: submission,
    message: 'Your Reel has been submitted successfully.',
  });
});

/**
 * Creator views their own referral submissions.
 */
const listMine = asyncHandler(async (req, res) => {
  const submissions = await referralService.listMine(req.user.id);

  res.status(200).json({
    success: true,
    data: submissions,
  });
});

/**
 * Admin: list all referral submissions.
 */
const adminList = asyncHandler(async (req, res) => {
  const result = await referralService.adminList(req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * Admin: mark a submission as under review.
 */
const adminMarkUnderReview = asyncHandler(async (req, res) => {
  const submission = await referralService.adminMarkUnderReview(req.params.id, req.user.clerkId);

  res.status(200).json({
    success: true,
    data: submission,
  });
});

/**
 * Admin: record verified views — eligibility is computed server-side.
 */
const adminSetVerifiedViews = asyncHandler(async (req, res) => {
  const submission = await referralService.adminSetVerifiedViews(req.params.id, req.body.verifiedViews, req.user.clerkId);

  res.status(200).json({
    success: true,
    data: submission,
  });
});

/**
 * Admin: select the campaign winner.
 */
const adminMarkWinner = asyncHandler(async (req, res) => {
  const submission = await referralService.adminMarkWinner(req.params.id, req.user.clerkId);

  res.status(200).json({
    success: true,
    data: submission,
  });
});

module.exports = {
  submit,
  listMine,
  adminList,
  adminMarkUnderReview,
  adminSetVerifiedViews,
  adminMarkWinner,
};
