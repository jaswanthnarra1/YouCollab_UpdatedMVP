require('dotenv').config({ path: 'Backend/.env' });
const { supabase } = require('../supabase/client');

async function test() {
  console.log('Testing Supabase signup with standard client...');
  const email = `test.user.${Date.now()}@example.com`;
  const password = 'password123';
  const name = 'Test User';
  const role = 'INFLUENCER';

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    });

    if (error) {
      console.error('Signup Error:', error);
    } else {
      console.log('Signup Success:', data);
    }
  } catch (err) {
    console.error('Catch Error:', err);
  }
}

test();
