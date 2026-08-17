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

  const latestRequest = await getMyLatestPlanChangeRequest(brandId);

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
    // Most recent plan-change request regardless of status, or null if the
    // brand has never made one — lets the dashboard show a pending banner
    // and block a duplicate submission without a second network call.
    latestRequest,
  };
};

/**
 * Brand submits a request to switch plans. Only ever *creates a request
 * row* — the actual plan mutation happens exclusively in
 * adminApprovePlanChangeRequest, which reuses the existing, already-gated
 * admin_adjust_brand_plan path. A Brand can never apply this itself.
 *
 * The real duplicate-request guard is the partial unique index
 * (plan_change_requests_one_pending_idx, schema.sql section 24) — this
 * pre-check just returns a friendlier error than a raw constraint violation.
 */
const requestPlanChange = async (brandId, planName) => {
  const requestedPlan = await getPlanByName(planName);

  const { data: brand } = await supabase.from('brands').select('id, planId').eq('id', brandId).maybeSingle();
  if (!brand) throw new AppError('Brand not found.', 404, 'NOT_FOUND');

  if (brand.planId === requestedPlan.id) {
    throw new AppError("You're already on this plan.", 400, 'BAD_REQUEST');
  }

  const { data: existingPending } = await supabase
    .from('plan_change_requests')
    .select('id')
    .eq('brandId', brandId)
    .eq('status', 'PENDING')
    .maybeSingle();

  if (existingPending) {
    throw new AppError('You already have a pending plan change request.', 409, 'CONFLICT');
  }

  const { data: created, error } = await supabase
    .from('plan_change_requests')
    .insert({ brandId, currentPlanId: brand.planId, requestedPlanId: requestedPlan.id })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('You already have a pending plan change request.', 409, 'CONFLICT');
    }
    throw new AppError('Failed to submit plan change request.', 500, 'DATABASE_ERROR');
  }

  return created;
};

/** Most recent plan-change request for a brand, or null if it's never made one. */
const getMyLatestPlanChangeRequest = async (brandId) => {
  const { data } = await supabase
    .from('plan_change_requests')
    .select('*')
    .eq('brandId', brandId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
};

/**
 * Admin: all plan-change requests (defaults to newest first, optionally
 * filtered by status). Small-volume feature — a flat limited list is
 * enough, no cursor pagination.
 */
const adminListPlanChangeRequests = async (filters = {}) => {
  let query = supabase
    .from('plan_change_requests')
    .select('*, brand:brands(id, businessName)')
    .order('createdAt', { ascending: false })
    .limit(100);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw new AppError('Failed to load plan change requests.', 500, 'DATABASE_ERROR');
  return data || [];
};

/**
 * Admin: approve a pending request. Conditioned on status='PENDING' so two
 * admins racing the same request can't both approve it (mirrors
 * referral.service.js's adminMarkUnderReview pattern).
 *
 * Explicit business decision: approving grants usable capacity immediately
 * rather than leaving the brand relabeled-but-unchanged until its next
 * renewal (up to 30 days away) — approving an upgrade that grants nothing
 * usable defeats the reason anyone requests one. The exact mechanic is to
 * *add the difference* between the new and old plan's per-cycle grant to
 * whatever the brand currently holds (never a flat reset to the new plan's
 * number), so anything already rolled over is preserved — the same
 * "rollover, never reset" principle the PRD already applies at renewal
 * (section 21), just triggered by a plan change instead of time passing.
 * Applied symmetrically for a downgrade too (the delta goes negative),
 * clamped at 0 so it can never violate the brands_*_check constraints.
 */
const adminApprovePlanChangeRequest = async (id, adminClerkId) => {
  const { data: request, error: updateError } = await supabase
    .from('plan_change_requests')
    .update({ status: 'APPROVED', reviewedBy: adminClerkId, reviewedAt: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'PENDING')
    .select('*')
    .maybeSingle();

  if (updateError) throw new AppError('Failed to approve request.', 500, 'DATABASE_ERROR');
  if (!request) throw new AppError('This request has already been reviewed.', 400, 'BAD_REQUEST');

  const [{ data: brand }, { data: requestedPlan }, { data: currentPlan }] = await Promise.all([
    supabase.from('brands').select('"campaignCreditsRemaining", "applicationSlotsRemaining"').eq('id', request.brandId).single(),
    supabase.from('plans').select('name, "campaignLimit", "applicationSlotLimit"').eq('id', request.requestedPlanId).single(),
    request.currentPlanId
      ? supabase.from('plans').select('"campaignLimit", "applicationSlotLimit"').eq('id', request.currentPlanId).single()
      : Promise.resolve({ data: null }),
  ]);

  // No recorded prior plan (legacy edge case) treats "old" as a zero
  // grant — the brand gets the new plan's full allocation on top of
  // whatever they already have, rather than the approval silently no-oping.
  const oldGrant = currentPlan || { campaignLimit: 0, applicationSlotLimit: 0 };
  const creditDelta = requestedPlan.campaignLimit - oldGrant.campaignLimit;
  const slotDelta = requestedPlan.applicationSlotLimit - oldGrant.applicationSlotLimit;

  await adminUpdateBrandPlan(request.brandId, {
    planName: requestedPlan.name,
    campaignCredits: Math.max(0, brand.campaignCreditsRemaining + creditDelta),
    applicationSlots: Math.max(0, brand.applicationSlotsRemaining + slotDelta),
    reason: `Plan change request ${id} approved`,
  });

  return request;
};

/** Admin: reject a pending request. No plan mutation happens. */
const adminRejectPlanChangeRequest = async (id, adminClerkId) => {
  const { data: request, error } = await supabase
    .from('plan_change_requests')
    .update({ status: 'REJECTED', reviewedBy: adminClerkId, reviewedAt: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'PENDING')
    .select('*')
    .maybeSingle();

  if (error) throw new AppError('Failed to reject request.', 500, 'DATABASE_ERROR');
  if (!request) throw new AppError('This request has already been reviewed.', 400, 'BAD_REQUEST');

  return request;
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
  requestPlanChange,
  getMyLatestPlanChangeRequest,
  adminListPlanChangeRequests,
  adminApprovePlanChangeRequest,
  adminRejectPlanChangeRequest,
};
