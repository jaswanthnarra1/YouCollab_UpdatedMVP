const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Middleware to authenticate requests via JWT access token.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Join YouCollab or sign in to view this.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.JWT.SECRET);
    req.user = {
      id: payload.id,
      role: payload.role,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Just refresh or sign in again.', 401, 'UNAUTHORIZED'));
    }
    return next(new AppError('Oops, your credentials look invalid. Try signing in again.', 401, 'UNAUTHORIZED'));
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
