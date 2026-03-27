/**
 * Check Completed Jobs - Production Quality Test
 * Finds recent completed jobs with scene counts
 */

import { db } from '../src/lib/db';

async function checkCompletedJobs() {
  try {
    const result = await db.query(`
      SELECT
        j.id,
        j.status,
        j.created_at,
        j.final_video_url,
        COUNT(s.id) as scene_count
      FROM news_jobs j
      LEFT JOIN news_scenes s ON s.job_id = j.id
      WHERE j.status = 'completed'
      GROUP BY j.id
      ORDER BY j.created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 Recent Completed Jobs\n');
    console.log('=' .repeat(100));
    console.log('Job ID (first 8)'.padEnd(20), '| Scenes |', 'Created', '| Has Video');
    console.log('='.repeat(100));

    for (const row of result.rows) {
      const jobIdShort = row.id.slice(0, 8);
      const sceneCount = String(row.scene_count).padStart(6);
      const created = new Date(row.created_at).toLocaleString();
      const hasVideo = row.final_video_url ? '✅ YES' : '❌ NO';

      console.log(`${jobIdShort.padEnd(20)} | ${sceneCount} | ${created} | ${hasVideo}`);
    }

    console.log('='.repeat(100));
    console.log('\n✅ Query complete\n');

    // Find jobs with 18+ scenes (scene-based mode indicator)
    const sceneBasedJobs = result.rows.filter(r => parseInt(r.scene_count) >= 18);
    if (sceneBasedJobs.length > 0) {
      console.log(`\n🎯 Found ${sceneBasedJobs.length} jobs with 18+ scenes (scene-based mode):`);
      sceneBasedJobs.forEach(job => {
        console.log(`  - ${job.id}: ${job.scene_count} scenes`);
      });
    } else {
      console.log('\n⚠️  No jobs with 18+ scenes found (all legacy mode?)');
    }

    await db.shutdown();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCompletedJobs();
