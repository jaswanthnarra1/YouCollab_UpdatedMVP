/**
 * YouCollab — Centralized Supabase Client
 * ========================================
 * Two clients for different use cases:
 *   • supabase      → Anon key, respects Row Level Security (user-scoped queries)
 *   • supabaseAdmin → Service role key, bypasses RLS (server-side admin operations)
 *
 * Usage:
 *   const { supabase, supabaseAdmin } = require('../supabase/client');
 */

const { createClient } = require('@supabase/supabase-js');

// ─── Environment Validation ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Missing SUPABASE_URL or SUPABASE_KEY in environment variables.\n' +
    '   → Check your Backend/.env file and ensure both are set.'
  );
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️  SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations (bypassing RLS) will fail.\n' +
    '   → Find it in Supabase Dashboard → Settings → API → service_role key.'
  );
}

// ─── Anon Client (respects RLS) ────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ─── Admin Client (bypasses RLS) ───────────────────────────────────────
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Health check — verifies connectivity to Supabase.
 * @returns {Promise<{ ok: boolean, latencyMs: number, error?: string }>}
 */
const healthCheck = async () => {
  const start = Date.now();
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    const latencyMs = Date.now() - start;
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  healthCheck,
};
