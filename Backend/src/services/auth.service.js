const { clerkClient } = require('@clerk/express');
const supabase = require('./supabase');
const AppError = require('../utils/AppError');
const config = require('../config');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  hasAcceptedTerms: user.terms_accepted,
  termsAcceptedAt: user.terms_accepted_at,
  termsVersion: user.terms_version,
  // Single boolean the frontend route guards gate on — recomputed server-side
  // on every /me call so bumping config.TERMS.VERSION alone re-prompts
  // everyone, with no per-user migration needed.
  needsTermsAcceptance: !user.terms_accepted || user.terms_version !== config.TERMS.VERSION,
  // V1 admin gate — env-allowlisted Clerk user IDs, not a database role.
  // See config.ADMIN and middleware/auth.js requireAdmin.
  isAdmin: config.ADMIN.CLERK_USER_IDS.includes(user.clerk_user_id),
});

/**
 * ponytail: regex sniffing, not a UA-parsing library — this only needs to be
 * good enough for a human-readable audit trail (who accepted, roughly from
 * what), not analytics-grade device detection. Upgrade path: swap in a
 * proper parser (e.g. ua-parser-js) if that ever becomes a real requirement.
 */
const parseUserAgent = (ua = '') => {
  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let device = 'Desktop';
  if (/ipad|tablet/i.test(ua)) device = 'Tablet';
  else if (/mobi|iphone|android/i.test(ua)) device = 'Mobile';

  return { browser, device };
};

/**
 * Look up the local user row for an authenticated Clerk session, creating
 * it (and its role profile) on first sight. Role/name come from Clerk
 * unsafeMetadata, set client-side during sign-up.
 *
 * If a `users` row already exists for the verified email (e.g. a seed/demo
 * account, or one created under a prior auth strategy), it's linked to this
 * Clerk identity instead of creating a duplicate — safe because Clerk
 * already verified the signer owns that email.
 */
const findOrCreateByClerkId = async (clerkUserId) => {
  const { data: existing } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (existing) {
    logger.debug({ clerkUserId }, '[auth] existing user matched by clerk_user_id');
    return existing;
  }

  logger.info({ clerkUserId }, '[auth] no local user yet — provisioning from Clerk');

  let clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress;

  if (!email) {
    throw new AppError('Your Clerk account has no verified email address.', 400, 'BAD_REQUEST');
  }

  let role = clerkUser.unsafeMetadata?.role;
  if (role !== 'BRAND' && role !== 'INFLUENCER') {
    // OAuthRole.tsx calls user.update({ unsafeMetadata: { role } }) client-side
    // right before hitting this endpoint — that resolves once Clerk's client
    // record is updated, but Clerk's Backend API (what getUser() above reads)
    // can lag behind by a moment. One short re-read absorbs that documented
    // propagation window instead of failing a legitimate, just-completed
    // role selection outright.
    logger.warn({ clerkUserId, role }, '[auth] role missing on first Clerk read — retrying once after propagation delay');
    await sleep(700);
    clerkUser = await clerkClient.users.getUser(clerkUserId);
    role = clerkUser.unsafeMetadata?.role;
  }
  if (role !== 'BRAND' && role !== 'INFLUENCER') {
    logger.error({ clerkUserId, role }, '[auth] role still missing after retry');
    throw new AppError('Account setup is incomplete. Please sign up again.', 400, 'BAD_REQUEST');
  }
  const name =
    clerkUser.unsafeMetadata?.name ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    email;

  const { data: byIdentifier } = await supabase.from('users').select('id').eq('email', email).maybeSingle();

  let userId;
  if (byIdentifier) {
    const { data: linked, error } = await supabase
      .from('users')
      .update({ clerk_user_id: clerkUserId, full_name: name, email })
      .eq('id', byIdentifier.id)
      .select('id')
      .single();
    if (error) {
      logger.error({ clerkUserId, email, err: error.message }, '[auth] failed to link existing user row');
      throw new AppError('Failed to link account.', 500, 'DATABASE_ERROR');
    }
    userId = linked.id;
    logger.info({ clerkUserId, userId }, '[auth] linked Clerk identity to existing user row');
  } else {
    const { data: created, error } = await supabase
      .from('users')
      .insert({ email, role, clerk_user_id: clerkUserId, full_name: name, is_onboarded: false })
      .select('id')
      .single();
    if (error) {
      logger.error({ clerkUserId, email, role, err: error.message }, '[auth] failed to create user row');
      throw new AppError('Failed to create user profile.', 500, 'DATABASE_ERROR');
    }
    userId = created.id;
    logger.info({ clerkUserId, userId, role }, '[auth] created new user row');

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

/**
 * Record acceptance of the current Terms of Service / Privacy Policy.
 * `version` must match the server's current TERMS.VERSION — a stale client
 * (open in a tab since before a version bump) gets rejected rather than
 * silently recording acceptance of a version that's no longer current.
 */
const acceptTerms = async (userId, { version, ip, userAgent }) => {
  if (version !== config.TERMS.VERSION) {
    throw new AppError(
      'The Terms of Service have been updated. Please refresh the page and review the latest version.',
      409,
      'TERMS_VERSION_STALE'
    );
  }

  const { browser, device } = parseUserAgent(userAgent);

  const { data: updated, error } = await supabase
    .from('users')
    .update({
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: version,
      terms_accept_ip: ip || null,
      terms_accept_browser: browser,
      terms_accept_device: device,
    })
    .eq('id', userId)
    .select('*, brand:brands(*), influencer:influencers(*)')
    .single();

  if (error) {
    throw new AppError('Failed to record Terms acceptance.', 500, 'DATABASE_ERROR');
  }

  return toProfile(updated);
};

module.exports = {
  findOrCreateByClerkId,
  getMe,
  deleteAccount,
  updatePreferences,
  acceptTerms,
};
