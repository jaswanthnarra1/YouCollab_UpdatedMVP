const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many requests from this device. Please rest a minute and try again.', 429, 'RATE_LIMITED'));
  },
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 messages per IP per window — generous for a real visitor, tight for spam
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many messages sent. Please try again in a bit.', 429, 'RATE_LIMITED'));
  },
});

const instagramLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // connect/callback hit Meta's API directly — generous for retries, tight against abuse
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Too many Instagram connection attempts. Please wait a few minutes and try again.', 429, 'RATE_LIMITED'));
  },
});

module.exports = {
  generalLimiter,
  contactLimiter,
  instagramLimiter,
};
