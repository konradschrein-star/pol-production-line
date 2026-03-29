/**
 * Migration Script: Convert Absolute Paths to Relative Paths
 *
 * Bug #7 Fix: Standardizes all database paths to relative format
 *
 * This script:
 * 1. Scans news_jobs and news_scenes tables for absolute paths
 * 2. Converts them to relative paths using makeRelativePath()
 * 3. Updates the database with portable relative paths
 *
 * Run this once after upgrading to the standardized path system.
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { makeRelativePath } from '../src/lib/storage/path-resolver';

interface PathMigrationStats {
  jobs_checked: number;
  jobs_migrated: number;
  scenes_checked: number;
  scenes_migrated: number;
  errors: string[];
}

async function migratePaths(): Promise<PathMigrationStats> {
  const stats: PathMigrationStats = {
    jobs_checked: 0,
    jobs_migrated: 0,
    scenes_checked: 0,
    scenes_migrated: 0,
    errors: [],
  };

  console.log('\n🔄 [MIGRATION] Starting path migration to relative format...\n');

  try {
    // 1. Migrate avatar_mp4_url in news_jobs table
    console.log('📋 [MIGRATION] Checking news_jobs.avatar_mp4_url...');

    const jobsResult = await db.query(
      `SELECT id, avatar_mp4_url
       FROM news_jobs
       WHERE avatar_mp4_url IS NOT NULL`
    );

    stats.jobs_checked = jobsResult.rows.length;
    console.log(`   Found ${stats.jobs_checked} jobs with avatar paths`);

    for (const job of jobsResult.rows) {
      const { id, avatar_mp4_url } = job;

      // Check if path is absolute (contains drive letter or starts with /)
      const isAbsolute = avatar_mp4_url.includes(':\\') || avatar_mp4_url.startsWith('/');

      if (isAbsolute) {
        const relativePath = makeRelativePath(avatar_mp4_url);

        console.log(`   Converting job ${id}:`);
        console.log(`     FROM: ${avatar_mp4_url}`);
        console.log(`     TO:   ${relativePath}`);

        try {
          await db.query(
            'UPDATE news_jobs SET avatar_mp4_url = $1 WHERE id = $2',
            [relativePath, id]
          );

          stats.jobs_migrated++;
        } catch (error) {
          const errorMsg = `Failed to migrate job ${id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`   ❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    console.log(`✅ Migrated ${stats.jobs_migrated}/${stats.jobs_checked} job avatar paths\n`);

    // 2. Migrate image_url in news_scenes table
    console.log('🖼️  [MIGRATION] Checking news_scenes.image_url...');

    const scenesResult = await db.query(
      `SELECT id, image_url
       FROM news_scenes
       WHERE image_url IS NOT NULL`
    );

    stats.scenes_checked = scenesResult.rows.length;
    console.log(`   Found ${stats.scenes_checked} scenes with image paths`);

    for (const scene of scenesResult.rows) {
      const { id, image_url } = scene;

      // Check if path is absolute
      const isAbsolute = image_url.includes(':\\') || image_url.startsWith('/');

      if (isAbsolute) {
        const relativePath = makeRelativePath(image_url);

        console.log(`   Converting scene ${id}:`);
        console.log(`     FROM: ${image_url}`);
        console.log(`     TO:   ${relativePath}`);

        try {
          await db.query(
            'UPDATE news_scenes SET image_url = $1 WHERE id = $2',
            [relativePath, id]
          );

          stats.scenes_migrated++;
        } catch (error) {
          const errorMsg = `Failed to migrate scene ${id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`   ❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    console.log(`✅ Migrated ${stats.scenes_migrated}/${stats.scenes_checked} scene image paths\n`);

    return stats;

  } catch (error) {
    console.error('❌ [MIGRATION] Migration failed:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  migratePaths()
    .then((stats) => {
      console.log('\n📊 [MIGRATION] Migration Summary:');
      console.log(`   Jobs checked: ${stats.jobs_checked}`);
      console.log(`   Jobs migrated: ${stats.jobs_migrated}`);
      console.log(`   Scenes checked: ${stats.scenes_checked}`);
      console.log(`   Scenes migrated: ${stats.scenes_migrated}`);

      if (stats.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
        stats.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
      }

      if (stats.jobs_migrated === 0 && stats.scenes_migrated === 0) {
        console.log('\n✅ No absolute paths found - database already uses relative paths!');
      } else {
        console.log('\n✅ Migration complete! All paths now use relative format.');
      }

      process.exit(stats.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n❌ [MIGRATION] Fatal error:', error);
      process.exit(1);
    });
}

export { migratePaths };
