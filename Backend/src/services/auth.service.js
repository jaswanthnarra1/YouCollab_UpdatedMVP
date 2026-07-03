const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabase');
const { supabaseAdmin } = require('./supabase');
const config = require('../config');
const AppError = require('../utils/AppError');
const emailService = require('./email.service');

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

const generate6DigitOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Find a Supabase Auth user by email.
 *
 * The admin API has no direct "get by email", so we page through listUsers().
 * Using a large perPage keeps this to a single round-trip in practice while
 * remaining correct beyond the default first page (~50 users), which the
 * previous single unpaginated call silently missed.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const findAuthUserByEmail = async (email) => {
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new AppError('Failed to look up auth records.', 500, 'AUTH_ERROR');

    const match = data?.users?.find((u) => u.email === email);
    if (match) return match;

    // Stop once we've read the last (partial or empty) page.
    if (!data?.users || data.users.length < perPage) return null;
  }
};

/**
 * Initiate registration of a new user.
 * Generates a 6-digit OTP, stores signup data in email_otps table, and sends via Gmail SMTP.
 */
const register = async (name, email, password, role) => {
  // Check if user already exists in public users table
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409, 'CONFLICT');
  }

  // Check if unconfirmed in Supabase Auth; delete to allow retry if so
  const existingAuthUser = await findAuthUserByEmail(email);

  if (existingAuthUser) {
    if (!existingAuthUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
    } else {
      throw new AppError('An account with this email already exists.', 409, 'CONFLICT');
    }
  }

  // Create unconfirmed user in Supabase Auth (no email is sent natively)
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name, role }
  });

  if (createError) {
    throw new AppError(createError.message, 400, 'BAD_REQUEST');
  }

  // Generate OTP and expiration (5 minutes from now)
  const otp = generate6DigitOtp();
  const otpHash = bcrypt.hashSync(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Hash password for temporary storage in email_otps
  const passwordHash = bcrypt.hashSync(password, 10);

  // Store in email_otps table
  const { error: upsertError } = await supabase
    .from('email_otps')
    .upsert({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      verified: false,
      name,
      password_hash: passwordHash,
      role,
      type: 'signup'
    });

  if (upsertError) {
    console.error('Failed to save OTP:', upsertError);
    throw new AppError('Failed to initiate verification code setup.', 500, 'DATABASE_ERROR');
  }

  // Send email containing OTP
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Verify your email address</h2>
      <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
        Use the following 6-digit verification code to complete your registration on YouCollab:
      </p>
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        This code is valid for 5 minutes. If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await emailService.sendMail(email, 'Your Verification Code', htmlContent);
  } catch (mailError) {
    console.warn(`[OTP Send Fallback] Failed to deliver email via Gmail SMTP: ${mailError.message}`);
  }

  // In development, log and return OTP so it can be used without email delivery
  const isDev = config.NODE_ENV === 'development';
  if (isDev) {
    console.log(`\n🔑 [DEV MODE] OTP for ${email}: ${otp}\n`);
  }

  return {
    success: true,
    message: 'Verification OTP sent successfully.',
    ...(isDev && { dev_otp: otp }),
  };
};

/**
 * Login an existing user.
 */
const login = async (email, password) => {
  // Look up the user from the public.users table
  const { data: user } = await supabase
    .from('users')
    .select('*, brand:brands(*), influencer:influencers(*)')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    throw new AppError('Incorrect email or password.', 401, 'UNAUTHORIZED');
  }

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

  // Rotate tokens
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
    return;
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
 */
const requestPasswordReset = async (email) => {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    // Don't reveal account existence
    return { message: 'If an account with that email exists, a reset code has been sent.' };
  }

  const otp = generate6DigitOtp();
  const otpHash = bcrypt.hashSync(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: upsertError } = await supabase
    .from('email_otps')
    .upsert({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      verified: false,
      type: 'recovery'
    });

  if (upsertError) {
    console.error('Failed to save recovery OTP:', upsertError);
    throw new AppError('Failed to initiate password reset flow.', 500, 'DATABASE_ERROR');
  }

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Reset your password</h2>
      <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
        Use the following 6-digit verification code to reset your password on YouCollab:
      </p>
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        This code is valid for 5 minutes. If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await emailService.sendMail(email, 'Password Reset Code', htmlContent);
  } catch (mailError) {
    console.warn(`[OTP Send Fallback] Failed to deliver email via Gmail SMTP: ${mailError.message}`);
  }

  return { message: 'If an account with that email exists, a reset code has been sent.' };
};

/**
 * Verify a registration OTP code and complete user setup.
 */
const verifyOtp = async (email, otp) => {
  // Find record in email_otps
  const { data: record, error: findError } = await supabase
    .from('email_otps')
    .select('*')
    .eq('email', email)
    .eq('type', 'signup')
    .maybeSingle();

  if (findError || !record) {
    throw new AppError('No active verification session found for this email.', 404, 'NOT_FOUND');
  }

  if (new Date(record.expires_at) < new Date()) {
    throw new AppError('The verification code has expired. Please request a new one.', 400, 'BAD_REQUEST');
  }

  if (record.attempts >= 5) {
    throw new AppError('Too many failed verification attempts. Please request a new code.', 400, 'BAD_REQUEST');
  }

  // Compare OTP
  const isMatch = await bcrypt.compare(otp, record.otp_hash);
  if (!isMatch) {
    // Increment attempts
    await supabase
      .from('email_otps')
      .update({ attempts: record.attempts + 1 })
      .eq('email', email)
      .eq('type', 'signup');

    throw new AppError('Invalid verification code.', 400, 'BAD_REQUEST');
  }

  // Check if already created in Supabase Auth (check unconfirmed)
  let authUser;
  const existingAuthUser = await findAuthUserByEmail(email);

  if (existingAuthUser) {
    // If user exists and is unconfirmed, confirm them. Else use existing.
    if (!existingAuthUser.email_confirmed_at) {
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAuthUser.id,
        { email_confirm: true }
      );
      if (updateError) throw new AppError(updateError.message, 400, 'BAD_REQUEST');
      authUser = updateData.user;
    } else {
      authUser = existingAuthUser;
    }
  } else {
    // Create new confirmed user in Supabase Auth
    // Note: We need a temporary plain password, or we can use the password from the registration input
    // To do this, we stored the user's hashed password. GoTrue requires plain password during creation.
    // If they aren't in Supabase Auth yet (rare because register creates them), we create them now.
    // But since they were created in register, they should be in authUser.
    throw new AppError('Auth record not found. Please sign up again.', 400, 'BAD_REQUEST');
  }

  // Create record in public.users table if not already there
  let { data: user } = await supabase
    .from('users')
    .select('id, email, role, isOnboarded, createdAt')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        passwordHash: 'SUPABASE_AUTH',
        role: record.role,
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

    // Create profile based on role
    if (record.role === 'BRAND') {
      await supabase.from('brands').insert({
        userId: user.id,
        businessName: record.name,
        category: 'Cafe',
        location: 'Pune',
        bio: 'Welcome to our brand profile.'
      });
    } else {
      await supabase.from('influencers').insert({
        userId: user.id,
        name: record.name,
        instagramHandle: '',
        niche: 'Fashion',
        bio: 'Welcome to my creator profile.',
        followerCount: 0
      });
    }
  }

  // Delete verification code
  await supabase
    .from('email_otps')
    .delete()
    .eq('email', email)
    .eq('type', 'signup');

  // Generate tokens
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
  // Find record in email_otps
  const { data: record, error: findError } = await supabase
    .from('email_otps')
    .select('*')
    .eq('email', email)
    .eq('type', 'signup')
    .maybeSingle();

  if (findError || !record) {
    throw new AppError('No registration session found for this email. Sign up first.', 404, 'NOT_FOUND');
  }

  // Rate limiting: 60 seconds
  const lastCreated = new Date(record.created_at).getTime();
  if (Date.now() - lastCreated < 60 * 1000) {
    throw new AppError('Please wait 60 seconds before requesting another code.', 429, 'RATE_LIMITED');
  }

  const otp = generate6DigitOtp();
  const otpHash = bcrypt.hashSync(otp, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('email_otps')
    .update({
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      created_at: new Date().toISOString()
    })
    .eq('email', email)
    .eq('type', 'signup');

  if (updateError) {
    throw new AppError('Failed to refresh verification code.', 500, 'DATABASE_ERROR');
  }

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Verify your email address</h2>
      <p style="font-size: 14px; color: #475569; margin-bottom: 24px;">
        Here is your new 6-digit verification code:
      </p>
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        This code is valid for 5 minutes.
      </p>
    </div>
  `;

  try {
    await emailService.sendMail(email, 'Your New Verification Code', htmlContent);
  } catch (mailError) {
    console.warn(`[OTP Send Fallback] Failed to deliver email via Gmail SMTP: ${mailError.message}`);
  }

  const isDev = config.NODE_ENV === 'development';
  if (isDev) {
    console.log(`\n🔑 [DEV MODE] Resent OTP for ${email}: ${otp}\n`);
  }

  return {
    success: true,
    message: 'Verification code resent successfully.',
    ...(isDev && { dev_otp: otp }),
  };
};

/**
 * Reset password via verified OTP code.
 */
const resetPassword = async (email, otp, newPassword) => {
  // Find record in email_otps
  const { data: record, error: findError } = await supabase
    .from('email_otps')
    .select('*')
    .eq('email', email)
    .eq('type', 'recovery')
    .maybeSingle();

  if (findError || !record) {
    throw new AppError('No password reset session found for this email.', 404, 'NOT_FOUND');
  }

  if (new Date(record.expires_at) < new Date()) {
    throw new AppError('The verification code has expired. Please request a new one.', 400, 'BAD_REQUEST');
  }

  if (record.attempts >= 5) {
    throw new AppError('Too many failed verification attempts. Please request a new code.', 400, 'BAD_REQUEST');
  }

  // Compare OTP
  const isMatch = await bcrypt.compare(otp, record.otp_hash);
  if (!isMatch) {
    await supabase
      .from('email_otps')
      .update({ attempts: record.attempts + 1 })
      .eq('email', email)
      .eq('type', 'recovery');

    throw new AppError('Invalid verification code.', 400, 'BAD_REQUEST');
  }

  // Find user's auth record to update
  const authUser = await findAuthUserByEmail(email);

  if (!authUser) {
    throw new AppError('User auth record not found.', 404, 'NOT_FOUND');
  }

  // Update password in Supabase Auth
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    authUser.id,
    { password: newPassword }
  );

  if (updateError) {
    throw new AppError(updateError.message, 400, 'BAD_REQUEST');
  }

  // Delete verification code
  await supabase
    .from('email_otps')
    .delete()
    .eq('email', email)
    .eq('type', 'recovery');

  return { success: true, message: 'Password reset successfully. You can now log in.' };
};

/**
 * Update user email.
 */
const updateEmail = async (userId, newEmail) => {
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

  const { data: fullUser } = await supabase
    .from('users')
    .select('authId')
    .eq('id', userId)
    .maybeSingle();

  if (fullUser?.authId && supabaseAdmin) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(fullUser.authId, { email: newEmail });
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
  verifyOtp,
  resendOtp,
  resetPassword,
};
