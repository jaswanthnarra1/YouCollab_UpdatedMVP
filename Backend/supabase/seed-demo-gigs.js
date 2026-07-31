/**
 * YouCollab — Demo Gig Seeder
 * ============================
 * Creates a spread of realistic gigs under the Demo Brand so the creator
 * discovery → pitch → review → hire flow can actually be exercised.
 *
 * ADDITIVE ON PURPOSE. Unlike seed.js — which truncates users/brands/gigs and
 * would destroy real accounts and live Instagram connections — this script
 * only inserts, and skips any gig whose title already exists for the brand,
 * so it is safe to re-run against a database people are already using.
 *
 * Usage:
 *   node Backend/supabase/seed-demo-gigs.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in your .env file.');
  process.exit(1);
}

const BRAND_EMAIL = 'demo.brand@youcollab.in';

// Central Pune (Shivajinagar). The brand needs real coordinates or every gig
// reports a null distance and radius filtering silently can't apply.
const BRAND_LOCATION = { pincode: '411005', latitude: 18.5308, longitude: 73.8475 };

/**
 * radiusKm is constrained by the schema to one of 2, 5, 10 or 20 (or NULL for
 * "anywhere in Pune") — see gigs_radiuskm_check.
 *
 * A gig is only discoverable when: status ACTIVE, not past expiresAt, city
 * 'Pune', and applications_count < applicationSlots (see list_gigs_in_radius
 * in schema.sql). Slots are deliberately > 1 here — the pre-existing seed gigs
 * all had a single slot that was already taken, which is why the creator feed
 * looked empty.
 */
const DAY = 24 * 60 * 60 * 1000;

const GIGS = [
  {
    title: 'Cafe Launch Reel — Koregaon Park',
    description:
      'We are opening our second outpost in Koregaon Park and want a punchy launch reel that captures the space, the espresso program and the opening-week energy. Looking for someone whose audience actually eats out in Pune.',
    deliverables: '1 Instagram Reel (30-45s) + 3 story frames with location tag',
    creatorRequirements: 'Food or lifestyle creator based in Pune. Comfortable shooting in a busy cafe.',
    budgetMin: 8000, budgetMax: 15000, category: 'Cafe', platform: 'Instagram',
    campaignType: 'Reel', applicationSlots: 6, radiusKm: 20, expiresInDays: 21, deadlineInDays: 30,
  },
  {
    title: 'Weekend Brunch Menu Feature',
    description:
      'New weekend brunch menu dropping this month. We want honest, appetising coverage — a carousel that makes people book a table, not a glossy ad.',
    deliverables: '1 carousel post (5-7 images) + 2 stories',
    creatorRequirements: 'Food photography skills. Pune-based, able to visit on a weekend morning.',
    budgetMin: 5000, budgetMax: 9000, category: 'Resto', platform: 'Instagram',
    campaignType: 'Post', applicationSlots: 5, radiusKm: 20, expiresInDays: 18, deadlineInDays: 25,
  },
  {
    title: 'Fitness Studio 6-Week Transformation',
    description:
      'Document a genuine six-week training block at our Baner studio. This is a longer-form collaboration — we care far more about authenticity and consistency than follower count.',
    deliverables: 'Weekly stories + 2 Reels (start and finish) + 1 wrap-up post',
    creatorRequirements: 'Fitness or wellness creator. Must be able to attend 3 sessions a week for 6 weeks.',
    budgetMin: 20000, budgetMax: 35000, category: 'Fitness', platform: 'Instagram',
    campaignType: 'Campaign', applicationSlots: 3, radiusKm: 20, expiresInDays: 28, deadlineInDays: 60,
  },
  {
    title: 'Sustainable Skincare Launch — D2C',
    description:
      'Launching a three-product skincare line made in Pune. We want creators who will actually use it for two weeks before posting, and who are comfortable talking about ingredients.',
    deliverables: '1 Reel (unboxing + 2-week update) + 3 stories with swipe-up',
    creatorRequirements: 'Beauty or skincare focus. Willing to trial the product for 14 days before posting.',
    budgetMin: 12000, budgetMax: 22000, category: 'D2C', platform: 'Instagram',
    campaignType: 'Reel', applicationSlots: 8, radiusKm: null, expiresInDays: 25, deadlineInDays: 45,
  },
  {
    title: 'Festive Ethnic Wear Lookbook',
    description:
      'Festive season collection shoot. Looking for creators with a strong personal styling voice — we will send three outfits and give you full creative latitude on how they are shown.',
    deliverables: '1 lookbook carousel + 1 Reel + 4 stories',
    creatorRequirements: 'Fashion creator with a consistent visual style. Pune or willing to travel to Pune.',
    budgetMin: 15000, budgetMax: 28000, category: 'Fashion', platform: 'Instagram',
    campaignType: 'Post', applicationSlots: 4, radiusKm: 20, expiresInDays: 20, deadlineInDays: 35,
  },
  {
    title: 'Local Bookstore Community Spotlight',
    description:
      'Independent bookstore in Deccan. Small budget, honest brief: we want someone who genuinely loves books to spend an afternoon here and tell people about it.',
    deliverables: '1 Reel or carousel + 2 stories',
    creatorRequirements: 'Any niche, but a real interest in books and local culture matters more than reach.',
    budgetMin: 3000, budgetMax: 6000, category: 'Local', platform: 'Instagram',
    campaignType: 'Post', applicationSlots: 5, radiusKm: 10, expiresInDays: 30, deadlineInDays: 40,
  },
  {
    title: 'SaaS Founder Story — Startup Feature',
    description:
      'Early-stage Pune SaaS company. We want a founder-story style piece aimed at the local startup community — less product demo, more the human side of building.',
    deliverables: '1 long-form Reel (60-90s) + 1 LinkedIn-style caption post',
    creatorRequirements: 'Tech or business creator. Comfortable conducting a short on-camera interview.',
    budgetMin: 18000, budgetMax: 30000, category: 'Startup', platform: 'Instagram',
    campaignType: 'Campaign', applicationSlots: 3, radiusKm: null, expiresInDays: 26, deadlineInDays: 50,
  },
];

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL database.\n');

  try {
    const { rows: brandRows } = await client.query(
      `SELECT b.id, b."businessName", b."planId"
         FROM brands b JOIN users u ON u.id = b."userId"
        WHERE u.email = $1`,
      [BRAND_EMAIL]
    );

    if (brandRows.length === 0) {
      console.error(`❌ No brand found for ${BRAND_EMAIL}. Run seed-demo-accounts.js first.`);
      process.exit(1);
    }

    const brand = brandRows[0];
    console.log(`Brand: ${brand.businessName} (${brand.id})`);

    // Without coordinates every gig shows a null distance and the radius
    // filter can never match, so pin the brand to a real Pune location.
    await client.query(
      `UPDATE brands SET pincode = $1, latitude = $2, longitude = $3 WHERE id = $4`,
      [BRAND_LOCATION.pincode, BRAND_LOCATION.latitude, BRAND_LOCATION.longitude, brand.id]
    );
    console.log(`  location: ${BRAND_LOCATION.pincode} (${BRAND_LOCATION.latitude}, ${BRAND_LOCATION.longitude})`);

    // The FREE plan caps campaigns at 2, which would leave the demo brand
    // unable to post anything else from the UI after seeding.
    const { rows: planRows } = await client.query(`SELECT id, name, "campaignLimit" FROM plans WHERE name = 'GROWTH'`);
    if (planRows.length > 0 && brand.planId !== planRows[0].id) {
      await client.query(`UPDATE brands SET "planId" = $1 WHERE id = $2`, [planRows[0].id, brand.id]);
      console.log(`  plan: upgraded to ${planRows[0].name} (${planRows[0].campaignLimit} campaigns)`);
    }

    console.log('\n📋 Seeding gigs...');
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const g of GIGS) {
      const { rows: existing } = await client.query(
        `SELECT id FROM gigs WHERE "brandId" = $1 AND title = $2`,
        [brand.id, g.title]
      );
      if (existing.length > 0) {
        console.log(`  – skipped (exists): ${g.title}`);
        skipped += 1;
        continue;
      }

      await client.query(
        `INSERT INTO gigs (
           "brandId", title, description, deliverables, "creatorRequirements",
           "budgetMin", "budgetMax", category, platform, "campaignType",
           city, status, "applicationSlots", "radiusKm",
           deadline, "publishedAt", "expiresAt"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pune','ACTIVE',$11,$12,$13,now(),$14)`,
        [
          brand.id, g.title, g.description, g.deliverables, g.creatorRequirements,
          g.budgetMin, g.budgetMax, g.category, g.platform, g.campaignType,
          g.applicationSlots, g.radiusKm,
          new Date(now + g.deadlineInDays * DAY).toISOString(),
          new Date(now + g.expiresInDays * DAY).toISOString(),
        ]
      );
      console.log(`  ✓ ${g.title}  [${g.category}] ₹${g.budgetMin.toLocaleString()}–${g.budgetMax.toLocaleString()} · ${g.applicationSlots} slots`);
      created += 1;
    }

    console.log(`\n🎉 Done — ${created} created, ${skipped} skipped.`);

    const { rows: visible } = await client.query(
      `SELECT COUNT(*)::int AS n
         FROM gigs g
         LEFT JOIN LATERAL (SELECT COUNT(*) AS cnt FROM applications a WHERE a."gigId" = g.id) a ON true
        WHERE g.status = 'ACTIVE'
          AND (g."expiresAt" IS NULL OR g."expiresAt" > now())
          AND COALESCE(a.cnt, 0) < g."applicationSlots"
          AND g.city = 'Pune'`
    );
    console.log(`   Gigs now discoverable in the creator feed: ${visible[0].n}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
