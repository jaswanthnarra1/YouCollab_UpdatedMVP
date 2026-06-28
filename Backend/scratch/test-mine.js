require('dotenv').config({ path: 'c:\\Users\\Chinnu\\Documents\\You-Collab-AIG\\Backend\\.env' });
const gigService = require('../src/services/gig.service');

async function run() {
  try {
    const userId = "6090f213-7496-4718-83f8-f9fba3f68594";
    console.log("Calling getMyGigs for user ID:", userId);
    const gigs = await gigService.getMyGigs(userId);
    console.log("Returned gigs count:", gigs.length);
    console.log("Gigs details:", JSON.stringify(gigs, null, 2));
  } catch (err) {
    console.error("Error in getMyGigs:", err);
  }
}

run();
