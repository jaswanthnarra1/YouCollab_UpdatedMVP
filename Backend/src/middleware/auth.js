const { getAuth } = require('@clerk/express');
const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate requests via Clerk session token.
 * Lazily provisions the local `users` row (+ role profile) on first sight
 * of a Clerk identity — see authService.findOrCreateByClerkId.
 */
const authenticate = async (req, res, next) => {
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    // No token, or Clerk couldn't verify it (expired/malformed) — the client
    // never even has a valid session here, distinct from a valid session
    // whose backend provisioning then fails below.
    logger.debug({ path: req.path }, '[auth] no verified Clerk session on request');
    return next(new AppError('Join YouCollab or sign in to view this.', 401, 'UNAUTHORIZED'));
  }

  try {
    const user = await authService.findOrCreateByClerkId(clerkUserId);
    req.user = { id: user.id, role: user.role, clerkId: clerkUserId };
    next();
  } catch (error) {
    logger.error({ clerkUserId, path: req.path, err: error.message }, '[auth] findOrCreateByClerkId failed');
    next(error);
  }
};

/**
 * Role authorization guard.
 * @param {...string} allowedRoles - 'BRAND', 'INFLUENCER'
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Sign in to perform this action.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You don't have access to do that.", 403, 'FORBIDDEN'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
};
