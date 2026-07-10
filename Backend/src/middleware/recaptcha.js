const { verifyRecaptchaToken } = require('../services/recaptcha.service');
const AppError = require('../utils/AppError');

/**
 * Verifies req.body.captchaToken against Google before letting the request
 * continue. Applied directly to endpoints we own (e.g. /api/contact), and
 * to /api/recaptcha/verify — the pre-flight check the frontend calls in
 * front of Clerk-driven flows (login/signup/forgot-password), which never
 * hit this backend themselves.
 */
const verifyCaptcha = async (req, res, next) => {
  const { captchaToken } = req.body;

  if (!captchaToken || typeof captchaToken !== 'string') {
    return next(new AppError('Please complete the "I\'m not a robot" check.', 400, 'CAPTCHA_MISSING'));
  }

  try {
    const result = await verifyRecaptchaToken(captchaToken, req.ip);
    if (!result.success) {
      return next(new AppError('Captcha verification failed. Please try again.', 400, 'CAPTCHA_FAILED'));
    }
    next();
  } catch (error) {
    next(new AppError('Could not verify captcha right now. Please try again.', 502, 'CAPTCHA_SERVICE_ERROR'));
  }
};

module.exports = { verifyCaptcha };
