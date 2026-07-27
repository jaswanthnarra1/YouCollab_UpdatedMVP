const { supabase, supabaseAdmin } = require('./supabase');
const AppError = require('../utils/AppError');

/**
 * Plans are rows, not constants — campaign/slot limits are read from the DB on
 * every check so pricing can change without a deploy, and so the frontend never
 * has to know the numbers.
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
 * Brand's plan + live usage. Usage is *derived* from gigs/applications rather
 * than stored in a counter column, so it can never drift out of sync with
 * reality the way a denormalized tally would.
 *
 * DRAFT gigs are excluded from both counts: they aren't published, so they
 * neither consume a campaign slot nor hold application capacity.
 */
const getBrandPlanUsage = async (brandId) => {
  const { data: brand } = await supabase
    .from('brands')
    .select('id, planId, plan:plans(id, name, price, campaignLimit, applicationSlotLimit)')
    .eq('id', brandId)
    .maybeSingle();

  if (!brand) throw new AppError('Brand not found.', 404, 'NOT_FOUND');

  // A brand created before plans existed (or with a dangling planId) still has
  // to resolve to something usable rather than crashing the dashboard.
  const plan = brand.plan || (await getPlanByName('FREE'));

  const { data: gigs, error } = await supabase
    .from('gigs')
    .select('id, status, applicationSlots')
    .eq('brandId', brandId)
    .neq('status', 'DRAFT');

  if (error) throw new AppError('Failed to load plan usage.', 500, 'DATABASE_ERROR');

  const live = (gigs || []).filter((g) => g.status === 'ACTIVE');
  const campaignsUsed = live.length;
  const slotsAllocated = live.reduce((sum, g) => sum + (g.applicationSlots || 0), 0);

  const gigIds = (gigs || []).map((g) => g.id);
  let applicationsReceived = 0;
  if (gigIds.length) {
    const { count } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .in('gigId', gigIds);
    applicationsReceived = count || 0;
  }

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      campaignLimit: plan.campaignLimit,
      applicationSlotLimit: plan.applicationSlotLimit,
    },
    campaignsUsed,
    campaignsRemaining: Math.max(0, plan.campaignLimit - campaignsUsed),
    slotsAllocated,
    slotsRemaining: Math.max(0, plan.applicationSlotLimit - slotsAllocated),
    applicationsReceived,
  };
};

/** Throws unless the brand can publish one more ACTIVE campaign. */
const assertCanPublishCampaign = async (brandId) => {
  const usage = await getBrandPlanUsage(brandId);
  if (usage.campaignsRemaining <= 0) {
    throw new AppError(
      `Your ${usage.plan.name} plan allows ${usage.plan.campaignLimit} active campaigns. Upgrade or close one to publish another.`,
      403,
      'CAMPAIGN_LIMIT_REACHED',
    );
  }
  return usage;
};

/**
 * Validates a proposed slot allocation for one gig against the plan total.
 * `excludeGigId` keeps a gig's *current* allocation out of the sum when it is
 * the one being edited, otherwise editing 16 → 16 would count it twice.
 */
const assertSlotsWithinPlan = async (brandId, requestedSlots, excludeGigId = null) => {
  if (!Number.isInteger(requestedSlots) || requestedSlots < 1) {
    throw new AppError('Every active campaign must have at least 1 application slot.', 400, 'INVALID_SLOTS');
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('plan:plans(applicationSlotLimit, name)')
    .eq('id', brandId)
    .maybeSingle();

  const plan = brand?.plan || (await getPlanByName('FREE'));

  let query = supabase
    .from('gigs')
    .select('id, applicationSlots')
    .eq('brandId', brandId)
    .eq('status', 'ACTIVE');
  if (excludeGigId) query = query.neq('id', excludeGigId);

  const { data: others, error } = await query;
  if (error) throw new AppError('Failed to validate slot allocation.', 500, 'DATABASE_ERROR');

  const otherTotal = (others || []).reduce((sum, g) => sum + (g.applicationSlots || 0), 0);
  const total = otherTotal + requestedSlots;

  if (total > plan.applicationSlotLimit) {
    throw new AppError(
      `That would allocate ${total} of ${plan.applicationSlotLimit} application slots on your ${plan.name} plan. ${Math.max(0, plan.applicationSlotLimit - otherTotal)} remaining.`,
      403,
      'SLOT_LIMIT_EXCEEDED',
    );
  }

  return { allocated: total, limit: plan.applicationSlotLimit };
};

/** Assign a plan to a brand (admin/manual for now — no billing yet). */
const assignPlan = async (brandId, planName) => {
  const plan = await getPlanByName(planName);

  // Downgrading must not leave the brand silently over capacity.
  const usage = await getBrandPlanUsage(brandId);
  if (usage.campaignsUsed > plan.campaignLimit) {
    throw new AppError(
      `Brand has ${usage.campaignsUsed} active campaigns; ${plan.name} allows ${plan.campaignLimit}. Close some first.`,
      409,
      'DOWNGRADE_BLOCKED',
    );
  }
  if (usage.slotsAllocated > plan.applicationSlotLimit) {
    throw new AppError(
      `Brand has ${usage.slotsAllocated} slots allocated; ${plan.name} allows ${plan.applicationSlotLimit}. Reduce allocations first.`,
      409,
      'DOWNGRADE_BLOCKED',
    );
  }

  const { error } = await supabaseAdmin.from('brands').update({ planId: plan.id }).eq('id', brandId);
  if (error) throw new AppError('Failed to assign plan.', 500, 'DATABASE_ERROR');

  return getBrandPlanUsage(brandId);
};

module.exports = {
  listPlans,
  getPlanByName,
  getBrandPlanUsage,
  assertCanPublishCampaign,
  assertSlotsWithinPlan,
  assignPlan,
};
