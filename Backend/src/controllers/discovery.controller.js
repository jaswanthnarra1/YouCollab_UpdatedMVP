const discoveryService = require('../services/discovery.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Nearest counterpart profiles (creators for a brand, brands for a creator).
 */
const nearby = asyncHandler(async (req, res) => {
  const { type, items, locationEnabled } = await discoveryService.getNearby(req.user);

  res.status(200).json({
    success: true,
    data: items,
    meta: { type, locationEnabled },
  });
});

module.exports = {
  nearby,
};
