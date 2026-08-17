const { supabase, supabaseAdmin } = require('./supabase');
const AppError = require('../utils/AppError');

/**
 * Plans are rows, not constants — Campaign Credit / Application Slot grants
 * are read from the DB on every check so pricing can change without a
 * deploy, and so the frontend never has to know the numbers.
 */

const listPlans = async () => {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, price, campaignLimit, applicationSlotLimit')
    .order('price', { ascending: true });

  if (error) throw new AppError('Failed to load plans.', 500, 'DATABASE_ERROR');
  return data || [];
};

const getPlanByName = async (name) => {
  const { data } = await supabase.from('plans').select('*').eq('name', name).maybeSingle();
  if (!data) throw new AppError(`Plan "${name}" does not exist.`, 404, 'NOT_FOUND');
  return data;
};

/**
 * Brand's plan, live Campaign Credit / Application Slot balances, billing
 * cycle, and a per-campaign slot breakdown for the dashboard (PRD section
 * 38: "Campaign A 6/10, Campaign B 3/5, Available pool 3"). The *balances*
 * are the brand's own columns (source of truth — see publish_gig_with_credit
 * / close_gig_and_release); the per-campaign breakdown is read live from
 * gigs so it can never drift from what a brand actually has running.
 */
const getBrandUsageSummary = async (brandId) => {
  const { data: brand } = await supabase
    .from('brands')
    .select(`
      id, "campaignCreditsRemaining", "applicationSlotsRemaining",
      "billingCycleStart", "billingCycleEnd",
      plan:plans(id, name, price, campaignLimit, applicationSlotLimit)
    `)
    .eq('id', brandId)
    .maybeSingle();

  if (!brand) throw new AppError('Brand not found.', 404, 'NOT_FOUND');

  // A brand created before plans existed (or with a dangling planId) still
  // has to resolve to something usable rather than crashing the dashboard.
  const plan = brand.plan || (await getPlanByName('FREE'));

  const { data: activeCampaigns, error } = await supabase
    .from('gigs')
    .select('id, title, "applicationSlots", "applicationSlotsUsed"')
    .eq('brandId', brandId)
    .eq('status', 'ACTIVE')
    .order('createdAt', { ascending: false });

  if (error) throw new AppError('Failed to load plan usage.', 500, 'DATABASE_ERROR');

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      campaignCredits: plan.campaignLimit,
      applicationSlots: plan.applicationSlotLimit,
    },
    campaignCreditsRemaining: brand.campaignCreditsRemaining,
    applicationSlotsRemaining: brand.applicationSlotsRemaining,
    billingCycleStart: brand.billingCycleStart,
    billingCycleEnd: brand.billingCycleEnd,
    campaigns: (activeCampaigns || []).map((g) => ({
      id: g.id,
      title: g.title,
      applicationSlotsAllotted: g.applicationSlots,
      applicationSlotsUsed: g.applicationSlotsUsed,
    })),
  };
};

/**
 * Admin-only: change a brand's plan and/or directly set its Campaign
 * Credit / Application Slot / billing-cycle fields (PRD section 28). Routed
 * through the admin_adjust_brand_plan RPC (schema.sql section 23k) so the
 * change is atomic and, when it touches campaignCreditsRemaining, recorded
 * in credit_transactions as an ADMIN_ADJUSTMENT. Authorization (requireAdmin)
 * is enforced at the route layer, not here — see admin.routes.js.
 */
const adminUpdateBrandPlan = async (brandId, { planName, campaignCredits, applicationSlots, billingCycleStart, billingCycleEnd, reason }) => {
  let planId = null;
  if (planName) {
    const plan = await getPlanByName(planName);
    planId = plan.id;
  }

  const { data, error } = await supabaseAdmin.rpc('admin_adjust_brand_plan', {
    p_brand_id: brandId,
    p_plan_id: planId,
    p_campaign_credits: campaignCredits ?? null,
    p_application_slots: applicationSlots ?? null,
    p_billing_cycle_start: billingCycleStart ?? null,
    p_billing_cycle_end: billingCycleEnd ?? null,
    p_reason: reason ?? null,
  });

  if (error) {
    if ((error.message || '').includes('BRAND_NOT_FOUND')) {
      throw new AppError('Brand not found.', 404, 'NOT_FOUND');
    }
    throw new AppError('Failed to update brand plan.', 500, 'DATABASE_ERROR');
  }

  return getBrandUsageSummary(brandId);
};

/**
 * Admin brand roster for the plan-management panel (PRD section 28) — one
 * row per brand with everything an admin needs to decide an adjustment.
 */
const adminListBrands = async () => {
  const { data, error } = await supabaseAdmin
    .from('brands')
    .select(`
      id, "businessName", "campaignCreditsRemaining", "applicationSlotsRemaining",
      "billingCycleStart", "billingCycleEnd",
      plan:plans(id, name)
    `)
    .order('businessName', { ascending: true });

  if (error) throw new AppError('Failed to load brands.', 500, 'DATABASE_ERROR');
  return data || [];
};

/**
 * Renew every brand whose billing cycle has elapsed: rolls its unused
 * Campaign Credits and Application Slots forward and adds the plan's fresh
 * per-cycle grant on top (PRD: rollover, not reset). Runs on a schedule —
 * see jobs/scheduler.js — same "sweep, not the gate" pattern as gig expiry;
 * correctness doesn't depend on this firing at exactly the right minute.
 */
const renewElapsedBillingCycles = async () => {
  const { data: due, error } = await supabaseAdmin
    .from('brands')
    .select('id')
    .not('billingCycleEnd', 'is', null)
    .lte('billingCycleEnd', new Date().toISOString());

  if (error) throw new AppError('Failed to load brands due for renewal.', 500, 'DATABASE_ERROR');

  const renewed = [];
  for (const brand of due || []) {
    const { error: rpcError } = await supabaseAdmin.rpc('renew_brand_billing_cycle', { p_brand_id: brand.id });
    if (rpcError) {
      console.error(`[renewElapsedBillingCycles] Failed for brand ${brand.id}:`, rpcError.message);
      continue;
    }
    renewed.push(brand.id);
  }

  return { renewed: renewed.length, ids: renewed };
};

module.exports = {
  listPlans,
  getPlanByName,
  getBrandUsageSummary,
  adminUpdateBrandPlan,
  adminListBrands,
  renewElapsedBillingCycles,
};
