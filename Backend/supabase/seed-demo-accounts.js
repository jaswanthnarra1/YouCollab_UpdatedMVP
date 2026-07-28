/**
 * YouCollab — Demo Account Seeder
 * ================================
 * Creates two fully-onboarded, login-ready demo accounts (Brand + Creator)
 * for live demos/testing without sending a real SMS.
 *
 * Uses Clerk's test-mode fictional phone number range: only +1 (XXX) 555-01XX
 * numbers skip real SMS, and the verification code is always fixed at
 * 424242 — this is a Clerk platform convention, not configurable
 * (see https://clerk.com/docs/testing/test-emails-and-phones). A real-looking
 * number (e.g. +91 9999999999) is NOT treated as a test number by Clerk.
 *
 * The Clerk identity is created server-side (clerkClient.users.createUser)
 * and its clerk_user_id is linked to the `users` row immediately, so demoing
 * is just: open /login, enter the phone below, enter code 424242. No
 * one-time registration step needed.
 *
 * Usage:
 *   node Backend/supabase/seed-demo-accounts.js
 *
 * Safe to re-run — skips creation for accounts that already exist.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');
const { clerkClient } = require('@clerk/express');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in your .env file.');
  process.exit(1);
}

const DEMO_ACCOUNTS = [
  {
    phone: '+12015550100',
    role: 'BRAND',
    name: 'Demo Brand',
    profile: {
      businessName: 'Demo Brand',
      category: 'Food & Beverage',
      location: 'Pune',
      bio: 'Demo brand account for live testing — post gigs, review pitches, hire creators.',
    },
  },
  {
    phone: '+12015550101',
    role: 'INFLUENCER',
    name: 'Demo Creator',
    profile: {
      name: 'Demo Creator',
      instagramHandle: 'demo_creator',
      niche: 'Lifestyle',
      bio: 'Demo creator account for live testing — pitch gigs, chat with brands, get hired.',
      followerCount: 15000,
    },
  },
];

async function ensureClerkUser({ phone, role, name }) {
  const { data: existing } = await clerkClient.users.getUserList({ phoneNumber: [phone] });
  if (existing.length > 0) return existing[0];
  return clerkClient.users.createUser({
    phoneNumber: [phone],
    unsafeMetadata: { role, name },
    // This Clerk instance still lists password as a required instance-level
    // field (a dashboard setting, not code) even though the app never
    // collects one — without this, server-side creation 422s on "password".
    skipPasswordRequirement: true,
  });
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL database.\n');

  try {
    for (const account of DEMO_ACCOUNTS) {
      console.log(`--- ${account.name} (${account.role}, ${account.phone}) ---`);

      const clerkUser = await ensureClerkUser(account);
      console.log(`  Clerk user: ${clerkUser.id}`);

      const { rows: existingRows } = await client.query(
        `SELECT id FROM users WHERE "clerk_user_id" = $1 OR phone = $2`,
        [clerkUser.id, account.phone]
      );

      let userId;
      if (existingRows.length > 0) {
        userId = existingRows[0].id;
        await client.query(
          `UPDATE users SET clerk_user_id = $1, phone = $2, role = $3, full_name = $4, is_onboarded = true WHERE id = $5`,
          [clerkUser.id, account.phone, account.role, account.name, userId]
        );
        console.log(`  users row: updated (${userId})`);
      } else {
        const { rows } = await client.query(
          `INSERT INTO users (clerk_user_id, phone, role, full_name, is_onboarded)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id`,
          [clerkUser.id, account.phone, account.role, account.name]
        );
        userId = rows[0].id;
        console.log(`  users row: created (${userId})`);
      }

      if (account.role === 'BRAND') {
        const { rows: brandRows } = await client.query(`SELECT id FROM brands WHERE "userId" = $1`, [userId]);
        if (brandRows.length === 0) {
          await client.query(
            `INSERT INTO brands ("userId", "businessName", category, location, bio)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, account.profile.businessName, account.profile.category, account.profile.location, account.profile.bio]
          );
          console.log('  brands row: created');
        } else {
          console.log('  brands row: already exists');
        }
      } else {
        const { rows: infRows } = await client.query(`SELECT id FROM influencers WHERE "userId" = $1`, [userId]);
        if (infRows.length === 0) {
          await client.query(
            `INSERT INTO influencers ("userId", name, "instagramHandle", niche, bio, "followerCount")
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, account.profile.name, account.profile.instagramHandle, account.profile.niche, account.profile.bio, account.profile.followerCount]
          );
          console.log('  influencers row: created');
        } else {
          console.log('  influencers row: already exists');
        }
      }
      console.log();
    }

    console.log('🎉 Demo accounts ready!\n');
    console.log('   ┌─────────────┬────────────────┬──────────┐');
    console.log('   │ Role        │ Phone          │ OTP code │');
    console.log('   ├─────────────┼────────────────┼──────────┤');
    for (const a of DEMO_ACCOUNTS) {
      console.log(`   │ ${a.role.padEnd(11)} │ ${a.phone.padEnd(14)} │ 424242   │`);
    }
    console.log('   └─────────────┴────────────────┴──────────┘');
    console.log('\n   Use /login (not /register) — these Clerk identities already exist.');
    console.log('   The phone field defaults to a +91 prefix; type the full +1... number');
    console.log('   including the leading "+" to override it.');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('❌ Demo seeding failed:', err.message);
  process.exit(1);
});
