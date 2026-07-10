const asyncHandler = require('../utils/asyncHandler');

/**
 * Pre-flight captcha check for flows Clerk owns client-side (login, signup,
 * forgot-password) — by the time this responds 200, the verifyCaptcha
 * middleware has already confirmed the token with Google.
 */
const verify = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { message: 'Captcha verified.' },
  });
});

module.exports = { verify };
