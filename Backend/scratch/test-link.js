/**
 * Test generateLink to see if it exposes the verification token/OTP
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testLink() {
  const email = `test-link-${Date.now()}@example.com`;
  console.log('Creating user...');
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: false,
  });

  if (createError) {
    console.error('Create user error:', createError);
    return;
  }
  console.log('User created:', user.user.id);

  console.log('Generating signup link...');
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
  });

  if (error) {
    console.error('generateLink error:', error);
  } else {
    console.log('generateLink result:', JSON.stringify(data, null, 2));
  }

  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(user.user.id);
}

testLink().catch(console.error);
