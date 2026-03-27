/**
 * Direct Pipeline Test - Bypass API, use database + queues directly
 * Tests zoom & overlay fixes by running complete pipeline
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { readFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { queueAnalyze, queueRender } from '../src/lib/queue/queues';

const TEST_SCRIPT_PATH = 'test-script-long.txt'; // Long non-political script
const AVATAR_VIDEO_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForStatus(
  jobId: string,
  targetStatus: string | string[],
  timeout: number = 600000
): Promise<void> {
  const statuses = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await db.query('SELECT status FROM news_jobs WHERE id = $1', [jobId]);
    const job = result.rows[0];

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (statuses.includes(job.status)) {
      return;
    }

    if (job.status === 'failed') {
      const errorResult = await db.query('SELECT error_message FROM news_jobs WHERE id = $1', [jobId]);
      throw new Error(`Job failed: ${errorResult.rows[0]?.error_message || 'Unknown error'}`);
    }

    await sleep(3000);
  }

  throw new Error(`Timeout waiting for status ${statuses.join(' or ')}`);
}

async function waitForAllScenes(jobId: string, timeout: number = 900000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await db.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed
       FROM news_scenes
       WHERE job_id = $1`,
      [jobId]
    );

    const { total, completed } = result.rows[0];

    if (parseInt(completed) === parseInt(total) && parseInt(total) > 0) {
      return;
    }

    await sleep(5000);
  }

  throw new Error(`Timeout waiting for scenes`);
}

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   DIRECT PIPELINE TEST: Zoom & Overlay Fixes           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let jobId: string | null = null;

  try {
    // Step 1: Prerequisites
    console.log('📋 Checking prerequisites...');
    if (!existsSync(TEST_SCRIPT_PATH)) throw new Error(`Test script not found`);
    if (!existsSync(AVATAR_VIDEO_PATH)) throw new Error(`Avatar video not found`);

    const testScript = readFileSync(TEST_SCRIPT_PATH, 'utf-8');
    console.log(`✅ Ready (script: ${testScript.length} chars, avatar: ${AVATAR_VIDEO_PATH})\n`);

    // Step 2: Create job
    console.log('📝 Creating job...');
    const result = await db.query(
      `INSERT INTO news_jobs (status, raw_script)
       VALUES ('pending', $1)
       RETURNING id`,
      [testScript]
    );
    jobId = result.rows[0].id;
    console.log(`✅ Job created: ${jobId}\n`);

    // Step 3: Queue analysis
    console.log('🧠 Queuing analysis...');
    await queueAnalyze.add('analyze-script', {
      jobId,
      rawScript: testScript,
      provider: 'openai',
    });
    console.log(`✅ Analysis queued\n`);

    // Step 4: Wait for analysis
    console.log('⏳ Waiting for analysis to complete...');
    await waitForStatus(jobId, 'generating_images', 300000);
    console.log(`✅ Analysis complete\n`);

    // Step 5: Wait for images
    console.log('⏳ Waiting for image generation...');
    await waitForAllScenes(jobId, 900000);
    await waitForStatus(jobId, 'review_assets', 60000);
    console.log(`✅ Images complete\n`);

    // Step 6: Upload avatar
    console.log('🎭 Uploading avatar...');
    const publicDir = join(process.cwd(), 'public', 'avatars');
    const fs = require('fs');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const avatarFilename = `avatar-${jobId}.mp4`;
    const publicAvatarPath = join(publicDir, avatarFilename);
    copyFileSync(AVATAR_VIDEO_PATH, publicAvatarPath);

    await db.query(
      `UPDATE news_jobs
       SET avatar_mp4_url = $1, status = 'rendering'
       WHERE id = $2`,
      [`avatars/${avatarFilename}`, jobId]
    );
    console.log(`✅ Avatar uploaded\n`);

    // Step 7: Queue render
    console.log('🎬 Queuing render...');
    await queueRender.add('render-video', { jobId });
    console.log(`✅ Render queued\n`);

    // Step 8: Wait for render
    console.log('⏳ Waiting for render to complete (this may take 10-30 minutes)...');
    await waitForStatus(jobId, 'completed', 1800000);
    console.log(`✅ Render complete!\n`);

    // Step 9: Get final video
    const finalResult = await db.query(
      `SELECT final_video_url FROM news_jobs WHERE id = $1`,
      [jobId]
    );

    const videoPath = finalResult.rows[0].final_video_url || `tmp/${jobId}.mp4`;

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   TEST COMPLETED SUCCESSFULLY! 🎉                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log(`📹 Final Video: ${videoPath}`);
    console.log(`🆔 Job ID: ${jobId}\n`);

    console.log('🎯 VERIFICATION CHECKLIST:');
    console.log('   [ ] Ticker overlay at BOTTOM');
    console.log('   [ ] Ticker stays FIXED');
    console.log('   [ ] Ticker text scrolls SMOOTHLY');
    console.log('   [ ] Images start at 100% scale');
    console.log('   [ ] Zoom rate is CONSTANT');
    console.log('   [ ] NO BLACK BARS\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runTest();
