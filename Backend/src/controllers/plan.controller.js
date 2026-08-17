const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const planService = require('../services/plan.service');
const { supabase } = require('../services/supabase');

/** Resolve the brand row for the authenticated user. */
const getBrandId = async (userId) => {
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('userId', userId)
    .maybeSingle();

  if (!brand) {
    throw new AppError('Complete your brand onboarding first.', 400, 'ONBOARDING_REQUIRED');
  }
  return brand.id;
};

/** Public plan catalogue — the frontend renders pricing from this, never constants. */
const list = asyncHandler(async (req, res) => {
  const plans = await planService.listPlans();
  res.status(200).json({ success: true, data: plans });
});

/** Current brand's Campaign Credits / Application Slots / billing cycle. */
const usage = asyncHandler(async (req, res) => {
  const brandId = await getBrandId(req.user.id);
  const data = await planService.getBrandUsageSummary(brandId);
  res.status(200).json({ success: true, data });
});

module.exports = { list, usage };
