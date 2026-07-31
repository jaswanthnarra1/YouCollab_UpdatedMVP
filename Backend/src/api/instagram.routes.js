/**
 * YouCollab — Instagram Routes
 * ==============================
 * All routes require authentication and the INFLUENCER role.
 *
 * GET    /api/instagram/connect     → Returns Meta OAuth URL + signed state
 * GET    /api/instagram/callback    → Completes OAuth flow (code exchange)
 * GET    /api/instagram/status      → Cheap connection check (no profile payload)
 * GET    /api/instagram/profile     → Returns cached IG profile from DB
 * POST   /api/instagram/sync        → Triggers fresh sync from Graph API
 * POST   /api/instagram/refresh     → Refreshes the access token only
 * DELETE /api/instagram/disconnect  → Disconnects the IG account
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { instagramLimiter } = require('../middleware/rateLimiter');
const igController = require('../controllers/instagram.controller');

const router = express.Router();

// All Instagram endpoints require an authenticated INFLUENCER
router.use(authenticate, requireRole('INFLUENCER'));

// Rate-limited: these hit Meta's OAuth/Graph API directly and are the
// endpoints most worth protecting against retry storms or abuse.
router.get('/connect', instagramLimiter, igController.getConnectUrl);
router.get('/callback', instagramLimiter, igController.handleCallback);
router.post('/sync', instagramLimiter, igController.syncData);
router.post('/refresh', instagramLimiter, igController.refreshToken);

router.get('/status', igController.getStatus);
router.get('/profile', igController.getProfile);
router.delete('/disconnect', igController.disconnect);

module.exports = router;
