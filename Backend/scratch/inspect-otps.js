require('dotenv').config({ path: 'c:\\Users\\Chinnu\\Documents\\You-Collab-AIG\\Backend\\.env' });
const { supabaseAdmin } = require('../src/services/supabase');

async function run() {
  try {
    console.log("Querying all email_otps records...");
    const { data, error } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error querying email_otps:", error);
    } else {
      console.log("OTPs count:", data.length);
      console.log("All OTPs in DB:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Execution error:", err);
  }
}

run();
