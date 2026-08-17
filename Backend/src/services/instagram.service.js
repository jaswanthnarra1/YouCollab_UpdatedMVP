/**
 * YouCollab — Instagram Graph API Service
 * ========================================
 * Handles all communication with Meta's Instagram Graph API:
 *  - OAuth URL generation + stateless signed CSRF state
 *  - Token exchange (short-lived → long-lived), encrypted at rest
 *  - Token refresh (on-demand and via the scheduled sweep)
 *  - Profile & metrics fetching
 *  - DB sync and disconnect
 */

const https = require('https');
const supabase = require('./supabase');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { encryptSecret, decryptSecret, signOAuthState, verifyOAuthState } = require('../utils/crypto');

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAPH_API_BASE = 'https://graph.instagram.com';
// Instagram OAuth authorize endpoint (for Business/Creator accounts via Instagram Business Login)
const META_AUTH_BASE = 'https://www.instagram.com/oauth/authorize';
const META_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const META_LONG_TOKEN_URL = `${GRAPH_API_BASE}/access_token`;
const META_REFRESH_URL = `${GRAPH_API_BASE}/refresh_access_token`;

// Scopes for Instagram Business/Creator OAuth (do NOT mix with Facebook scopes
// here). V1 scope is intentionally minimal — `instagram_business_basic` alone
// covers everything this integration needs (username, follower count, account
// type via graph.instagram.com/me). No insights/messaging/publishing/comments
// scope is requested; adding one later means a fresh Meta App Review, not a
// silent scope creep.
const INSTAGRAM_SCOPES = ['instagram_business_basic'].join(',');

// Only Professional (Business or Creator) accounts are supported — Meta no
// longer supports Personal-account API access, and the product itself
// depends on follower/media metrics a Personal account doesn't expose.
const SUPPORTED_ACCOUNT_TYPES = ['BUSINESS', 'MEDIA_CREATOR'];

const SELECT_FIELDS =
  'id, igUserId, igUsername, igName, igAccessToken, igTokenExpiresAt, igConnectedAt, isIgVerified, ' +
  'igProfilePicUrl, igBio, igFollowersCount, igFollowingCount, igMediaCount, igLastSyncAt, ' +
  'igAccountType, igPermissionsGranted, igConnectionStatus, igLastRefreshAt';

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

/**
 * Tiny fetch wrapper using Node built-in https for Meta Graph API calls.
 * @param {string} url
 * @returns {Promise<object>}
 */
const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new AppError(parsed.error.message || 'Instagram API error.', 502, 'INSTAGRAM_API_ERROR'));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new AppError('Failed to parse Instagram API response.', 502, 'INSTAGRAM_PARSE_ERROR'));
        }
      });
    }).on('error', (err) => {
      reject(new AppError(`Instagram API network error: ${err.message}`, 502, 'INSTAGRAM_NETWORK_ERROR'));
    });
  });
};

/**
 * POST helper for token exchange endpoints (form-encoded).
 * @param {string} url
 * @param {object} params
 * @returns {Promise<object>}
 */
const postForm = (url, params) => {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new AppError(parsed.error.message || 'Instagram token error.', 502, 'INSTAGRAM_TOKEN_ERROR'));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new AppError('Failed to parse Instagram token response.', 502, 'INSTAGRAM_PARSE_ERROR'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new AppError(`Instagram token request error: ${err.message}`, 502, 'INSTAGRAM_NETWORK_ERROR'));
    });

    req.write(body);
    req.end();
  });
};

// ─── OAuth URL + CSRF state ─────────────────────────────────────────────────

/**
 * Build the Meta OAuth authorization URL, with a stateless signed `state`
 * param binding this attempt to `userId` (verified on callback — see
 * verifyState below). No server-side session/store needed.
 * @param {string} userId - YouCollab user ID initiating the connect flow
 * @returns {{ url: string, state: string }}
 */
const getOAuthUrl = (userId, customRedirectUri = null) => {
  const redirectUri = customRedirectUri || config.INSTAGRAM.REDIRECT_URI;
  const state = signOAuthState(userId, config.INSTAGRAM.APP_SECRET);
  const params = new URLSearchParams({
    client_id: config.INSTAGRAM.APP_ID,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_SCOPES,
    response_type: 'code',
    state,
  });
  return { url: `${META_AUTH_BASE}?${params.toString()}`, state, redirectUri };
};

/**
 * Verify a callback's `state` was genuinely issued for `userId` and hasn't expired or been tampered with.
 * @param {string} state
 * @param {string} userId
 * @returns {boolean}
 */
const verifyState = (state, userId) => verifyOAuthState(state, userId, config.INSTAGRAM.APP_SECRET);

// ─── Token Exchange ───────────────────────────────────────────────────────────

/**
 * Exchange the authorization code from the OAuth callback for a short-lived token.
 * @param {string} code
 * @param {string} [customRedirectUri]
 * @returns {Promise<{ access_token: string, user_id: string, permissions?: string[] }>}
 */
const exchangeCodeForToken = async (code, customRedirectUri = null) => {
  const redirectUri = customRedirectUri || config.INSTAGRAM.REDIRECT_URI;
  const result = await postForm(META_TOKEN_URL, {
    client_id: config.INSTAGRAM.APP_ID,
    client_secret: config.INSTAGRAM.APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });

  if (!result.access_token) {
    throw new AppError('Failed to obtain Instagram access token.', 502, 'INSTAGRAM_TOKEN_ERROR');
  }

  return result; // { access_token, user_id, permissions? }
};

/**
 * Exchange a short-lived token (1h) for a long-lived token (60 days).
 * @param {string} shortLivedToken
 * @returns {Promise<{ access_token: string, token_type: string, expires_in: number }>}
 */
const getLongLivedToken = async (shortLivedToken) => {
  const url = `${META_LONG_TOKEN_URL}?grant_type=ig_exchange_token&client_secret=${config.INSTAGRAM.APP_SECRET}&access_token=${shortLivedToken}`;
  const result = await fetchJson(url);

  if (!result.access_token) {
    throw new AppError('Failed to obtain long-lived Instagram token.', 502, 'INSTAGRAM_TOKEN_ERROR');
  }

  return result; // { access_token, token_type, expires_in }
};

/**
 * Refresh an existing long-lived token before it expires.
 * Long-lived tokens can only be refreshed if they are at least 24h old.
 * @param {string} existingToken
 * @returns {Promise<{ access_token: string, expires_in: number }>}
 */
const refreshLongLivedToken = async (existingToken) => {
  const url = `${META_REFRESH_URL}?grant_type=ig_refresh_token&access_token=${existingToken}`;
  const result = await fetchJson(url);

  if (!result.access_token) {
    throw new AppError('Failed to refresh Instagram token.', 502, 'INSTAGRAM_TOKEN_ERROR');
  }

  return result;
};

// ─── Profile Fetching ─────────────────────────────────────────────────────────

/**
 * Fetch Instagram profile data from the Graph API.
 * @param {string} accessToken
 * @returns {Promise<object>} Raw API profile response
 */
const fetchIgProfile = async (accessToken) => {
  const fields = [
    'id',
    'name',
    'username',
    'biography',
    'followers_count',
    'follows_count',
    'media_count',
    'profile_picture_url',
    'account_type',
  ].join(',');

  const url = `${GRAPH_API_BASE}/me?fields=${fields}&access_token=${accessToken}`;
  const profile = await fetchJson(url);

  return profile;
};

/** Reject Personal accounts up front — Meta no longer supports Personal-account API access, and this app needs follower/media metrics only Professional accounts expose. */
const assertProfessionalAccount = (profile) => {
  if (!SUPPORTED_ACCOUNT_TYPES.includes(profile.account_type)) {
    throw new AppError(
      'You need an Instagram Professional account (Business or Creator) to connect Instagram to You Collab. ' +
      'In the Instagram app: Settings → Account type and tools → Switch to professional account.',
      400,
      'INSTAGRAM_PERSONAL_ACCOUNT_NOT_SUPPORTED'
    );
  }
};

// ─── DB Sync ──────────────────────────────────────────────────────────────────

/**
 * Full sync: fetch latest profile data from API and update the influencer row.
 * Also proactively refreshes the token if expiring within the configured window.
 * @param {string} userId - YouCollab user ID
 * @returns {Promise<object>} Updated influencer record
 */
const syncInfluencerIgData = async (userId) => {
  const { data: influencer, error: fetchErr } = await supabase
    .from('influencers')
    .select(SELECT_FIELDS)
    .eq('userId', userId)
    .maybeSingle();

  if (fetchErr || !influencer) {
    throw new AppError('Influencer profile not found.', 404, 'NOT_FOUND');
  }

  if (!influencer.isIgVerified || !influencer.igAccessToken) {
    throw new AppError('Instagram account is not connected.', 400, 'INSTAGRAM_NOT_CONNECTED');
  }

  let activeToken = decryptSecret(influencer.igAccessToken);
  const refreshUpdate = await maybeRefreshToken(userId, activeToken, influencer.igTokenExpiresAt);
  if (refreshUpdate) activeToken = refreshUpdate.plaintextToken;

  const profile = await fetchIgProfile(activeToken);
  const igLastSyncAt = new Date().toISOString();

  const updatePayload = {
    igUserId: profile.id,
    igUsername: profile.username,
    igName: profile.name || null,
    // Mirror into the legacy creator-profile columns, which are what the rest
    // of the app reads: brand-facing creator cards and follower-range
    // filtering. Meta is the only writer of these now (users can no longer
    // edit them), so mirroring here keeps every existing consumer correct.
    instagramHandle: profile.username,
    followerCount: profile.followers_count ?? 0,
    igProfilePicUrl: profile.profile_picture_url || null,
    igBio: profile.biography || null,
    igFollowersCount: profile.followers_count ?? null,
    igFollowingCount: profile.follows_count ?? null,
    igMediaCount: profile.media_count ?? null,
    igAccountType: profile.account_type || null,
    igLastSyncAt,
  };

  const { data: updated, error: updateErr } = await supabase
    .from('influencers')
    .update(updatePayload)
    .eq('userId', userId)
    .select()
    .single();

  if (updateErr) {
    throw new AppError('Failed to sync Instagram data.', 500, 'DATABASE_ERROR');
  }

  logger.info({ userId, igUsername: updated.igUsername }, '[instagram] profile synced');
  return updated;
};

/**
 * Refresh `activeToken` in place (DB + return value) if it's within the
 * configured expiry window. Shared by syncInfluencerIgData, the dedicated
 * /refresh endpoint, and the scheduled sweep. Never throws — a refresh
 * failure here is non-fatal to whatever the caller was actually doing
 * (sync/profile fetch can still proceed on the still-valid current token).
 * @returns {Promise<{ plaintextToken: string, expiresAt: string } | null>} null when no refresh was needed/attempted
 */
const maybeRefreshToken = async (userId, plaintextToken, currentExpiresAt) => {
  if (!currentExpiresAt) return null;
  const daysLeft = (new Date(currentExpiresAt) - new Date()) / (1000 * 60 * 60 * 24);
  if (daysLeft >= config.INSTAGRAM.REFRESH_BEFORE_EXPIRY_DAYS) return null;

  try {
    const refreshed = await refreshLongLivedToken(plaintextToken);
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshed.expires_in);
    const now = new Date().toISOString();

    await supabase
      .from('influencers')
      .update({
        igAccessToken: encryptSecret(refreshed.access_token),
        igTokenExpiresAt: newExpiresAt.toISOString(),
        igLastRefreshAt: now,
        igConnectionStatus: 'CONNECTED',
      })
      .eq('userId', userId);

    logger.info({ userId, expiresAt: newExpiresAt.toISOString() }, '[instagram] token refreshed');
    return { plaintextToken: refreshed.access_token, expiresAt: newExpiresAt.toISOString() };
  } catch (refreshErr) {
    logger.warn({ userId, err: refreshErr.message }, '[instagram] token refresh failed');
    return null;
  }
};

/**
 * Explicit refresh-only endpoint — refreshes the token without a full profile re-fetch.
 * Throws if the account isn't connected or the refresh genuinely fails (unlike the
 * best-effort maybeRefreshToken used inline during sync).
 * @param {string} userId
 */
const refreshTokenOnly = async (userId) => {
  const { data: influencer, error } = await supabase
    .from('influencers')
    .select('igAccessToken, isIgVerified')
    .eq('userId', userId)
    .maybeSingle();

  if (error || !influencer?.isIgVerified || !influencer.igAccessToken) {
    throw new AppError('Instagram account is not connected.', 400, 'INSTAGRAM_NOT_CONNECTED');
  }

  const plaintextToken = decryptSecret(influencer.igAccessToken);

  try {
    const refreshed = await refreshLongLivedToken(plaintextToken);
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshed.expires_in);
    const now = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from('influencers')
      .update({
        igAccessToken: encryptSecret(refreshed.access_token),
        igTokenExpiresAt: newExpiresAt.toISOString(),
        igLastRefreshAt: now,
        igConnectionStatus: 'CONNECTED',
      })
      .eq('userId', userId)
      .select('igTokenExpiresAt, igLastRefreshAt, igConnectionStatus')
      .single();

    if (updateErr) throw new AppError('Failed to store refreshed token.', 500, 'DATABASE_ERROR');

    logger.info({ userId }, '[instagram] manual token refresh succeeded');
    return updated;
  } catch (err) {
    logger.error({ userId, err: err.message }, '[instagram] manual token refresh failed');
    if (err instanceof AppError) throw err;
    throw new AppError('Failed to refresh Instagram token. Try reconnecting your account.', 502, 'INSTAGRAM_TOKEN_ERROR');
  }
};

/**
 * Scheduled sweep (see jobs/scheduler.js): refreshes every CONNECTED account's
 * token if it's within the expiry window, with one retry on failure. Accounts
 * that fail both attempts are marked RECONNECT_REQUIRED so the dashboard can
 * surface a clear "reconnect" call to action instead of silently degrading.
 * @returns {Promise<{ checked: number, refreshed: number, reconnectRequired: number }>}
 */
const refreshExpiringTokens = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + config.INSTAGRAM.REFRESH_BEFORE_EXPIRY_DAYS);

  const { data: candidates, error } = await supabase
    .from('influencers')
    .select('userId, igAccessToken, igTokenExpiresAt')
    .eq('igConnectionStatus', 'CONNECTED')
    .not('igAccessToken', 'is', null)
    .lte('igTokenExpiresAt', cutoff.toISOString());

  if (error) {
    logger.error({ err: error.message }, '[instagram] refresh sweep: failed to load candidates');
    return { checked: 0, refreshed: 0, reconnectRequired: 0 };
  }

  let refreshed = 0;
  let reconnectRequired = 0;

  for (const row of candidates || []) {
    const plaintextToken = decryptSecret(row.igAccessToken);
    let ok = false;

    // One retry — Meta's refresh endpoint occasionally has transient blips.
    for (let attempt = 0; attempt < 2 && !ok; attempt += 1) {
      try {
        const refreshResult = await refreshLongLivedToken(plaintextToken);
        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshResult.expires_in);

        await supabase
          .from('influencers')
          .update({
            igAccessToken: encryptSecret(refreshResult.access_token),
            igTokenExpiresAt: newExpiresAt.toISOString(),
            igLastRefreshAt: new Date().toISOString(),
            igConnectionStatus: 'CONNECTED',
          })
          .eq('userId', row.userId);

        ok = true;
        refreshed += 1;
      } catch (err) {
        logger.warn({ userId: row.userId, attempt: attempt + 1, err: err.message }, '[instagram] sweep refresh attempt failed');
      }
    }

    if (!ok) {
      reconnectRequired += 1;
      await supabase
        .from('influencers')
        .update({ igConnectionStatus: 'RECONNECT_REQUIRED' })
        .eq('userId', row.userId);
      logger.error({ userId: row.userId }, '[instagram] token refresh permanently failed — marked RECONNECT_REQUIRED');
    }
  }

  return { checked: (candidates || []).length, refreshed, reconnectRequired };
};

// ─── Connect ──────────────────────────────────────────────────────────────────

/**
 * Complete the OAuth flow: exchange code → get long-lived token → fetch profile
 * (rejecting Personal accounts) → save to DB.
 * @param {string} userId - YouCollab user ID
 * @param {string} code - Authorization code from Meta callback
 * @returns {Promise<object>} Updated influencer record
 */
const connectInstagram = async (userId, code, customRedirectUri = null) => {
  const shortToken = await exchangeCodeForToken(code, customRedirectUri);
  const longToken = await getLongLivedToken(shortToken.access_token);

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + longToken.expires_in);

  const profile = await fetchIgProfile(longToken.access_token);
  assertProfessionalAccount(profile);

  const now = new Date().toISOString();
  const permissionsGranted = Array.isArray(shortToken.permissions) && shortToken.permissions.length
    ? shortToken.permissions.join(',')
    : INSTAGRAM_SCOPES;

  const updatePayload = {
    igUserId: profile.id,
    igUsername: profile.username,
    igName: profile.name || null,
    // Mirror into the legacy creator-profile columns, which are what the rest
    // of the app reads: brand-facing creator cards and follower-range
    // filtering. Meta is the only writer of these now (users can no longer
    // edit them), so mirroring here keeps every existing consumer correct.
    instagramHandle: profile.username,
    followerCount: profile.followers_count ?? 0,
    igAccessToken: encryptSecret(longToken.access_token),
    igTokenExpiresAt: expiresAt.toISOString(),
    igConnectedAt: now,
    isIgVerified: true,
    igProfilePicUrl: profile.profile_picture_url || null,
    igBio: profile.biography || null,
    igFollowersCount: profile.followers_count ?? null,
    igFollowingCount: profile.follows_count ?? null,
    igMediaCount: profile.media_count ?? null,
    igAccountType: profile.account_type,
    igPermissionsGranted: permissionsGranted,
    igConnectionStatus: 'CONNECTED',
    igLastSyncAt: now,
    igLastRefreshAt: now,
  };

  const { data: updated, error } = await supabase
    .from('influencers')
    .update(updatePayload)
    .eq('userId', userId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError(
        `This Instagram account (@${profile.username}) is already connected to another YouCollab profile. Disconnect it there first.`,
        409,
        'INSTAGRAM_ALREADY_LINKED'
      );
    }
    throw new AppError('Failed to save Instagram connection.', 500, 'DATABASE_ERROR');
  }

  logger.info({ userId, igUsername: updated.igUsername, accountType: profile.account_type }, '[instagram] account connected');
  return updated;
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

/**
 * Disconnect Instagram — nullifies all IG fields on the influencer row.
 * @param {string} userId - YouCollab user ID
 * @returns {Promise<void>}
 */
const disconnectIg = async (userId) => {
  const { error } = await supabase
    .from('influencers')
    .update({
      igUserId: null,
      igUsername: null,
      igName: null,
      // Clear the mirrored profile fields too, so a disconnected creator can't
      // keep showing a follower count (and its associated pricing tier) that
      // is no longer backed by a live, verified Instagram connection.
      instagramHandle: '',
      followerCount: 0,
      igAccessToken: null,
      igTokenExpiresAt: null,
      igConnectedAt: null,
      isIgVerified: false,
      igProfilePicUrl: null,
      igBio: null,
      igFollowersCount: null,
      igFollowingCount: null,
      igMediaCount: null,
      igAccountType: null,
      igPermissionsGranted: null,
      igConnectionStatus: 'DISCONNECTED',
      igLastSyncAt: null,
      igLastRefreshAt: null,
    })
    .eq('userId', userId);

  if (error) {
    throw new AppError('Failed to disconnect Instagram.', 500, 'DATABASE_ERROR');
  }

  logger.info({ userId }, '[instagram] account disconnected');
};

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Retrieve cached Instagram profile data from the DB (no API call). Never
 * returns the access token itself.
 * @param {string} userId - YouCollab user ID
 * @returns {Promise<object|null>}
 */
const getIgProfileFromDb = async (userId) => {
  const { data: influencer } = await supabase
    .from('influencers')
    .select(
      'isIgVerified, igUsername, igName, igUserId, igProfilePicUrl, igBio, igFollowersCount, igFollowingCount, ' +
      'igMediaCount, igConnectedAt, igLastSyncAt, igTokenExpiresAt, igAccountType, igPermissionsGranted, ' +
      'igConnectionStatus, igLastRefreshAt'
    )
    .eq('userId', userId)
    .maybeSingle();

  return influencer || null;
};

/** Lightweight connection check — no profile fields, for cheap gating checks. */
const getIgStatus = async (userId) => {
  const { data: influencer } = await supabase
    .from('influencers')
    .select('isIgVerified, igConnectionStatus')
    .eq('userId', userId)
    .maybeSingle();

  return {
    isConnected: influencer?.isIgVerified ?? false,
    connectionStatus: influencer?.igConnectionStatus ?? 'DISCONNECTED',
  };
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getOAuthUrl,
  verifyState,
  exchangeCodeForToken,
  getLongLivedToken,
  refreshLongLivedToken,
  fetchIgProfile,
  connectInstagram,
  syncInfluencerIgData,
  refreshTokenOnly,
  refreshExpiringTokens,
  disconnectIg,
  getIgProfileFromDb,
  getIgStatus,
};
