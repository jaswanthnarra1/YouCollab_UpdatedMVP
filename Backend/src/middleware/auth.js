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
    // Distinguish "client sent no token" (normal — logged-out visitor) from
    // "client sent a Bearer token that Clerk could not verify". The latter is
    // almost always a *configuration* fault, not a user fault: most commonly
    // CLERK_SECRET_KEY here belonging to a different Clerk instance than the
    // publishable key the frontend was built with, so every token the frontend
    // mints is structurally unverifiable. That presents to users as a login
    // loop, so it is worth calling out loudly and specifically rather than
    // burying it in a generic 401.
    const hasBearer = (req.headers.authorization || '').startsWith('Bearer ');
    if (hasBearer) {
      logger.error(
        { path: req.path },
        '[auth] a Bearer token was supplied but Clerk could not verify it — ' +
        'check that CLERK_SECRET_KEY belongs to the SAME Clerk instance as the ' +
        "frontend's VITE_CLERK_PUBLISHABLE_KEY (mismatched instances cause a login loop)"
      );
    } else {
      logger.debug({ path: req.path }, '[auth] no Clerk session token on request');
    }
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
