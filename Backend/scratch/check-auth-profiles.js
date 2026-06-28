require('dotenv').config({ path: 'c:\\Users\\Chinnu\\Documents\\You-Collab-AIG\\Backend\\.env' });
const supabase = require('../src/services/supabase');

async function run() {
  try {
    console.log("Fetching all users with authId...");
    const { data: users, error: userErr } = await supabase.from('users').select('*');
    if (userErr) console.error("User error:", userErr);
    else console.log("Users:", users);

    console.log("Fetching all brands...");
    const { data: brands, error: brandErr } = await supabase.from('brands').select('*');
    if (brandErr) console.error("Brand error:", brandErr);
    else console.log("Brands:", brands);
  } catch (err) {
    console.error("Execution error:", err);
  }
}

run();
