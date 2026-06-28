/**
 * Migration script to configure the email_otps table.
 * Run: node Backend/supabase/migrate_otps_table.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const client = new Client({ connectionString });

const sql = `
DROP TABLE IF EXISTS email_otps CASCADE;

CREATE TABLE email_otps (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT,
  password_hash TEXT,
  role TEXT,
  type TEXT DEFAULT 'signup'
);

-- Enable RLS
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon/authenticated (managed by server)
CREATE POLICY "anon_all_email_otps" ON email_otps FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_email_otps" ON email_otps FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON email_otps TO anon, authenticated;
`;

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to database. Recreating email_otps table...');
    await client.query(sql);
    console.log('✅ email_otps table recreated successfully with schema updates & RLS!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
