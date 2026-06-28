/**
 * Query Supabase configuration tables to check SMTP status.
 */
const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function checkDb() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✅ Connected to Postgres.');

    // List tables in auth schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'auth'
    `);
    console.log('Tables in auth schema:', tablesRes.rows.map(r => r.table_name));

    // Try reading auth.config or similar if it exists
    try {
      const configRes = await client.query('SELECT * FROM auth.config LIMIT 1');
      console.log('auth.config columns:', configRes.fields.map(f => f.name));
      console.log('auth.config data:', configRes.rows);
    } catch (e) {
      console.log('Could not read auth.config:', e.message);
    }

    // Check users in auth.users
    const usersRes = await client.query('SELECT count(*) FROM auth.users');
    console.log('Total users in auth.users:', usersRes.rows[0].count);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDb();
