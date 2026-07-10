const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // limit each IP to 15 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('Whoa, slow down! Too many login or signup attempts. Try again in 10 minutes.', 429, 'RATE_LIMITED'));
  },
});

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

module.exports = {
  authLimiter,
  generalLimiter,
  contactLimiter,
};
