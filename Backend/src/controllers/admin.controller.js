const asyncHandler = require('../utils/asyncHandler');
const planService = require('../services/plan.service');

/** Brand roster for the plan-management panel. */
const listBrands = asyncHandler(async (req, res) => {
  const brands = await planService.adminListBrands();
  res.status(200).json({ success: true, data: brands });
});

/**
 * Directly set a brand's plan / Campaign Credits / Application Slots /
 * billing-cycle dates. The only path that can do this — see
 * middleware/auth.js requireAdmin and admin.routes.js.
 */
const updateBrandPlan = asyncHandler(async (req, res) => {
  const data = await planService.adminUpdateBrandPlan(req.params.brandId, req.body);
  res.status(200).json({ success: true, data, message: 'Brand plan updated.' });
});

module.exports = { listBrands, updateBrandPlan };
