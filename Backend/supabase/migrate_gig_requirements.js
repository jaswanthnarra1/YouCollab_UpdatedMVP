require('dotenv').config({ path: 'c:\\Users\\Chinnu\\Documents\\You-Collab-AIG\\Backend\\.env' });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL env var not found");
  process.exit(1);
}

const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database.");

    console.log("Altering gigs table to add platform, creatorRequirements, and campaignType...");
    
    // Add columns
    await client.query(`
      ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "creatorRequirements" TEXT;
      ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "platform" TEXT;
      ALTER TABLE gigs ADD COLUMN IF NOT EXISTS "campaignType" TEXT;
    `);
    console.log("Columns added successfully.");

    console.log("Updating Row Level Security policies on gigs table...");
    
    // Enable RLS on gigs
    await client.query(`
      ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
    `);

    // Drop permissive authenticated policy
    await client.query(`
      DROP POLICY IF EXISTS "auth_all_gigs" ON gigs;
    `);

    // Create custom scoped policies for authenticated users
    await client.query(`
      CREATE POLICY "brand_insert_own_gigs" ON gigs 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM brands b
            JOIN users u ON b."userId" = u.id
            WHERE b.id = "brandId" AND u."authId" = auth.uid() AND u.role = 'BRAND'
          )
        );
    `).catch(err => console.log("brand_insert_own_gigs policy might already exist:", err.message));

    await client.query(`
      CREATE POLICY "brand_update_own_gigs" ON gigs 
        FOR UPDATE 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM brands b
            JOIN users u ON b."userId" = u.id
            WHERE b.id = "brandId" AND u."authId" = auth.uid()
          )
        );
    `).catch(err => console.log("brand_update_own_gigs policy might already exist:", err.message));

    await client.query(`
      CREATE POLICY "brand_delete_own_gigs" ON gigs 
        FOR DELETE 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM brands b
            JOIN users u ON b."userId" = u.id
            WHERE b.id = "brandId" AND u."authId" = auth.uid()
          )
        );
    `).catch(err => console.log("brand_delete_own_gigs policy might already exist:", err.message));

    // Reload PostgREST schema cache
    await client.query(`
      NOTIFY pgrst, 'reload schema';
    `);
    console.log("Schema reload notification sent.");

    console.log("Database migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
