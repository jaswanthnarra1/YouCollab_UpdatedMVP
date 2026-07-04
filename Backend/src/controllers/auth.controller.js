const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');

// Cookie options helper
const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

/**
 * Register User controller.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const result = await authService.register(name, email, password, role);

  res.status(200).json({
    success: true,
    data: {
      message: 'Verification code sent to your email.',
      ...(result.dev_otp && { dev_otp: result.dev_otp }),
    },
  });
});

/**
 * Login User controller.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  // Set httpOnly refresh token cookie
  res.cookie(config.JWT.REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

/**
 * Refresh Tokens controller.
 */
const refresh = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies[config.JWT.REFRESH_COOKIE_NAME];

  const result = await authService.refreshToken(oldRefreshToken);

  // Set rotated refresh token cookie
  res.cookie(config.JWT.REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

/**
 * Logout User controller.
 */
const logout = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies[config.JWT.REFRESH_COOKIE_NAME];

  await authService.logout(oldRefreshToken);

  // Clear cookie
  res.clearCookie(config.JWT.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    data: {
      message: 'Signed out successfully. See you soon! 👋',
    },
  });
});

/**
 * Get Profile controller.
 */
const me = asyncHandler(async (req, res) => {
  const userProfile = await authService.getMe(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      user: userProfile,
    },
  });
});

/**
 * Forgot Password controller.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.requestPasswordReset(email);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Verify OTP controller.
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const result = await authService.verifyOtp(email, otp);

  // Set httpOnly refresh token cookie
  res.cookie(config.JWT.REFRESH_COOKIE_NAME, result.refreshToken, getCookieOptions());

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

/**
 * Resend OTP controller.
 */
const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await authService.resendOtp(email);

  res.status(200).json({
    success: true,
    data: {
      message: result.message,
      ...(result.dev_otp && { dev_otp: result.dev_otp }),
    },
  });
});

/**
 * Reset password controller.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  const result = await authService.resetPassword(email, otp, password);

  res.status(200).json({
    success: true,
    data: {
      message: result.message,
    },
  });
});

/**
 * Change password for the logged-in user.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user.id, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    data: { message: 'Password updated successfully.' },
  });
});

/**
 * Update email for the logged-in user.
 */
const updateEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await authService.updateEmail(req.user.id, email);

  res.status(200).json({
    success: true,
    data: { user, message: 'Email updated successfully.' },
  });
});

/**
 * Permanently delete the logged-in user's account.
 */
const deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user.id);

  res.status(200).json({
    success: true,
    data: { message: 'Account deleted permanently.' },
  });
});

/**
 * Update notification/privacy preferences for the logged-in user.
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const { notificationPrefs, privacyPrefs } = req.body;

  const updated = await authService.updatePreferences(req.user.id, { notificationPrefs, privacyPrefs });

  res.status(200).json({
    success: true,
    data: updated,
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
  changePassword,
  updateEmail,
  deleteAccount,
  updatePreferences,
};
