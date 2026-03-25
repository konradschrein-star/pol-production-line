#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Applies SQL migrations in order to the Postgres database.
 * Usage: node scripts/run-migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const migrationFiles = [
  '001_add_retry_columns.sql',
  '002_add_jobs_columns.sql',
  '003_add_indexes.sql',
  '004_add_video_support_to_scenes.sql',
  '005_add_footage_mode_to_jobs.sql',
  '006_add_video_tracking_to_history.sql',
  '009_convert_paths_to_relative.sql'
];

async function runMigrations() {
  console.log('🔄 Starting database migrations...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection established\n');

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Run each migration
    for (const file of migrationFiles) {
      const migrationPath = path.join(__dirname, '../migrations', file);
      
      // Check if migration was already applied
      const result = await pool.query(
        'SELECT migration_name FROM schema_migrations WHERE migration_name = $1',
        [file]
      );

      if (result.rowCount > 0) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }

      // Read and execute migration
      console.log(`🔨 Applying ${file}...`);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [file]
        );
        await pool.query('COMMIT');
        console.log(`✅ Applied ${file}\n`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw new Error(`Failed to apply ${file}: ${error.message}`);
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
