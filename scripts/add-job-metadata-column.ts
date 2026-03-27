/**
 * Migration Script: Add job_metadata column
 * Run with: npx tsx scripts/add-job-metadata-column.ts
 */

import { db } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    console.log('🔧 Adding job_metadata column to news_jobs table...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../src/lib/db/migrations/009_add_job_metadata.sql'),
      'utf8'
    );

    await db.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('   - Added job_metadata JSONB column');
    console.log('   - Created GIN index for JSONB queries');

    await db.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await db.shutdown();
    process.exit(1);
  }
}

migrate();
