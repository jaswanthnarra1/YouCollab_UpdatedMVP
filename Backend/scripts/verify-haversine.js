/**
 * YouCollab — haversine_km() self-check
 * ======================================
 * Backend has no test framework, so this is the one runnable check for the
 * distance math introduced by the Location Radius Matching feature: it
 * cross-validates the Postgres haversine_km() function (schema.sql) against
 * an independent JS reference implementation over known Pune coordinate
 * pairs, plus the degenerate same-point case.
 *
 * Usage:
 *   node Backend/scripts/verify-haversine.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in your .env file.');
  process.exit(1);
}

// Independent JS reference implementation — not used by the app itself
// (distance math lives server-side in SQL), purely to cross-check the SQL.
function haversineKmReference(lat1, lng1, lat2, lng2) {
  const r = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.asin(Math.sqrt(a));
}

const CASES = [
  { name: 'same point (Koregaon Park)', a: [18.5362, 73.8938], b: [18.5362, 73.8938] },
  { name: 'Koregaon Park -> Baner', a: [18.5362, 73.8938], b: [18.5590, 73.7868] },
  { name: 'Koregaon Park -> Katraj', a: [18.5362, 73.8938], b: [18.4530, 73.8670] },
  { name: 'Pune GPO -> Kothrud', a: [18.5196, 73.8553], b: [18.5074, 73.8077] },
];

const EPSILON_KM = 0.05;

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  let failures = 0;

  for (const { name, a, b } of CASES) {
    const expected = haversineKmReference(...a, ...b);
    const { rows } = await client.query('SELECT haversine_km($1, $2, $3, $4) AS km', [...a, ...b]);
    const actual = rows[0].km;
    const diff = Math.abs(actual - expected);
    const pass = diff <= EPSILON_KM;
    if (!pass) failures++;
    console.log(
      `${pass ? '✅' : '❌'} ${name}: sql=${actual.toFixed(3)}km js=${expected.toFixed(3)}km diff=${diff.toFixed(4)}km`
    );
  }

  await client.end();

  if (failures > 0) {
    console.error(`\n❌ ${failures} case(s) failed.`);
    process.exit(1);
  }
  console.log('\n🎉 haversine_km() matches the JS reference on every case.');
}

run().catch((err) => {
  console.error('❌ Check failed:', err.message);
  process.exit(1);
});
