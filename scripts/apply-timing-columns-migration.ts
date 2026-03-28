import 'dotenv/config';
import { db } from '../src/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('📊 Applying scene timing columns migration...');

    // Read and execute the migration SQL file
    const migrationPath = join(__dirname, '../src/lib/db/migrations/010_add_scene_timing_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    await db.query(migrationSQL);

    console.log('✅ Added word_start_time and word_end_time columns to news_scenes');
    console.log('✅ Created timing index');
    console.log('✅ Added timing validation constraint');
    console.log('✅ Migration completed successfully');

    await db.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await db.shutdown();
    process.exit(1);
  }
}

runMigration();
