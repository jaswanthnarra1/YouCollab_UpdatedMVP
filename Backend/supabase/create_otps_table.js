require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const client = new Client({ connectionString });

const sql = `
CREATE TABLE IF NOT EXISTS email_otps (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to database. Creating email_otps table...');
    await client.query(sql);
    console.log('✅ email_otps table created successfully!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
