/**
 * Migration Script: Add job_metadata column
 * Run with: node scripts/add-job-metadata-column.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Adding job_metadata column to news_jobs table...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../src/lib/db/migrations/009_add_job_metadata.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('   - Added job_metadata JSONB column');
    console.log('   - Created GIN index for JSONB queries');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
