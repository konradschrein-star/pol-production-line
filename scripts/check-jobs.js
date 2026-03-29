/**
 * Check recent jobs and their status
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkJobs() {
  console.log('📊 Recent Jobs Status:\n');

  try {
    // Get recent jobs
    const { rows: jobs } = await pool.query(
      `SELECT id, status, created_at, updated_at, error_message
       FROM news_jobs
       ORDER BY created_at DESC
       LIMIT 10`
    );

    if (jobs.length === 0) {
      console.log('   ❌ No jobs found in database');
      console.log('   This means no videos have been created yet.\n');
      console.log('   TO START: Open http://localhost:8347 and create a new broadcast\n');
      await pool.end();
      return;
    }

    // Status counts
    const statusCounts = {};
    jobs.forEach(job => {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    });

    console.log('Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} job(s)`);
    });
    console.log();

    // Show recent jobs
    console.log('Recent Jobs:');
    jobs.slice(0, 5).forEach((job, i) => {
      const ageMinutes = Math.round((new Date() - new Date(job.updated_at)) / 1000 / 60);
      console.log(`${i+1}. ${job.id.substring(0, 8)}... [${job.status}]`);
      console.log(`   Created: ${job.created_at.toISOString().substring(0, 19).replace('T', ' ')}`);
      console.log(`   Updated: ${ageMinutes} minutes ago`);
      if (job.error_message) {
        console.log(`   Error: ${job.error_message.substring(0, 80)}...`);
      }
      console.log();
    });

    // Check for stuck jobs
    const stuckStates = ['analyzing', 'generating_images', 'rendering'];
    const { rows: stuck } = await pool.query(
      `SELECT id, status, updated_at
       FROM news_jobs
       WHERE status = ANY($1)
       AND updated_at < NOW() - INTERVAL '30 minutes'
       ORDER BY updated_at DESC`,
      [stuckStates]
    );

    if (stuck.length > 0) {
      console.log('⚠️  STUCK JOBS DETECTED:');
      stuck.forEach(job => {
        const ageHours = Math.round((new Date() - new Date(job.updated_at)) / 1000 / 60 / 60);
        console.log(`   ${job.id.substring(0, 8)}... stuck in ${job.status} for ${ageHours} hours`);
      });
      console.log('\n   These jobs may need to be cancelled or retried.');
      console.log('   Check if workers are running: npm run workers\n');
    }

    // Check scenes for failed jobs
    const failedJobs = jobs.filter(j => j.status === 'failed').slice(0, 3);
    if (failedJobs.length > 0) {
      console.log('🔍 Failed Job Details:\n');
      for (const job of failedJobs) {
        const { rows: scenes } = await pool.query(
          `SELECT id, scene_order, generation_status, error_message
           FROM news_scenes
           WHERE job_id = $1
           ORDER BY scene_order`,
          [job.id]
        );

        console.log(`Job ${job.id.substring(0, 8)}...:`);
        if (scenes.length === 0) {
          console.log('   No scenes found (failed during analysis?)');
        } else {
          const failedScenes = scenes.filter(s => s.generation_status === 'failed');
          console.log(`   ${failedScenes.length}/${scenes.length} scenes failed`);
          failedScenes.slice(0, 3).forEach(s => {
            console.log(`   Scene ${s.scene_order}: ${s.error_message || 'Unknown error'}`);
          });
        }
        console.log();
      }
    }

  } catch (err) {
    console.error('❌ Database error:', err.message);
  } finally {
    await pool.end();
  }
}

checkJobs();
