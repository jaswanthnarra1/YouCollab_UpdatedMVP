const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const { geocodePincode } = require('./geo.service');

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

  // Create brand record
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .upsert({
      userId,
      businessName: data.businessName,
      category: data.category,
      location: data.location || 'Pune',
      ...locationFields,
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
      instagramHandle: data.instagramHandle,
      niche: data.niche,
      ...locationFields,
      bio: data.bio,
      profileImageUrl: data.profileImageUrl || null,
      followerCount: data.followerCount || 0,
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
