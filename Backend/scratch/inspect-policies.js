require('dotenv').config({ path: 'c:\\Users\\Chinnu\\Documents\\You-Collab-AIG\\Backend\\.env' });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log("Querying pg_policies for gigs table...");
    const { rows } = await client.query("SELECT * FROM pg_policies WHERE tablename = 'gigs';");
    console.log("Policies on gigs:", rows);
  } catch (err) {
    console.error("Execution error:", err);
  } finally {
    await client.end();
  }
}

run();
