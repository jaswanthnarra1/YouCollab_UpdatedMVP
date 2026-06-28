/**
 * Test verifyOtp for recovery + admin password update
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testFlow() {
  const email = `test-reset-${Date.now()}@example.com`;
  const originalPassword = 'Password123!';
  const newPassword = 'NewPassword999!';

  console.log('Creating confirmed user...');
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: originalPassword,
    email_confirm: true,
  });
  if (createError) {
    console.error('Create user error:', createError);
    return;
  }
  console.log('User created:', user.user.id);

  console.log('Generating recovery OTP...');
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  if (linkError) {
    console.error('generateLink error:', linkError);
    return;
  }
  const otp = linkData.properties.email_otp;
  console.log('Generated OTP:', otp);

  console.log('Verifying OTP with anon client...');
  const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
    email,
    token: otp,
    type: 'recovery',
  });

  if (verifyError) {
    console.error('verifyOtp error:', verifyError.message);
  } else {
    console.log('verifyOtp success! Confirmed user ID:', verifyData.user.id);

    console.log('Updating password via admin client...');
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      verifyData.user.id,
      { password: newPassword }
    );
    if (updateError) {
      console.error('Password update failed:', updateError.message);
    } else {
      console.log('Password updated successfully!');

      console.log('Testing sign in with NEW password...');
      const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password: newPassword,
      });
      if (loginError) {
        console.error('Sign in failed:', loginError.message);
      } else {
        console.log('Sign in succeeded! User email:', loginData.user.email);
      }
    }
  }

  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(user.user.id);
  console.log('Cleanup finished');
}

testFlow().catch(console.error);
