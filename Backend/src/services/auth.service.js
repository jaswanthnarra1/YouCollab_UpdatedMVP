const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabase');
const { supabaseAdmin } = require('./supabase');
const supabaseAuth = require('../../supabase/auth');
const config = require('../config');
const AppError = require('../utils/AppError');

// Helpers for token generation
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    config.JWT.SECRET,
    { expiresIn: config.JWT.ACCESS_EXPIRES }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    config.JWT.SECRET,
    { expiresIn: config.JWT.REFRESH_EXPIRES }
  );
};

const hashToken = (token) => {
  return bcrypt.hashSync(token, 10);
};

/**
 * Register a new user.
 * Creates user in both Supabase Auth (if available) and the public.users table.
 */
const register = async (email, password, role) => {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409, 'CONFLICT');
  }

  // Step 1: Create user in Supabase Auth (if admin client is available)
  let authId = null;
  try {
    if (supabaseAdmin) {
      const { user: authUser } = await supabaseAuth.signUp(email, password, { role });
      authId = authUser?.id || null;
    }
  } catch (authErr) {
    // Log but don't block — custom JWT auth is the primary system
    console.warn(`Supabase Auth sign-up skipped: ${authErr.message}`);
  }

  // Step 2: Create user in public.users table
  const passwordHash = await bcrypt.hash(password, 12);
  const insertData = { email, passwordHash, role };
  if (authId) insertData.authId = authId;

  const { data: user, error } = await supabase
    .from('users')
    .insert(insertData)
    .select('id, email, role, isOnboarded, createdAt')
    .single();

  if (error) throw new AppError('Failed to create account.', 500, 'DATABASE_ERROR');

  const accessToken = generateAccessToken(user);
  const refreshTokenString = generateRefreshToken(user);

  // Save refresh token in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await supabase.from('refresh_tokens').insert({
    userId: user.id,
    tokenHash: hashToken(refreshTokenString),
    expiresAt: expiresAt.toISOString(),
  });

  return {
    user,
    accessToken,
    refreshToken: refreshTokenString,
  };
};

/**
 * Login an existing user.
 */
const login = async (email, password) => {
  const { data: user } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    throw new AppError('Incorrect email or password.', 401, 'UNAUTHORIZED');
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    throw new AppError('Incorrect email or password.', 401, 'UNAUTHORIZED');
  }

  const accessToken = generateAccessToken(user);
  const refreshTokenString = generateRefreshToken(user);

  // Save refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabase.from('refresh_tokens').insert({
    userId: user.id,
    tokenHash: hashToken(refreshTokenString),
    expiresAt: expiresAt.toISOString(),
  });

  // Update last active
  await supabase
    .from('users')
    .update({ lastActiveAt: new Date().toISOString() })
    .eq('id', user.id);

  const profile = {
    id: user.id,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isOnboarded: user.isOnboarded,
    brand: user.brand,
    influencer: user.influencer,
  };

  return {
    user: profile,
    accessToken,
    refreshToken: refreshTokenString,
  };
};

/**
 * Refresh tokens by rotating the refresh token.
 */
const refreshToken = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    throw new AppError('Session expired. Sign in again.', 401, 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = jwt.verify(oldRefreshToken, config.JWT.SECRET);
  } catch (err) {
    throw new AppError('Session expired. Sign in again.', 401, 'UNAUTHORIZED');
  }

  // Find all active tokens for this user
  const { data: activeTokens } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('userId', payload.id);

  // Find matching token
  let matchedToken = null;
  for (const tokenRecord of (activeTokens || [])) {
    const isMatch = await bcrypt.compare(oldRefreshToken, tokenRecord.tokenHash);
    if (isMatch) {
      matchedToken = tokenRecord;
      break;
    }
  }

  if (!matchedToken || new Date(matchedToken.expiresAt) < new Date()) {
    // If token not found in DB or expired, delete old token if exists
    if (matchedToken) {
      await supabase.from('refresh_tokens').delete().eq('id', matchedToken.id);
    }
    throw new AppError('Session expired. Please sign in.', 401, 'UNAUTHORIZED');
  }

  const { data: user } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('id', payload.id)
    .maybeSingle();

  if (!user) {
    throw new AppError('User not found.', 401, 'UNAUTHORIZED');
  }

  // Rotate tokens: delete old, create new
  await supabase.from('refresh_tokens').delete().eq('id', matchedToken.id);

  const newAccessToken = generateAccessToken(user);
  const newRefreshTokenString = generateRefreshToken(user);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabase.from('refresh_tokens').insert({
    userId: user.id,
    tokenHash: hashToken(newRefreshTokenString),
    expiresAt: expiresAt.toISOString(),
  });

  // Update last active
  await supabase
    .from('users')
    .update({ lastActiveAt: new Date().toISOString() })
    .eq('id', user.id);

  const profile = {
    id: user.id,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isOnboarded: user.isOnboarded,
    brand: user.brand,
    influencer: user.influencer,
  };

  return {
    user: profile,
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenString,
  };
};

/**
 * Logout user by deleting their active refresh token.
 */
const logout = async (oldRefreshToken) => {
  if (!oldRefreshToken) return;

  let payload;
  try {
    payload = jwt.verify(oldRefreshToken, config.JWT.SECRET);
  } catch (err) {
    return; // Token already invalid
  }

  const { data: activeTokens } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('userId', payload.id);

  for (const tokenRecord of (activeTokens || [])) {
    const isMatch = await bcrypt.compare(oldRefreshToken, tokenRecord.tokenHash);
    if (isMatch) {
      await supabase.from('refresh_tokens').delete().eq('id', tokenRecord.id);
      break;
    }
  }
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

  // Update last active
  await supabase
    .from('users')
    .update({ lastActiveAt: new Date().toISOString() })
    .eq('id', userId);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isOnboarded: user.isOnboarded,
    lastActiveAt: user.lastActiveAt,
    brand: user.brand,
    influencer: user.influencer,
  };
};

/**
 * Request a password reset email.
 * Uses Supabase Auth if available, otherwise returns instructions.
 */
const requestPasswordReset = async (email) => {
  // Verify user exists
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    // Don't reveal whether the email exists — security best practice
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  // Attempt Supabase Auth password reset
  try {
    if (supabaseAdmin) {
      await supabaseAuth.resetPassword(email);
    }
  } catch (err) {
    console.warn(`Password reset via Supabase Auth failed: ${err.message}`);
  }

  return { message: 'If an account with that email exists, a reset link has been sent.' };
};

/**
 * Update user email.
 */
const updateEmail = async (userId, newEmail) => {
  // Check if email is taken
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', newEmail)
    .maybeSingle();

  if (existing) {
    throw new AppError('This email is already in use.', 409, 'CONFLICT');
  }

  const { data: user, error } = await supabase
    .from('users')
    .update({ email: newEmail })
    .eq('id', userId)
    .select('id, email, role')
    .single();

  if (error) {
    throw new AppError('Failed to update email.', 500, 'DATABASE_ERROR');
  }

  // Sync with Supabase Auth if user has an authId
  const { data: fullUser } = await supabase
    .from('users')
    .select('authId')
    .eq('id', userId)
    .maybeSingle();

  if (fullUser?.authId && supabaseAdmin) {
    try {
      await supabaseAuth.updateUser(fullUser.authId, { email: newEmail });
    } catch (err) {
      console.warn(`Supabase Auth email sync failed: ${err.message}`);
    }
  }

  return user;
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  requestPasswordReset,
  updateEmail,
};
