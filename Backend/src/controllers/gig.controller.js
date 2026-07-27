const gigService = require('../services/gig.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new collab/gig.
 */
const create = asyncHandler(async (req, res) => {
  const gig = await gigService.createGig(req.user.id, req.body);
  
  res.status(201).json({
    success: true,
    data: gig,
    message: 'Your collab is live! 🎉 Ready to receive applications.',
  });
});

/**
 * Get all open collabs with search, filters, and cursor pagination.
 */
const list = asyncHandler(async (req, res) => {
  const result = await gigService.getGigs(req.query, req.user);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    meta: result.meta,
  });
});

/**
 * Fetch a single collab's details.
 */
const detail = asyncHandler(async (req, res) => {
  const gig = await gigService.getGigById(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: gig,
  });
});

/**
 * Update an existing collab.
 */
const update = asyncHandler(async (req, res) => {
  const gig = await gigService.updateGig(req.params.id, req.user.id, req.body);

  res.status(200).json({
    success: true,
    data: gig,
    message: 'Collab details updated successfully! ✨',
  });
});

/**
 * Soft-close a collab.
 */
const close = asyncHandler(async (req, res) => {
  await gigService.closeGig(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: {
      message: 'Collab status updated to CLOSED. Applications are disabled.',
    },
  });
});

/**
 * Get brand's own posted collabs.
 */
const mine = asyncHandler(async (req, res) => {
  const gigs = await gigService.getMyGigs(req.user.id);

  res.status(200).json({
    success: true,
    data: gigs,
  });
});

/**
 * Hard delete a collab.
 */
const destroy = asyncHandler(async (req, res) => {
  const result = await gigService.deleteGig(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Toggle collab status (ACTIVE ↔ CLOSED).
 */
const toggleStatus = asyncHandler(async (req, res) => {
  const gig = await gigService.toggleGigStatus(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: gig,
    message: gig.status === 'ACTIVE' ? 'Collab is now live! 🎉' : 'Collab paused.',
  });
});

/**
 * Publish a DRAFT collab — sets ACTIVE, publishedAt and expiresAt.
 */
const publish = asyncHandler(async (req, res) => {
  const gig = await gigService.publishGig(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: gig,
    message: 'Collab published! 🎉',
  });
});

/**
 * Allocate application slots to a collab.
 */
const allocateSlots = asyncHandler(async (req, res) => {
  const gig = await gigService.allocateSlots(req.params.id, req.user.id, req.body.applicationSlots);

  res.status(200).json({
    success: true,
    data: gig,
    message: `Allocated ${gig.applicationSlots} application slot${gig.applicationSlots === 1 ? '' : 's'}.`,
  });
});

module.exports = {
  create,
  list,
  detail,
  update,
  close,
  mine,
  destroy,
  toggleStatus,
  publish,
  allocateSlots,
};
