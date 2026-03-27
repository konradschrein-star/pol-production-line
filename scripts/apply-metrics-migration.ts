/**
 * Apply metrics tables migration
 * Run with: npm run ts-node scripts/apply-metrics-migration.ts
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Applying metrics tables migration...\n');

    // Read migration file
    const migrationPath = join(__dirname, '..', 'src', 'lib', 'db', 'migrations', 'add_metrics_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');
    console.log('Created tables:');
    console.log('  - job_metrics');
    console.log('  - generation_history');
    console.log('\n📊 Metrics tracking is now enabled!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
