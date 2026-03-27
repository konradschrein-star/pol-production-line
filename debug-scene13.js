/**
 * Debug Script for Scene 13
 * Run with: node debug-scene13.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function debugScene13() {
  try {
    // Get the most recent job
    const jobResult = await pool.query(`
      SELECT id, status, created_at
      FROM news_jobs
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (jobResult.rows.length === 0) {
      console.log('❌ No jobs found');
      return;
    }

    const job = jobResult.rows[0];
    console.log('\n📋 Most Recent Job:');
    console.log(`  ID: ${job.id}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Created: ${job.created_at}`);

    // Get scene 13 from this job
    const sceneResult = await pool.query(`
      SELECT
        id,
        scene_order,
        generation_status,
        error_message,
        retry_count,
        failed_permanently,
        image_url,
        image_prompt,
        updated_at,
        created_at,
        AGE(NOW(), updated_at) as time_since_update
      FROM news_scenes
      WHERE job_id = $1 AND scene_order = 13
    `, [job.id]);

    if (sceneResult.rows.length === 0) {
      console.log('\n❌ Scene 13 not found in this job');
      return;
    }

    const scene = sceneResult.rows[0];
    console.log('\n🖼️ Scene 13 Details:');
    console.log(`  ID: ${scene.id}`);
    console.log(`  Order: ${scene.scene_order}`);
    console.log(`  Status: ${scene.generation_status}`);
    console.log(`  Error: ${scene.error_message || 'None'}`);
    console.log(`  Retry Count: ${scene.retry_count || 0}`);
    console.log(`  Failed Permanently: ${scene.failed_permanently || false}`);
    console.log(`  Has Image: ${scene.image_url ? 'Yes' : 'No'}`);
    console.log(`  Created: ${scene.created_at}`);
    console.log(`  Last Updated: ${scene.updated_at}`);
    console.log(`  Time Since Update: ${scene.time_since_update}`);
    console.log(`\n  Prompt: ${scene.image_prompt.substring(0, 100)}...`);

    // Check if there's a stuck BullMQ job
    console.log('\n🔍 Checking BullMQ queue...');
    console.log('  (You\'ll need to check BullMQ Board at http://localhost:8347/bullmq)');

    // Get all scenes for this job
    const allScenesResult = await pool.query(`
      SELECT
        scene_order,
        generation_status,
        retry_count,
        image_url
      FROM news_scenes
      WHERE job_id = $1
      ORDER BY scene_order
    `, [job.id]);

    console.log('\n📊 All Scenes Status:');
    allScenesResult.rows.forEach(s => {
      const status = s.generation_status.padEnd(12);
      const hasImage = s.image_url ? '✅' : '❌';
      const retries = s.retry_count ? ` (${s.retry_count} retries)` : '';
      console.log(`  Scene ${String(s.scene_order).padStart(2)}: ${status} ${hasImage}${retries}`);
    });

    // Count completion
    const completed = allScenesResult.rows.filter(s => s.generation_status === 'completed').length;
    const total = allScenesResult.rows.length;
    console.log(`\n  Progress: ${completed}/${total} scenes completed (${Math.round(completed/total*100)}%)`);

    // Suggest fixes
    console.log('\n💡 Suggested Fixes:');

    if (scene.generation_status === 'generating') {
      console.log('  1. Scene is stuck in "generating" status');
      console.log('     → Restart workers: STOP.bat then START.bat');
      console.log('     → Or click "Regenerate" in UI');
    }

    if (scene.generation_status === 'failed') {
      console.log('  1. Scene failed to generate');
      console.log('     → Click "Regenerate" in UI');
      console.log('     → Or click "Upload" to use custom image');
    }

    if (scene.generation_status === 'pending') {
      console.log('  1. Scene is pending (waiting for worker)');
      console.log('     → Check if workers are running');
      console.log('     → Check BullMQ queue for stuck jobs');
    }

    // SQL to reset scene 13
    console.log('\n🔧 Manual Reset SQL (if needed):');
    console.log(`
UPDATE news_scenes
SET
  generation_status = 'pending',
  error_message = NULL,
  retry_count = 0,
  failed_permanently = FALSE
WHERE id = '${scene.id}';
    `.trim());

    console.log('\n✅ Debug complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugScene13();
