/**
 * YouCollab — Supabase Auth Helpers
 * ===================================
 * Wraps Supabase Auth API for server-side authentication.
 * Works alongside the existing custom JWT system (dual-auth strategy).
 *
 * Supabase Auth handles:
 *   • Email/password sign-up & sign-in
 *   • Session management & token refresh
 *   • Password reset emails
 *   • User metadata updates
 *
 * The custom JWT system continues to handle:
 *   • Access token generation for API authorization
 *   • Refresh token rotation via httpOnly cookies
 *   • Role-based middleware guards
 */

const { supabaseAdmin } = require('./client');

/**
 * Sign up a new user via Supabase Auth.
 * Creates user in auth.users — the profile row in public.users is created separately.
 *
 * @param {string} email
 * @param {string} password
 * @param {{ role: string }} metadata - Custom user metadata (role: BRAND | INFLUENCER)
 * @returns {Promise<{ user: object, session: object | null }>}
 */
const signUp = async (email, password, metadata = {}) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client is not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email in development
    user_metadata: {
      role: metadata.role || 'INFLUENCER',
    },
  });

  if (error) {
    throw new Error(`Supabase Auth sign-up failed: ${error.message}`);
  }

  return { user: data.user, session: null };
};

/**
 * Sign in an existing user via Supabase Auth.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: object, session: object }>}
 */
const signIn = async (email, password) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client is not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
  }

  // Use admin client to verify credentials without creating a browser session
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Supabase Auth sign-in failed: ${listError.message}`);
  }

  const authUser = users.find(u => u.email === email);
  if (!authUser) {
    return { user: null, session: null };
  }

  return { user: authUser, session: null };
};

/**
 * Get a Supabase Auth user by their auth ID.
 *
 * @param {string} authId - Supabase Auth user ID (UUID)
 * @returns {Promise<object|null>}
 */
const getUserById = async (authId) => {
  if (!supabaseAdmin) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(authId);

  if (error) {
    return null;
  }

  return user;
};

/**
 * Get a Supabase Auth user by email.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const getUserByEmail = async (email) => {
  if (!supabaseAdmin) return null;

  // Supabase Admin API doesn't have a direct "getByEmail" — list and filter
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) return null;

  return users.find(u => u.email === email) || null;
};

/**
 * Update a Supabase Auth user's metadata or email.
 *
 * @param {string} authId
 * @param {object} updates - { email?, password?, user_metadata? }
 * @returns {Promise<object>}
 */
const updateUser = async (authId, updates) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client is not configured.');
  }

  const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(
    authId,
    updates
  );

  if (error) {
    throw new Error(`Failed to update Supabase Auth user: ${error.message}`);
  }

  return user;
};

/**
 * Delete a Supabase Auth user (hard delete).
 *
 * @param {string} authId
 * @returns {Promise<void>}
 */
const deleteUser = async (authId) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client is not configured.');
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(authId);

  if (error) {
    throw new Error(`Failed to delete Supabase Auth user: ${error.message}`);
  }
};

/**
 * Trigger a password reset email via Supabase.
 * Note: Requires email templates configured in Supabase Dashboard → Auth → Email Templates.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
const resetPassword = async (email) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client is not configured.');
  }

  // Generate a password reset link
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (error) {
    throw new Error(`Password reset failed: ${error.message}`);
  }

  return data;
};

module.exports = {
  signUp,
  signIn,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  resetPassword,
};
