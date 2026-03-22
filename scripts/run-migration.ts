/**
 * Database Migration Runner
 * Run with: npx tsx scripts/run-migration.ts <migration-file>
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import db from '../src/lib/db';

async function runMigration(migrationFile: string) {
  const migrationPath = join(__dirname, '..', 'src', 'lib', 'db', 'migrations', migrationFile);

  console.log(`🔄 Running migration: ${migrationFile}`);
  console.log(`📂 Path: ${migrationPath}`);

  try {
    // Read migration SQL
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await db.query(sql);

    console.log(`✅ Migration completed successfully!`);
    process.exit(0);

  } catch (error) {
    console.error(`❌ Migration failed:`, error);
    process.exit(1);
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: npx tsx scripts/run-migration.ts <migration-file>');
  console.error('   Example: npx tsx scripts/run-migration.ts 001_add_metrics_tables.sql');
  process.exit(1);
}

runMigration(migrationFile);
