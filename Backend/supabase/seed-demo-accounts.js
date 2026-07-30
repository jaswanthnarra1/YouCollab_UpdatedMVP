/**
 * YouCollab — Demo Account Seeder
 * ================================
 * Creates two fully-onboarded, login-ready demo accounts (Brand + Creator)
 * for live demos/testing.
 *
 * The Clerk identity is created server-side (clerkClient.users.createUser)
 * with a password and pre-verified email — users created via the Backend
 * API skip the email verification step — and its clerk_user_id is linked to
 * the `users` row immediately, so demoing is just: open /login, enter the
 * email + password below.
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

// Must not be a common/breached password — Clerk rejects those at sign-in
// time with form_password_pwned even if account creation itself succeeds.
const DEMO_PASSWORD = 'YcE52YjgZh!9';

const DEMO_ACCOUNTS = [
  {
    email: 'demo.brand@youcollab.in',
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
    email: 'demo.creator@youcollab.in',
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

async function ensureClerkUser({ email, role, name }) {
  const { data: existing } = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (existing.length > 0) {
    // Re-set the password every run so re-seeding after a DEMO_PASSWORD
    // change (e.g. Clerk rejected the old one as breached) fixes existing users too.
    return clerkClient.users.updateUser(existing[0].id, {
      password: DEMO_PASSWORD,
      skipPasswordChecks: true,
    });
  }
  return clerkClient.users.createUser({
    emailAddress: [email],
    password: DEMO_PASSWORD,
    skipPasswordChecks: true,
    unsafeMetadata: { role, name },
  });
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL database.\n');

  try {
    for (const account of DEMO_ACCOUNTS) {
      console.log(`--- ${account.name} (${account.role}, ${account.email}) ---`);

      const clerkUser = await ensureClerkUser(account);
      console.log(`  Clerk user: ${clerkUser.id}`);

      const { rows: existingRows } = await client.query(
        `SELECT id FROM users WHERE "clerk_user_id" = $1 OR email = $2`,
        [clerkUser.id, account.email]
      );

      let userId;
      if (existingRows.length > 0) {
        userId = existingRows[0].id;
        await client.query(
          `UPDATE users SET clerk_user_id = $1, email = $2, role = $3, full_name = $4, is_onboarded = true WHERE id = $5`,
          [clerkUser.id, account.email, account.role, account.name, userId]
        );
        console.log(`  users row: updated (${userId})`);
      } else {
        const { rows } = await client.query(
          `INSERT INTO users (clerk_user_id, email, role, full_name, is_onboarded)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id`,
          [clerkUser.id, account.email, account.role, account.name]
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
    console.log('   ┌─────────────┬──────────────────────────┬──────────────┐');
    console.log('   │ Role        │ Email                     │ Password     │');
    console.log('   ├─────────────┼──────────────────────────┼──────────────┤');
    for (const a of DEMO_ACCOUNTS) {
      console.log(`   │ ${a.role.padEnd(11)} │ ${a.email.padEnd(25)} │ ${DEMO_PASSWORD.padEnd(12)} │`);
    }
    console.log('   └─────────────┴──────────────────────────┴──────────────┘');
    console.log('\n   Use /login (not /register) — these Clerk identities already exist and are pre-verified.');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('❌ Demo seeding failed:', err.message);
  process.exit(1);
});
