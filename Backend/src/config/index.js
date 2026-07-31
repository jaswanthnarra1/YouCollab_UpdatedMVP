const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('FATAL: CLERK_SECRET_KEY must be set. Auth cannot function without it.');
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  CLERK: {
    SECRET_KEY: process.env.CLERK_SECRET_KEY,
    PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  },

  SUPABASE: {
    URL: process.env.SUPABASE_URL,
    KEY: process.env.SUPABASE_KEY,
    ANON_KEY: process.env.SUPABASE_KEY, // Alias for clarity
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  DATABASE_URL: process.env.DATABASE_URL,

  // Gig lifecycle. Duration lives here (not inline in the insert) so it can be
  // tuned without a schema change or a code edit at the call site.
  GIG: {
    VALIDITY_DAYS: parseInt(process.env.GIG_VALIDITY_DAYS) || 14,
    // How often the background sweep flips lapsed ACTIVE gigs to EXPIRED.
    EXPIRY_SWEEP_MINUTES: parseInt(process.env.GIG_EXPIRY_SWEEP_MINUTES) || 15,
  },

  UPLOAD: {
    DIR: path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
    MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },

  EMAIL: {
    GMAIL_USER: process.env.GMAIL_USER || '',
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '',
    FROM_NAME: process.env.EMAIL_FROM_NAME || 'YouCollab',
  },


  INSTAGRAM: {
    APP_ID: process.env.INSTAGRAM_APP_ID,
    APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
    REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:8080/instagram/callback',
    // Proactive refresh threshold and background sweep cadence — same
    // "sweep + enforce on read" pattern as GIG.EXPIRY_SWEEP_MINUTES.
    REFRESH_BEFORE_EXPIRY_DAYS: parseInt(process.env.INSTAGRAM_REFRESH_BEFORE_EXPIRY_DAYS) || 7,
    REFRESH_SWEEP_HOURS: parseInt(process.env.INSTAGRAM_REFRESH_SWEEP_HOURS) || 24,
  },

  // 32-byte (64 hex char) key for AES-256-GCM encryption of stored Instagram
  // access tokens — see Backend/src/utils/crypto.js. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,

  // Bump (or override via env, for a same-day forced reacceptance without a
  // deploy) whenever Frontend/src/features/auth/termsContent.ts changes —
  // every user whose stored terms_version differs gets sent back through
  // the acceptance screen. See authService.acceptTerms().
  TERMS: {
    VERSION: process.env.TERMS_VERSION || '2026-07',
  },
};
