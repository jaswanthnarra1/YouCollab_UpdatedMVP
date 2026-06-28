/**
 * Run schema reload notification to refresh Supabase PostgREST cache.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

async function reloadSchema() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Connected to database.');
    
    // Check if authId column exists in users table
    const checkCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'authId'
    `);
    
    if (checkCol.rows.length === 0) {
      console.log('⚠️ authId column is missing! Adding it...');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "authId" UUID UNIQUE;');
      console.log('✅ authId column added.');
    } else {
      console.log('✅ authId column already exists in users table.');
    }

    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('✅ PostgREST schema reload signal sent!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

reloadSchema();
