/**
 * Test script to diagnose Supabase Auth signup + OTP email delivery.
 * Run: node Backend/scratch/test-supabase-auth.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Supabase Auth Diagnostic ===');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_KEY:', SUPABASE_KEY ? `${SUPABASE_KEY.slice(0, 20)}...` : 'MISSING');
console.log('SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? `${SUPABASE_SERVICE_ROLE_KEY.slice(0, 20)}...` : 'MISSING');
console.log('');

// Anon client (same as the app uses)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

// Admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const TEST_EMAIL = `test-${Date.now()}@youcollab-test.com`;
const TEST_PASSWORD = 'TestPass123!';

async function runDiagnostics() {
  // Test 1: Check connectivity
  console.log('--- Test 1: Database Connectivity ---');
  const { data: connTest, error: connErr } = await supabaseAnon.from('users').select('id').limit(1);
  if (connErr) {
    console.error('FAIL: Cannot connect to database:', connErr.message);
  } else {
    console.log('PASS: Database connected. Found', connTest?.length || 0, 'users');
  }
  console.log('');

  // Test 2: List existing auth users (admin only)
  console.log('--- Test 2: Admin Auth User List ---');
  try {
    const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      console.error('FAIL: Admin listUsers error:', listErr.message);
    } else {
      console.log('PASS: Admin can list users. Count:', listData?.users?.length || 0);
      if (listData?.users?.length > 0) {
        console.log('  First user email:', listData.users[0].email);
        console.log('  First user confirmed:', listData.users[0].email_confirmed_at ? 'YES' : 'NO');
      }
    }
  } catch (e) {
    console.error('FAIL: Admin listUsers threw:', e.message);
  }
  console.log('');

  // Test 3: Try signUp with anon client (this is what the app does)
  console.log('--- Test 3: Anon signUp (triggers email OTP) ---');
  console.log('  Email:', TEST_EMAIL);
  const { data: signUpData, error: signUpErr } = await supabaseAnon.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: {
      data: { name: 'Test User', role: 'INFLUENCER' }
    }
  });
  if (signUpErr) {
    console.error('FAIL: signUp error:', signUpErr.message);
    console.error('  Status:', signUpErr.status);
    console.error('  Full error:', JSON.stringify(signUpErr, null, 2));
  } else {
    console.log('PASS: signUp succeeded');
    console.log('  User ID:', signUpData?.user?.id);
    console.log('  Email confirmed:', signUpData?.user?.email_confirmed_at ? 'YES' : 'NO');
    console.log('  Session:', signUpData?.session ? 'PRESENT' : 'NULL (email needs verification)');
    console.log('  Identities:', signUpData?.user?.identities?.length || 0);
    
    // If identities is empty, user already exists
    if (signUpData?.user?.identities?.length === 0) {
      console.log('  WARNING: Empty identities means this email already exists in auth.users');
    }
  }
  console.log('');

  // Test 4: Try admin createUser (bypasses email)
  console.log('--- Test 4: Admin createUser (no email needed) ---');
  const adminTestEmail = `admin-test-${Date.now()}@youcollab-test.com`;
  try {
    const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminTestEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Admin Test', role: 'INFLUENCER' }
    });
    if (adminErr) {
      console.error('FAIL: Admin createUser error:', adminErr.message);
    } else {
      console.log('PASS: Admin createUser succeeded');
      console.log('  User ID:', adminData?.user?.id);
      console.log('  Email confirmed:', adminData?.user?.email_confirmed_at ? 'YES' : 'NO');
      
      // Clean up test user
      if (adminData?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(adminData.user.id);
        console.log('  Cleaned up admin test user');
      }
    }
  } catch (e) {
    console.error('FAIL: Admin createUser threw:', e.message);
  }
  console.log('');

  // Test 5: Check Supabase auth settings
  console.log('--- Test 5: Auth Settings Check ---');
  console.log('  The "Error sending confirmation email" error occurs when:');
  console.log('  1. Supabase SMTP is not configured (uses built-in which has rate limits)');
  console.log('  2. Email provider rejects the sender domain');
  console.log('  3. The email template has errors');
  console.log('  4. Supabase rate-limits free tier email sends (3/hour default)');
  console.log('');
  console.log('  SOLUTION: Use admin.createUser() + admin.generateLink() for email OTP');
  console.log('  This bypasses Supabase native email and lets us send via Resend directly');
  console.log('');
  
  // Clean up test user from Test 3
  if (signUpData?.user?.id) {
    console.log('--- Cleanup ---');
    await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id);
    console.log('Cleaned up anon test user');
  }

  console.log('');
  console.log('=== Diagnostic Complete ===');
}

runDiagnostics().catch(err => {
  console.error('Diagnostic script failed:', err);
  process.exit(1);
});
