/**
 * Verify migration was successful
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verify() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying migration...\n');

    // Check if cancellation_reason column exists
    const columnResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'news_jobs' AND column_name = 'cancellation_reason';
    `);

    if (columnResult.rows.length > 0) {
      console.log('✅ Column "cancellation_reason" exists');
      console.log(`   Type: ${columnResult.rows[0].data_type}`);
    } else {
      console.log('❌ Column "cancellation_reason" NOT found');
    }

    // Check the CHECK constraint
    const constraintResult = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'valid_status' AND conrelid = 'news_jobs'::regclass;
    `);

    if (constraintResult.rows.length > 0) {
      console.log('\n✅ Constraint "valid_status" exists');
      console.log(`   ${constraintResult.rows[0].definition}`);

      const definition = constraintResult.rows[0].definition;
      if (definition.includes('cancelled')) {
        console.log('   ✓ Includes "cancelled" status');
      } else {
        console.log('   ✗ Does NOT include "cancelled" status');
      }
    } else {
      console.log('\n❌ Constraint "valid_status" NOT found');
    }

    // Check the full-text search index
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'news_jobs' AND indexname = 'idx_news_jobs_script_search';
    `);

    if (indexResult.rows.length > 0) {
      console.log('\n✅ Index "idx_news_jobs_script_search" exists');
      console.log(`   ${indexResult.rows[0].indexdef}`);
    } else {
      console.log('\n❌ Index "idx_news_jobs_script_search" NOT found');
    }

    console.log('\n✅ Migration verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch((error) => {
  console.error('Verification error:', error);
  process.exit(1);
});
