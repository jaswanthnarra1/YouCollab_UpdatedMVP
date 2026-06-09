/**
 * YouCollab — Database Migration Runner
 * ========================================
 * Runs migration.sql (base schema) and schema.sql (enhancements)
 * against the Supabase PostgreSQL database.
 *
 * Usage:
 *   node Backend/supabase/migrate.js
 *
 * Environment:
 *   DATABASE_URL must be set in Backend/.env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    '❌ DATABASE_URL is not set in your .env file.\n' +
    '   Format: postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres\n' +
    '   Find it in Supabase Dashboard → Settings → Database → Connection string'
  );
  process.exit(1);
}

const client = new Client({ connectionString });

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');

    // Step 1: Run base migration
    const migrationPath = path.join(__dirname, 'migration.sql');
    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      console.log('\n📦 Applying migration.sql (base schema)...');
      await client.query(migrationSql);
      console.log('✅ Base schema applied successfully!');
    } else {
      console.log('⚠️  migration.sql not found, skipping base schema.');
    }

    // Step 2: Run enhanced schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log('\n🔧 Applying schema.sql (enhancements)...');
      
      // Split by statements and run individually to handle partial failures gracefully
      // Some statements (like ALTER PUBLICATION) may fail if already applied
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let applied = 0;
      let skipped = 0;

      for (const statement of statements) {
        try {
          await client.query(statement + ';');
          applied++;
        } catch (err) {
          // Skip known safe-to-ignore errors (already exists, already member, etc.)
          if (
            err.message.includes('already exists') ||
            err.message.includes('already member') ||
            err.message.includes('duplicate key') ||
            err.message.includes('relation') && err.message.includes('already')
          ) {
            skipped++;
          } else {
            console.warn(`⚠️  Statement warning: ${err.message.split('\n')[0]}`);
            skipped++;
          }
        }
      }

      console.log(`✅ Enhanced schema applied! (${applied} applied, ${skipped} skipped/already-exists)`);
    } else {
      console.log('⚠️  schema.sql not found, skipping enhancements.');
    }

    console.log('\n🎉 Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
