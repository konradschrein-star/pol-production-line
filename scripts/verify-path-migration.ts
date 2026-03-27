/**
 * Verify Path Migration Script
 * Checks that database paths were successfully converted to relative format
 */

import 'dotenv/config';
import { db } from '../src/lib/db';

async function verifyMigration() {
  try {
    console.log('🔍 Verifying path migration...\n');

    // Check news_scenes
    const scenesResult = await db.query(`
      SELECT id, image_url
      FROM news_scenes
      WHERE image_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('📸 Sample scene image paths:');
    if (scenesResult.rows.length === 0) {
      console.log('   (No scenes found)');
    } else {
      scenesResult.rows.forEach((row, i) => {
        const isRelative = !row.image_url.match(/^[a-zA-Z]:[/\\]/);
        const status = isRelative ? '✅' : '❌';
        console.log(`   ${status} ${row.image_url}`);
      });
    }

    // Check news_jobs avatar paths
    const avatarsResult = await db.query(`
      SELECT id, avatar_mp4_url
      FROM news_jobs
      WHERE avatar_mp4_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n🎭 Sample avatar paths:');
    if (avatarsResult.rows.length === 0) {
      console.log('   (No avatars found)');
    } else {
      avatarsResult.rows.forEach((row, i) => {
        const isRelative = !row.avatar_mp4_url.match(/^[a-zA-Z]:[/\\]/);
        const status = isRelative ? '✅' : '❌';
        console.log(`   ${status} ${row.avatar_mp4_url}`);
      });
    }

    // Check news_jobs video paths
    const videosResult = await db.query(`
      SELECT id, final_video_url
      FROM news_jobs
      WHERE final_video_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n🎬 Sample video paths:');
    if (videosResult.rows.length === 0) {
      console.log('   (No videos found)');
    } else {
      videosResult.rows.forEach((row, i) => {
        const isRelative = !row.final_video_url.match(/^[a-zA-Z]:[/\\]/);
        const status = isRelative ? '✅' : '❌';
        console.log(`   ${status} ${row.final_video_url}`);
      });
    }

    // Statistics
    const statsResult = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM news_scenes WHERE image_url ~ '^[a-zA-Z]:[/\\]') as absolute_scene_paths,
        (SELECT COUNT(*) FROM news_scenes WHERE image_url IS NOT NULL AND image_url !~ '^[a-zA-Z]:[/\\]') as relative_scene_paths,
        (SELECT COUNT(*) FROM news_jobs WHERE avatar_mp4_url ~ '^[a-zA-Z]:[/\\]') as absolute_avatar_paths,
        (SELECT COUNT(*) FROM news_jobs WHERE avatar_mp4_url IS NOT NULL AND avatar_mp4_url !~ '^[a-zA-Z]:[/\\]') as relative_avatar_paths,
        (SELECT COUNT(*) FROM news_jobs WHERE final_video_url ~ '^[a-zA-Z]:[/\\]') as absolute_video_paths,
        (SELECT COUNT(*) FROM news_jobs WHERE final_video_url IS NOT NULL AND final_video_url !~ '^[a-zA-Z]:[/\\]') as relative_video_paths
    `);

    const stats = statsResult.rows[0];

    console.log('\n📊 Migration Statistics:');
    console.log(`   Scene images: ${stats.relative_scene_paths} relative, ${stats.absolute_scene_paths} absolute`);
    console.log(`   Avatars: ${stats.relative_avatar_paths} relative, ${stats.absolute_avatar_paths} absolute`);
    console.log(`   Videos: ${stats.relative_video_paths} relative, ${stats.absolute_video_paths} absolute`);

    const totalAbsolute = parseInt(stats.absolute_scene_paths) + parseInt(stats.absolute_avatar_paths) + parseInt(stats.absolute_video_paths);

    if (totalAbsolute === 0) {
      console.log('\n✅ Migration successful! All paths are now relative.');
    } else {
      console.log(`\n⚠️  Warning: ${totalAbsolute} absolute paths still remain. This may indicate migration issues.`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyMigration();
