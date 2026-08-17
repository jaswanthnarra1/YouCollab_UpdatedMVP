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

/** Queue of Brand-submitted plan-change requests. */
const listPlanRequests = asyncHandler(async (req, res) => {
  const data = await planService.adminListPlanChangeRequests(req.query);
  res.status(200).json({ success: true, data });
});

/** Approve a pending request — applies the plan change via the existing admin path. */
const approvePlanRequest = asyncHandler(async (req, res) => {
  const data = await planService.adminApprovePlanChangeRequest(req.params.id, req.user.clerkId);
  res.status(200).json({ success: true, data, message: 'Request approved — plan updated.' });
});

/** Reject a pending request — no plan change is made. */
const rejectPlanRequest = asyncHandler(async (req, res) => {
  const data = await planService.adminRejectPlanChangeRequest(req.params.id, req.user.clerkId);
  res.status(200).json({ success: true, data, message: 'Request rejected.' });
});

module.exports = { listBrands, updateBrandPlan, listPlanRequests, approvePlanRequest, rejectPlanRequest };
