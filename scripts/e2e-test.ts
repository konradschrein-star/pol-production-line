/**
 * End-to-End Integration Test
 * Tests complete pipeline from script → rendered video
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const API_BASE = 'http://localhost:8347';
const AVATAR_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';
const SCRIPT_PATH = join(__dirname, '..', 'test-script.txt');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer() {
  console.log('🔍 Checking if server is running...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      if (response.ok) {
        console.log('✅ Server is ready!\n');
        return true;
      }
    } catch (e) {
      // Server not ready
    }
    await sleep(2000);
  }
  throw new Error('❌ Server did not start in time');
}

async function createJob() {
  console.log('📝 Step 1: Creating broadcast job...');

  // Read script
  const script = readFileSync(SCRIPT_PATH, 'utf-8');
  console.log(`   Script length: ${script.length} characters`);

  // Read avatar video
  const avatarBuffer = readFileSync(AVATAR_PATH);
  console.log(`   Avatar size: ${(avatarBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Create FormData
  const formData = new FormData();
  formData.append('raw_script', script);
  formData.append('provider', 'google'); // Use Google AI (fast, free)
  formData.append('style_preset_id', ''); // Let it use default
  formData.append('avatar', new Blob([avatarBuffer], { type: 'video/mp4' }), 'avatar.mp4');

  console.log('   Sending request to /api/analyze...');
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create job: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  console.log(`✅ Job created: ${result.job.id}\n`);

  return result.job.id;
}

async function waitForAnalysis(jobId: string) {
  console.log('🤖 Step 2: Waiting for AI script analysis...');

  for (let i = 0; i < 60; i++) {
    const response = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    const job = await response.json();

    console.log(`   Status: ${job.status}`);

    if (job.status === 'generating_images') {
      console.log(`✅ Analysis complete! Generated ${job.scenes?.length || 0} scenes\n`);
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(`Job failed: ${job.error_message}`);
    }

    await sleep(2000);
  }

  throw new Error('Analysis timeout');
}

async function waitForImages(jobId: string) {
  console.log('🎨 Step 3: Waiting for image generation...');

  for (let i = 0; i < 300; i++) { // 10 minutes max
    const response = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    const job = await response.json();

    // Count completed scenes
    const completed = job.scenes?.filter((s: any) => s.generation_status === 'completed').length || 0;
    const total = job.scenes?.length || 0;
    const failed = job.scenes?.filter((s: any) => s.failed_permanently).length || 0;

    console.log(`   Progress: ${completed}/${total} scenes | Failed: ${failed}`);

    if (job.status === 'review_assets') {
      console.log(`✅ Image generation complete!\n`);
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(`Job failed during image generation: ${job.error_message}`);
    }

    await sleep(5000);
  }

  throw new Error('Image generation timeout');
}

async function triggerRender(jobId: string) {
  console.log('🎬 Step 4: Triggering video render...');

  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/render`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to trigger render: ${JSON.stringify(error)}`);
  }

  console.log('✅ Render queued!\n');
}

async function waitForRender(jobId: string) {
  console.log('⏳ Step 5: Waiting for video render...');

  for (let i = 0; i < 180; i++) { // 15 minutes max
    const response = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    const job = await response.json();

    console.log(`   Status: ${job.status}`);

    if (job.status === 'completed') {
      console.log(`✅ Render complete!\n`);
      console.log(`📹 Video URL: ${job.final_video_url}`);
      console.log(`🖼️  Thumbnail: ${job.thumbnail_url || 'Not generated'}\n`);
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(`Render failed: ${job.error_message}`);
    }

    await sleep(5000);
  }

  throw new Error('Render timeout');
}

async function verifyVideo(job: any) {
  console.log('✅ Step 6: Verifying video quality...\n');

  const checks = {
    'Final video URL exists': !!job.final_video_url,
    'Thumbnail generated': !!job.thumbnail_url,
    'All scenes completed': job.scenes?.every((s: any) => s.image_url) || false,
    'No failed scenes': job.scenes?.every((s: any) => !s.failed_permanently) || false,
    'Avatar uploaded': !!job.avatar_mp4_url,
  };

  console.log('Quality Checks:');
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  }

  const allPassed = Object.values(checks).every(v => v);

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 ALL QUALITY CHECKS PASSED!');
  } else {
    console.log('⚠️  SOME QUALITY CHECKS FAILED');
  }
  console.log('='.repeat(60));

  console.log(`\n📊 Final Stats:`);
  console.log(`   Job ID: ${job.id}`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Scenes: ${job.scenes?.length || 0}`);
  console.log(`   Video: ${job.final_video_url}`);
  console.log(`   Thumbnail: ${job.thumbnail_url || 'N/A'}`);
  console.log(`\n🎬 Watch your video at: http://localhost:8347/jobs/${job.id}`);

  return allPassed;
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 END-TO-END INTEGRATION TEST');
  console.log('='.repeat(60) + '\n');

  try {
    await waitForServer();

    const jobId = await createJob();

    await waitForAnalysis(jobId);

    await waitForImages(jobId);

    await triggerRender(jobId);

    const finalJob = await waitForRender(jobId);

    const success = await verifyVideo(finalJob);

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
