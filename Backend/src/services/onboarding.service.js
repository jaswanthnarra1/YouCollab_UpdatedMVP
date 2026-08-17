const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const { geocodePincode } = require('./geo.service');
const planService = require('./plan.service');
const config = require('../config');

/**
 * Resolves an optional pincode into the {pincode, latitude, longitude}
 * fields to merge into a brand/influencer insert — empty/omitted PIN yields
 * all-null coordinates (the "skipped PIN" state), not a rejected request.
 */
const resolveLocationFields = async (pincode) => {
  if (!pincode) {
    return { pincode: null, latitude: null, longitude: null };
  }
  const resolved = await geocodePincode(pincode);
  return { pincode: resolved.pincode, latitude: resolved.latitude, longitude: resolved.longitude };
};

/**
 * A brand-new brand's starting plan/credits/billing-cycle. Every brand
 * column below has a bare column DEFAULT (0 / NULL) with no application-
 * level fallback in the atomic credit RPCs — unlike the read-side
 * `plan.service.js` fallback that treats a NULL planId as FREE, a NULL
 * billingCycleEnd is explicitly excluded from the renewal sweep's WHERE
 * clause, so a brand onboarded without this would sit at 0 Campaign
 * Credits forever with no way to ever get its first grant. This mirrors
 * exactly what the one-time production backfill (schema.sql section 23l)
 * did for pre-existing brands, applied here at onboarding time instead.
 */
const initialPlanFields = async () => {
  const free = await planService.getPlanByName('FREE');
  const now = new Date();
  const cycleEnd = new Date(now.getTime() + config.BILLING.CYCLE_DAYS * 24 * 60 * 60 * 1000);
  return {
    planId: free.id,
    campaignCreditsRemaining: free.campaignLimit,
    applicationSlotsRemaining: free.applicationSlotLimit,
    billingCycleStart: now.toISOString(),
    billingCycleEnd: cycleEnd.toISOString(),
  };
};

/**
 * Onboard a Brand profile.
 */
const onboardBrand = async (userId, data) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (userError || !user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }
  
  if (user.role !== 'BRAND') {
    throw new AppError('Only brands can onboard here.', 403, 'FORBIDDEN');
  }

  if (user.is_onboarded) {
    throw new AppError('You have already completed onboarding!', 400, 'BAD_REQUEST');
  }

  const locationFields = await resolveLocationFields(data.pincode);
  const planFields = await initialPlanFields();

  // Create brand record
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .upsert({
      userId,
      businessName: data.businessName,
      category: data.category,
      location: data.location || 'Pune',
      ...locationFields,
      ...planFields,
      bio: data.bio,
      logoUrl: data.logoUrl || null,
      website: data.website || null,
    }, { onConflict: 'userId' })
    .select('*')
    .single();

  if (brandError) {
    throw new AppError('Failed to create brand profile.', 500, 'DATABASE_ERROR');
  }

  // Update user status
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      is_onboarded: true,
      avatar_url: data.logoUrl || null,
      full_name: data.businessName,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (updateError) {
    // Manual rollback: Delete brand if user update failed
    await supabase.from('brands').delete().eq('id', brand.id);
    throw new AppError('Failed to complete brand onboarding.', 500, 'DATABASE_ERROR');
  }

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    avatarUrl: updatedUser.avatar_url,
    isOnboarded: updatedUser.is_onboarded,
    brand,
  };
};

/**
 * Onboard an Influencer profile.
 */
const onboardInfluencer = async (userId, data) => {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (userError || !user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  if (user.role !== 'INFLUENCER') {
    throw new AppError('Only creators can onboard here.', 403, 'FORBIDDEN');
  }

  if (user.is_onboarded) {
    throw new AppError('You have already completed onboarding!', 400, 'BAD_REQUEST');
  }

  const locationFields = await resolveLocationFields(data.pincode);

  // Create influencer record
  const { data: influencer, error: influencerError } = await supabase
    .from('influencers')
    .upsert({
      userId,
      name: data.name,
      niche: data.niche,
      ...locationFields,
      bio: data.bio,
      profileImageUrl: data.profileImageUrl || null,
      // instagramHandle / followerCount deliberately not set here — they are
      // written only by the Instagram integration after a verified OAuth
      // connection. The column defaults ('' / 0) stand in until then.
    }, { onConflict: 'userId' })
    .select('*')
    .single();

  if (influencerError) {
    throw new AppError('Failed to create creator profile.', 500, 'DATABASE_ERROR');
  }

  // Update user status
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      is_onboarded: true,
      avatar_url: data.profileImageUrl || null,
      full_name: data.name,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (updateError) {
    // Manual rollback: Delete influencer if user update failed
    await supabase.from('influencers').delete().eq('id', influencer.id);
    throw new AppError('Failed to complete creator onboarding.', 500, 'DATABASE_ERROR');
  }

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    avatarUrl: updatedUser.avatar_url,
    isOnboarded: updatedUser.is_onboarded,
    influencer,
  };
};

module.exports = {
  onboardBrand,
  onboardInfluencer,
};
