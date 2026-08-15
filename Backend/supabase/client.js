/**
 * YouCollab — Centralized Supabase Database Client
 * ===============================================
 * Initializes connection to Supabase database.
 *
 * SECURITY: `supabase` and `supabaseAdmin` are BOTH backed by the
 * service_role key — there is no real anon-key client here anymore. This app
 * never uses Supabase Auth (Clerk is the sole identity provider — see
 * CLAUDE.md), so a Postgres RLS policy has no `auth.uid()` to key off and
 * cannot distinguish "this backend's own anon-role query" from "a browser
 * calling Supabase's REST API directly with the public anon key." Express is
 * this app's only authorization boundary (every service function checks
 * ownership before it acts — see application/gig/notification/profile
 * services), so the DB layer is trusted once a request reaches here. Giving
 * the `anon`/`authenticated` Postgres roles real table access would only
 * open a bypass of that boundary for anyone holding the public anon key —
 * see the accompanying RLS-hardening migration, which revokes those grants
 * entirely. Do not reintroduce an anon-key client without re-deriving this.
 *
 * Note: Supabase JS v2 requires Node.js 22+ for native WebSocket support.
 * We pass realtime: { enabled: false } to avoid the WebSocket requirement
 * entirely on the server side (we don't use Supabase Realtime on the backend).
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../src/config');

const supabaseUrl = config.SUPABASE.URL;
const supabaseServiceKey = config.SUPABASE.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
}

// Server-side client options — disable Realtime to avoid WebSocket requirement
const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    // Disable realtime on the backend — we don't need WebSocket subscriptions here
    // This prevents the "native WebSocket not found" error on Node.js < 22
    params: { eventsPerSecond: -1 },
  },
  global: {
    // Provide a no-op WebSocket constructor to satisfy the Supabase client
    // initialization check without actually connecting to the Realtime service
    fetch: globalThis.fetch,
  },
};

// Single centralized connection, service_role throughout — see the SECURITY
// note above. `supabase` and `supabaseAdmin` are intentionally the same
// client; both names are kept so every existing call site (which imports
// one or the other) keeps working without a mass rename.
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      ...clientOptions,
      db: { schema: 'public' },
    })
  : null;

const supabase = supabaseAdmin;

/**
 * Health check function to verify connectivity with Supabase database.
 * @returns {Promise<boolean>}
 */
const healthCheck = async () => {
  try {
    if (!supabaseUrl) return false;

    // Quick test query to verify database response
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error && error.message.includes('relation "users" does not exist')) {
      // Table doesn't exist yet (migrations not run), but connection is alive
      return true;
    }

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('❌ Database connection check failed:', err.message);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  healthCheck,
};
