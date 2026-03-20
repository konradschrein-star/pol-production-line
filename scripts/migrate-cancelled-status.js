/**
 * Migration: Add 'cancelled' status support
 *
 * Changes:
 * 1. Update valid_status CHECK constraint to include 'cancelled'
 * 2. Add cancellation_reason field
 * 3. Add full-text search index
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting migration: Add cancelled status support...');

    await client.query('BEGIN');

    // 1. Drop and recreate the CHECK constraint to include 'cancelled'
    console.log('  ↳ Updating valid_status constraint...');
    await client.query(`
      ALTER TABLE news_jobs DROP CONSTRAINT IF EXISTS valid_status;
    `);

    await client.query(`
      ALTER TABLE news_jobs ADD CONSTRAINT valid_status CHECK (
        status IN ('pending', 'analyzing', 'generating_images', 'review_assets', 'rendering', 'completed', 'failed', 'cancelled')
      );
    `);

    // 2. Add cancellation_reason field (if it doesn't exist)
    console.log('  ↳ Adding cancellation_reason column...');
    await client.query(`
      ALTER TABLE news_jobs
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    `);

    // 3. Add full-text search index (if it doesn't exist)
    console.log('  ↳ Creating full-text search index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_news_jobs_script_search
      ON news_jobs USING gin(to_tsvector('english', raw_script || ' ' || COALESCE(avatar_script, '')));
    `);

    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!');
    console.log('\nChanges applied:');
    console.log('  • Added "cancelled" to valid job statuses');
    console.log('  • Added cancellation_reason column');
    console.log('  • Created full-text search index for scripts');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
