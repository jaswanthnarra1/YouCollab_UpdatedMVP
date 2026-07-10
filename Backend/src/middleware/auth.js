const { getAuth } = require('@clerk/express');
const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');

/**
 * Middleware to authenticate requests via Clerk session token.
 * Lazily provisions the local `users` row (+ role profile) on first sight
 * of a Clerk identity — see authService.findOrCreateByClerkId.
 */
const authenticate = async (req, res, next) => {
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    return next(new AppError('Join YouCollab or sign in to view this.', 401, 'UNAUTHORIZED'));
  }

  try {
    const user = await authService.findOrCreateByClerkId(clerkUserId);
    req.user = { id: user.id, role: user.role, clerkId: clerkUserId };
    next();
  } catch (error) {
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
