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
 * Initiate registration of a new user using native Supabase Auth.
 * Supabase triggers SMTP OTP verification code delivery natively.
 */
const register = async (name, email, password, role) => {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409, 'CONFLICT');
  }

  // Register in Supabase Auth
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role }
    }
  });

  if (error) {
    throw new AppError(error.message, 400, 'BAD_REQUEST');
  }

  return { success: true, message: 'Verification OTP sent successfully.' };
};

/**
 * Login an existing user.
 */
const login = async (email, password) => {
  // Sign in using Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    if (authError.message.includes('Email not confirmed')) {
      throw new AppError('Please verify your email address first.', 401, 'UNAUTHORIZED');
    }
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

/**
 * Verify a registration OTP code and complete user setup.
 */
const verifyOtp = async (email, otp) => {
  // Verify OTP via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup'
  });

  if (authError) {
    throw new AppError(authError.message, 400, 'BAD_REQUEST');
  }

  const authUser = authData.user;
  if (!authUser) {
    throw new AppError('Verification failed. User session not returned.', 400, 'BAD_REQUEST');
  }

  const name = authUser.user_metadata?.name || 'User';
  const role = authUser.user_metadata?.role || 'INFLUENCER';

  // Check if user already exists in public.users
  let { data: user } = await supabase
    .from('users')
    .select('id, email, role, isOnboarded, createdAt')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    // Insert user record in public.users
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        passwordHash: 'SUPABASE_AUTH', // Password is secure under Supabase Auth
        role,
        authId: authUser.id,
        isOnboarded: false
      })
      .select('id, email, role, isOnboarded, createdAt')
      .single();

    if (userError) {
      console.error('Error creating public user:', userError);
      throw new AppError('Failed to create user profile in database.', 500, 'DATABASE_ERROR');
    }
    user = newUser;

    // Create the profile based on role
    if (role === 'BRAND') {
      const { error: brandError } = await supabase
        .from('brands')
        .insert({
          userId: user.id,
          businessName: name,
          category: 'Cafe',
          location: 'Pune',
          bio: 'Welcome to our brand profile.'
        });
      if (brandError) {
        console.error('Error creating brand profile:', brandError);
      }
    } else {
      const { error: creatorError } = await supabase
        .from('influencers')
        .insert({
          userId: user.id,
          name,
          instagramHandle: '',
          niche: 'Fashion',
          bio: 'Welcome to my creator profile.',
          followerCount: 0
        });
      if (creatorError) {
        console.error('Error creating creator profile:', creatorError);
      }
    }
  }

  // Generate tokens
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
 * Resend registration OTP code.
 */
const resendOtp = async (email) => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email
  });

  if (error) {
    throw new AppError(error.message, 400, 'BAD_REQUEST');
  }

  return { success: true, message: 'Verification code resent successfully.' };
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  requestPasswordReset,
  updateEmail,
  verifyOtp,
  resendOtp,
};
