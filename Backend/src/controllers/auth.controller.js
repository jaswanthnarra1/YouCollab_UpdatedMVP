const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

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
  me,
  deleteAccount,
  updatePreferences,
};
