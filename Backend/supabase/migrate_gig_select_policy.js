require('dotenv').config({ path: 'c:\\Users\\Chinnu\\Documents\\You-Collab-AIG\\Backend\\.env' });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database.");

    console.log("Dropping old SELECT policy if exists...");
    await client.query(`DROP POLICY IF EXISTS "select_gigs" ON gigs;`).catch(e => {});

    console.log("Creating select_gigs RLS policy...");
    await client.query(`
      CREATE POLICY "select_gigs" ON gigs 
        FOR SELECT 
        TO anon, authenticated
        USING (
          status = 'OPEN' OR 
          EXISTS (
            SELECT 1 FROM brands b
            JOIN users u ON b."userId" = u.id
            WHERE b.id = "brandId" AND u."authId" = auth.uid()
          )
        );
    `);
    console.log("SELECT policy created successfully.");

    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Schema reload notification sent.");

    console.log("E2E RLS select policy migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
