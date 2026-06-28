/**
 * Test generateLink for recovery
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testRecovery() {
  const email = `test-recovery-${Date.now()}@example.com`;
  console.log('Creating user...');
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true, // confirmed user
  });

  if (createError) {
    console.error('Create user error:', createError);
    return;
  }
  console.log('User created:', user.user.id);

  console.log('Generating recovery link...');
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
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

testRecovery().catch(console.error);
