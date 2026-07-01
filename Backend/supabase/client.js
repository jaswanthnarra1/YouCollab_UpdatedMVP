/**
 * YouCollab — Centralized Supabase Database Client
 * ===============================================
 * Initializes connection to Supabase database.
 * Provides standard client (anon) and admin client (service_role).
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../src/config');

const supabaseUrl = config.SUPABASE.URL;
const supabaseKey = config.SUPABASE.KEY;
const supabaseServiceKey = config.SUPABASE.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_KEY is not defined in environment variables.');
}

// Client configuration with safe options for server-side
const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
};

// Centralized standard client connection
const supabase = createClient(supabaseUrl, supabaseKey, clientOptions);

// Centralized admin connection (service_role)
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, clientOptions)
  : null;

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
      // The relation does not exist yet (requires migrations to be run), but the connection itself is alive!
      return true;
    }
    
    if (error) {
      throw error;
    }
    
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
