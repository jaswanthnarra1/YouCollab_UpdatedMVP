require('dotenv').config({ path: 'c:\\Users\\Chinnu\\Documents\\You-Collab-AIG\\Backend\\.env' });
const supabase = require('../src/services/supabase');

async function run() {
  try {
    console.log("Querying all gigs in database...");
    const { data, error } = await supabase.from('gigs').select('*, brand:brands(businessName)');
    if (error) {
      console.error("Error querying gigs:", error);
    } else {
      console.log("Gigs count:", data.length);
      console.log("All gigs in DB:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Execution error:", err);
  }
}

run();
