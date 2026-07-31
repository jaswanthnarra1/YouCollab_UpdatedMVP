/**
 * YouCollab — Instagram Controller
 * ==================================
 * Handles HTTP request/response for Instagram Graph API integration.
 * Delegates all business logic to instagram.service.js.
 */

const igService = require('../services/instagram.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * GET /api/instagram/connect
 * Returns the Meta OAuth authorization URL + a signed CSRF state token
 * bound to the requesting user (verified on callback).
 */
const getConnectUrl = asyncHandler(async (req, res) => {
  const { url, state } = igService.getOAuthUrl(req.user.id);

  res.status(200).json({
    success: true,
    data: { url, state },
  });
});

/**
 * GET /api/instagram/callback
 * Receives `code` and `state` from Meta OAuth redirect (proxied from frontend).
 * Validates state, exchanges code for tokens, fetches profile, and saves to DB.
 */
const handleCallback = asyncHandler(async (req, res) => {
  const { code, state, error: oauthError, error_reason: errorReason } = req.query;

  // User declined on Meta's consent screen, or Meta itself reported a problem —
  // both arrive as query params on the redirect rather than a thrown exception.
  if (oauthError) {
    logger.info({ userId: req.user.id, oauthError, errorReason }, '[instagram] OAuth declined/cancelled');
    throw new AppError(
      errorReason === 'user_denied' ? 'You cancelled the Instagram connection.' : 'Instagram authorization failed.',
      400,
      'INSTAGRAM_OAUTH_CANCELLED'
    );
  }

  if (!code) {
    throw new AppError('Missing authorization code from Instagram.', 400, 'INSTAGRAM_MISSING_CODE');
  }

  if (!state || !igService.verifyState(state, req.user.id)) {
    logger.warn({ userId: req.user.id }, '[instagram] OAuth state validation failed');
    throw new AppError(
      'This connection request expired or could not be verified. Please try connecting again.',
      400,
      'INSTAGRAM_STATE_INVALID'
    );
  }

  const influencer = await igService.connectInstagram(req.user.id, code);

  res.status(200).json({
    success: true,
    data: {
      message: `Instagram connected successfully! Welcome, @${influencer.igUsername} 🎉`,
      instagram: {
        username: influencer.igUsername,
        profilePicUrl: influencer.igProfilePicUrl,
        followersCount: influencer.igFollowersCount,
        followingCount: influencer.igFollowingCount,
        mediaCount: influencer.igMediaCount,
        bio: influencer.igBio,
        accountType: influencer.igAccountType,
        connectedAt: influencer.igConnectedAt,
        isVerified: influencer.isIgVerified,
      },
    },
  });
});

/**
 * GET /api/instagram/status
 * Cheap connection check — no full profile payload, for gating checks.
 */
const getStatus = asyncHandler(async (req, res) => {
  const status = await igService.getIgStatus(req.user.id);

  res.status(200).json({ success: true, data: status });
});

/**
 * GET /api/instagram/profile
 * Returns cached Instagram profile data from the DB (no API call).
 */
const getProfile = asyncHandler(async (req, res) => {
  const profile = await igService.getIgProfileFromDb(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      instagram: profile
        ? {
            isConnected: profile.isIgVerified,
            username: profile.igUsername,
            userId: profile.igUserId,
            profilePicUrl: profile.igProfilePicUrl,
            bio: profile.igBio,
            followersCount: profile.igFollowersCount,
            followingCount: profile.igFollowingCount,
            mediaCount: profile.igMediaCount,
            accountType: profile.igAccountType,
            permissionsGranted: profile.igPermissionsGranted,
            connectionStatus: profile.igConnectionStatus,
            connectedAt: profile.igConnectedAt,
            lastSyncAt: profile.igLastSyncAt,
            lastRefreshAt: profile.igLastRefreshAt,
            tokenExpiresAt: profile.igTokenExpiresAt,
          }
        : { isConnected: false },
    },
  });
});

/**
 * POST /api/instagram/sync
 * Triggers a fresh sync from the Instagram Graph API.
 * Also proactively refreshes the access token if it's within the expiry window.
 */
const syncData = asyncHandler(async (req, res) => {
  const updated = await igService.syncInfluencerIgData(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      message: 'Instagram data synced successfully ✅',
      instagram: {
        isConnected: updated.isIgVerified,
        username: updated.igUsername,
        profilePicUrl: updated.igProfilePicUrl,
        bio: updated.igBio,
        followersCount: updated.igFollowersCount,
        followingCount: updated.igFollowingCount,
        mediaCount: updated.igMediaCount,
        accountType: updated.igAccountType,
        connectionStatus: updated.igConnectionStatus,
        lastSyncAt: updated.igLastSyncAt,
      },
    },
  });
});

/**
 * POST /api/instagram/refresh
 * Refreshes the stored access token only (no profile re-fetch) — lighter
 * than /sync for callers that just need the connection kept alive.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const updated = await igService.refreshTokenOnly(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      message: 'Instagram token refreshed.',
      tokenExpiresAt: updated.igTokenExpiresAt,
      lastRefreshAt: updated.igLastRefreshAt,
      connectionStatus: updated.igConnectionStatus,
    },
  });
});

/**
 * DELETE /api/instagram/disconnect
 * Clears all Instagram fields from the influencer profile.
 */
const disconnect = asyncHandler(async (req, res) => {
  await igService.disconnectIg(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      message: 'Instagram account disconnected successfully.',
    },
  });
});

module.exports = {
  getConnectUrl,
  handleCallback,
  getStatus,
  getProfile,
  syncData,
  refreshToken,
  disconnect,
};
