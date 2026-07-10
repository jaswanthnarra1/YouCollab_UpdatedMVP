const { clerkClient } = require('@clerk/express');
const supabase = require('./supabase');
const AppError = require('../utils/AppError');

/**
 * Map a raw `users` row (snake_case for the columns that predate this
 * repo's migrations — see schema.sql section 9) to the camelCase shape the
 * frontend's AuthUser type expects.
 */
const toProfile = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.full_name,
  avatarUrl: user.avatar_url,
  isOnboarded: user.is_onboarded,
  lastActiveAt: user.last_active_at,
  notificationPrefs: user.notificationPrefs,
  privacyPrefs: user.privacyPrefs,
  brand: user.brand,
  influencer: user.influencer,
});

/**
 * Look up the local user row for an authenticated Clerk session, creating
 * it (and its role profile) on first sight. Role/name come from Clerk
 * unsafeMetadata, set client-side during sign-up.
 *
 * If a `users` row already exists for the verified email (e.g. a seed/demo
 * account, or one created under the old Supabase-Auth flow), it's linked to
 * this Clerk identity instead of creating a duplicate — safe because Clerk
 * already verified the signer owns that email.
 */
const findOrCreateByClerkId = async (clerkUserId) => {
  const { data: existing } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress;

  if (!email) {
    throw new AppError('Your Clerk account has no verified email address.', 400, 'BAD_REQUEST');
  }

  const role = clerkUser.unsafeMetadata?.role;
  if (role !== 'BRAND' && role !== 'INFLUENCER') {
    throw new AppError('Account setup is incomplete. Please sign up again.', 400, 'BAD_REQUEST');
  }
  const name =
    clerkUser.unsafeMetadata?.name ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    email;

  const { data: byEmail } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let userId;
  if (byEmail) {
    const { data: linked, error } = await supabase
      .from('users')
      .update({ clerk_user_id: clerkUserId, full_name: name })
      .eq('id', byEmail.id)
      .select('id')
      .single();
    if (error) throw new AppError('Failed to link account.', 500, 'DATABASE_ERROR');
    userId = linked.id;
  } else {
    const { data: created, error } = await supabase
      .from('users')
      .insert({ email, role, clerk_user_id: clerkUserId, full_name: name, is_onboarded: false })
      .select('id')
      .single();
    if (error) throw new AppError('Failed to create user profile.', 500, 'DATABASE_ERROR');
    userId = created.id;

    if (role === 'BRAND') {
      await supabase.from('brands').insert({
        userId,
        businessName: name,
        category: 'Cafe',
        location: 'Pune',
        bio: 'Welcome to our brand profile.',
      });
    } else {
      await supabase.from('influencers').insert({
        userId,
        name,
        instagramHandle: '',
        niche: 'Fashion',
        bio: 'Welcome to my creator profile.',
        followerCount: 0,
      });
    }
  }

  const { data: full } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('id', userId)
    .single();
  return full;
};

/**
 * Get current authenticated user profile.
 */
const getMe = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('id', userId)
    .maybeSingle();

  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);

  return toProfile(user);
};

/**
 * Permanently delete the logged-in user's account.
 * Deleting the public.users row cascades to every dependent table (brands/
 * influencers, gigs, applications, messages, notifications, reviews all have
 * ON DELETE CASCADE back to users) — the Clerk user is a separate system and
 * is deleted explicitly afterward.
 */
const deleteAccount = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('clerk_user_id')
    .eq('id', userId)
    .maybeSingle();

  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    throw new AppError('Failed to delete account.', 500, 'DATABASE_ERROR');
  }

  if (user.clerk_user_id) {
    try {
      await clerkClient.users.deleteUser(user.clerk_user_id);
    } catch (err) {
      console.error(`Failed to delete Clerk user during account deletion: ${err.message}`);
    }
  }

  return { success: true };
};

/**
 * Merge and persist notification/privacy preferences (partial updates —
 * only the keys the client sends are changed, everything else is kept).
 */
const updatePreferences = async (userId, { notificationPrefs, privacyPrefs }) => {
  const { data: user } = await supabase
    .from('users')
    .select('notificationPrefs, privacyPrefs')
    .eq('id', userId)
    .maybeSingle();

  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  const updateData = {};
  if (notificationPrefs) {
    updateData.notificationPrefs = { ...user.notificationPrefs, ...notificationPrefs };
  }
  if (privacyPrefs) {
    updateData.privacyPrefs = { ...user.privacyPrefs, ...privacyPrefs };
  }

  const { data: updated, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select('notificationPrefs, privacyPrefs')
    .single();

  if (error) {
    throw new AppError('Failed to update preferences.', 500, 'DATABASE_ERROR');
  }

  return updated;
};

module.exports = {
  findOrCreateByClerkId,
  getMe,
  deleteAccount,
  updatePreferences,
};
