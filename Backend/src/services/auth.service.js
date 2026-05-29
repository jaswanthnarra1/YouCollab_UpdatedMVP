const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
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
 */
const register = async (email, password, role) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409, 'CONFLICT');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isOnboarded: true,
      createdAt: true,
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshTokenString = generateRefreshToken(user);

  // Save refresh token in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshTokenString),
      expiresAt,
    },
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
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      brand: true,
      influencer: true,
    },
  });

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

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshTokenString),
      expiresAt,
    },
  });

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

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
  const activeTokens = await prisma.refreshToken.findMany({
    where: { userId: payload.id },
  });

  // Find matching token
  let matchedToken = null;
  for (const tokenRecord of activeTokens) {
    const isMatch = await bcrypt.compare(oldRefreshToken, tokenRecord.tokenHash);
    if (isMatch) {
      matchedToken = tokenRecord;
      break;
    }
  }

  if (!matchedToken || matchedToken.expiresAt < new Date()) {
    // If token not found in DB or expired, delete old token if exists
    if (matchedToken) {
      await prisma.refreshToken.delete({ where: { id: matchedToken.id } });
    }
    throw new AppError('Session expired. Please sign in.', 401, 'UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: {
      brand: true,
      influencer: true,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 401, 'UNAUTHORIZED');
  }

  // Rotate tokens: delete old, create new
  await prisma.refreshToken.delete({ where: { id: matchedToken.id } });

  const newAccessToken = generateAccessToken(user);
  const newRefreshTokenString = generateRefreshToken(user);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshTokenString),
      expiresAt,
    },
  });

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

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

  const activeTokens = await prisma.refreshToken.findMany({
    where: { userId: payload.id },
  });

  for (const tokenRecord of activeTokens) {
    const isMatch = await bcrypt.compare(oldRefreshToken, tokenRecord.tokenHash);
    if (isMatch) {
      await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      break;
    }
  }
};

/**
 * Get current authenticated user profile.
 */
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      brand: true,
      influencer: true,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  // Update last active
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  });

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

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
};
