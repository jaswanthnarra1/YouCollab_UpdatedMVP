/**
 * YouCollab — Crypto Utilities
 * ==============================
 * Symmetric encryption for secrets-at-rest (e.g. Instagram access tokens) and
 * a stateless, signed CSRF token for OAuth `state` params. Node's built-in
 * `crypto` only — no new dependency for either concern.
 */

const crypto = require('crypto');
const config = require('../config');
const AppError = require('./AppError');

// ─── Token-at-rest encryption (AES-256-GCM) ────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended nonce length for GCM

/** Lazily validated — a misconfigured key only breaks the features that need
 *  it, not the whole process (unlike CLERK_SECRET_KEY, which every request
 *  needs and so fails fast at boot in config/index.js). */
const getKey = () => {
  const raw = config.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    throw new AppError(
      'Server misconfigured: TOKEN_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes).',
      500,
      'CONFIG_ERROR'
    );
  }
  return Buffer.from(raw, 'hex');
};

/**
 * Encrypt a plaintext secret for storage. Output format: `iv:authTag:ciphertext`,
 * each hex-encoded, joined with `:` — self-describing, safe to store as a single TEXT column.
 */
const encryptSecret = (plaintext) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(':');
};

/**
 * Decrypt a value produced by encryptSecret(). Throws AppError on tampering
 * (GCM auth tag mismatch) or a malformed stored value.
 */
const decryptSecret = (stored) => {
  const key = getKey();
  const parts = String(stored).split(':');
  if (parts.length !== 3) {
    throw new AppError('Stored secret is not in the expected encrypted format.', 500, 'DECRYPTION_ERROR');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    throw new AppError('Failed to decrypt stored secret — it may have been tampered with.', 500, 'DECRYPTION_ERROR');
  }
};

// ─── Stateless signed OAuth state (CSRF protection) ────────────────────────
// No server-side session/store needed: the state itself carries the user id
// and an expiry, signed with an HMAC the server can recompute and compare.

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete the OAuth round-trip

/** Sign a CSRF state token binding this OAuth attempt to `userId`. */
const signOAuthState = (userId, secret) => {
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
};

/**
 * Verify a CSRF state token was issued for `userId`, unexpired, and unmodified.
 * Returns true/false rather than throwing — callers decide how to surface the failure.
 */
const verifyOAuthState = (state, userId, secret) => {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const [uid, expiresAtStr, signature] = decoded.split('.');
    if (!uid || !expiresAtStr || !signature) return false;

    const expected = crypto.createHmac('sha256', secret).update(`${uid}.${expiresAtStr}`).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

    if (uid !== userId) return false;
    if (Date.now() > Number(expiresAtStr)) return false;

    return true;
  } catch {
    return false;
  }
};

module.exports = { encryptSecret, decryptSecret, signOAuthState, verifyOAuthState };
