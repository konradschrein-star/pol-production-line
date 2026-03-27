/**
 * Complete End-to-End Test: Zoom & Overlay Fixes
 * Tests the full pipeline with test script and avatar video
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { readFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

const TEST_SCRIPT_PATH = 'test-script.txt';
const AVATAR_VIDEO_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8347';

interface Job {
  id: string;
  status: string;
  avatar_mp4_url?: string;
  final_video_url?: string;
}

interface Scene {
  id: string;
  generation_status: string;
  image_url: string | null;
}

async function waitForStatus(
  jobId: string,
  targetStatus: string | string[],
  checkInterval: number = 3000,
  timeout: number = 600000 // 10 minutes
): Promise<void> {
  const startTime = Date.now();
  const statuses = Array.isArray(targetStatus) ? targetStatus : [targetStatus];

  console.log(`⏳ Waiting for job to reach status: ${statuses.join(' or ')}...`);

  while (Date.now() - startTime < timeout) {
    const result = await db.query('SELECT status FROM news_jobs WHERE id = $1', [jobId]);
    const job = result.rows[0];

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`   Current status: ${job.status}`);

    if (statuses.includes(job.status)) {
      console.log(`✅ Job reached status: ${job.status}`);
      return;
    }

    if (job.status === 'failed') {
      const errorResult = await db.query('SELECT error_message FROM news_jobs WHERE id = $1', [jobId]);
      throw new Error(`Job failed: ${errorResult.rows[0]?.error_message || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Timeout waiting for status ${statuses.join(' or ')} (waited ${timeout / 1000}s)`);
}

async function waitForAllScenes(
  jobId: string,
  checkInterval: number = 5000,
  timeout: number = 900000 // 15 minutes
): Promise<void> {
  const startTime = Date.now();

  console.log(`⏳ Waiting for all scenes to complete image generation...`);

  while (Date.now() - startTime < timeout) {
    const result = await db.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN generation_status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN generation_status = 'generating' THEN 1 END) as generating,
        COUNT(CASE WHEN generation_status = 'pending' THEN 1 END) as pending
       FROM news_scenes
       WHERE job_id = $1`,
      [jobId]
    );

    const { total, completed, failed, generating, pending } = result.rows[0];

    console.log(`   Progress: ${completed}/${total} completed (${generating} generating, ${pending} pending, ${failed} failed)`);

    if (parseInt(completed) === parseInt(total)) {
      console.log(`✅ All ${total} scenes completed!`);
      return;
    }

    if (parseInt(failed) > 0) {
      console.warn(`⚠️  ${failed} scenes failed, but continuing...`);
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Timeout waiting for scenes to complete (waited ${timeout / 1000}s)`);
}

async function runCompleteTest() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   COMPLETE E2E TEST: Zoom & Overlay Fixes              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let jobId: string | null = null;

  try {
    // Step 1: Check prerequisites
    console.log('📋 Step 1: Checking prerequisites...');

    if (!existsSync(TEST_SCRIPT_PATH)) {
      throw new Error(`Test script not found: ${TEST_SCRIPT_PATH}`);
    }

    if (!existsSync(AVATAR_VIDEO_PATH)) {
      throw new Error(`Avatar video not found: ${AVATAR_VIDEO_PATH}`);
    }

    const testScript = readFileSync(TEST_SCRIPT_PATH, 'utf-8');
    console.log(`✅ Test script loaded (${testScript.length} characters)`);
    console.log(`✅ Avatar video found: ${AVATAR_VIDEO_PATH}`);

    // Step 2: Create job and trigger analysis
    console.log('\n📝 Step 2: Creating job and triggering analysis...');

    // Use FormData to match API expectations
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('raw_script', testScript);
    formData.append('provider', 'openai'); // or 'claude', 'google', 'groq'

    const createResponse = await axios.post(`${API_BASE}/api/analyze`, formData, {
      headers: formData.getHeaders(),
    });

    jobId = createResponse.data.job.id;
    console.log(`✅ Job created: ${jobId}`);
    console.log(`✅ Analysis queued`);

    // Wait for analysis to complete
    await waitForStatus(jobId, 'generating_images', 3000, 300000); // 5 minutes

    // Step 4: Wait for image generation
    console.log('\n🖼️  Step 4: Waiting for image generation...');

    await waitForAllScenes(jobId, 5000, 900000); // 15 minutes

    // Wait for job to reach review_assets
    await waitForStatus(jobId, 'review_assets', 3000, 60000); // 1 minute

    // Step 5: Copy avatar to public folder and upload
    console.log('\n🎭 Step 5: Uploading avatar video...');

    const publicDir = join(process.cwd(), 'public', 'avatars');
    const avatarFilename = `avatar-${jobId}.mp4`;
    const publicAvatarPath = join(publicDir, avatarFilename);

    // Ensure avatars directory exists
    const fs = require('fs');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Copy avatar to public folder
    copyFileSync(AVATAR_VIDEO_PATH, publicAvatarPath);
    console.log(`✅ Avatar copied to: ${publicAvatarPath}`);

    // Update job with avatar URL
    await db.query(
      `UPDATE news_jobs
       SET avatar_mp4_url = $1, status = 'rendering'
       WHERE id = $2`,
      [`avatars/${avatarFilename}`, jobId]
    );

    console.log(`✅ Avatar uploaded, job status → rendering`);

    // Step 6: Trigger render
    console.log('\n🎬 Step 6: Triggering video render...');

    const compileResponse = await axios.post(`${API_BASE}/api/jobs/${jobId}/compile`, {
      // Trigger render via compile endpoint
    });

    console.log(`✅ Render queued`);

    // Wait for render to complete
    await waitForStatus(jobId, 'completed', 10000, 1800000); // 30 minutes

    // Step 7: Get final video URL
    console.log('\n✅ Step 7: Render complete!');

    const finalResult = await db.query(
      `SELECT final_video_url, avatar_mp4_url FROM news_jobs WHERE id = $1`,
      [jobId]
    );

    const finalJob = finalResult.rows[0];

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   TEST COMPLETED SUCCESSFULLY! 🎉                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log(`📹 Final Video: ${finalJob.final_video_url || 'tmp/' + jobId + '.mp4'}`);
    console.log(`🎭 Avatar Video: ${finalJob.avatar_mp4_url}`);
    console.log(`🆔 Job ID: ${jobId}`);

    console.log('\n🎯 VERIFICATION CHECKLIST:');
    console.log('   [ ] Ticker overlay is at the BOTTOM');
    console.log('   [ ] Ticker stays FIXED (no vertical movement)');
    console.log('   [ ] Ticker text scrolls SMOOTHLY');
    console.log('   [ ] Images start at 100% (fill screen)');
    console.log('   [ ] Zoom rate is CONSTANT across all scenes');
    console.log('   [ ] NO BLACK BARS anywhere');
    console.log('   [ ] Avatar properly sized and positioned');

    console.log('\n📂 Open the video to verify all fixes!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);

    if (jobId) {
      console.log(`\n📊 Job Status Check:`);
      const statusResult = await db.query(
        `SELECT status, error_message FROM news_jobs WHERE id = $1`,
        [jobId]
      );
      console.log(statusResult.rows[0]);

      console.log(`\n📊 Scene Status Check:`);
      const sceneResult = await db.query(
        `SELECT generation_status, COUNT(*) as count
         FROM news_scenes
         WHERE job_id = $1
         GROUP BY generation_status`,
        [jobId]
      );
      console.log(sceneResult.rows);
    }

    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run the test
runCompleteTest();
