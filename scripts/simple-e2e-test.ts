#!/usr/bin/env node
/**
 * Simple E2E Test - Uses test-script.txt and test avatar
 * No server needed - direct queue/worker approach
 */

import 'dotenv/config';
import { readFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { db } from '../src/lib/db';
import { analyzeScript } from '../src/lib/ai';
import { queueImages } from '../src/lib/queue/queues';

const TEST_SCRIPT = join(process.cwd(), 'test-script.txt');
const TEST_AVATAR = 'avatars/avatar-e2d3cc06-1cfe-49cd-961e-5c0f4f572036.mp4';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🧪 SIMPLE E2E TEST');
  console.log('==================\n');

  // Verify test files exist
  if (!existsSync(TEST_SCRIPT)) {
    console.error('❌ test-script.txt not found!');
    process.exit(1);
  }

  const rawScript = readFileSync(TEST_SCRIPT, 'utf-8');
  console.log(`✅ Test script loaded (${rawScript.length} chars)\n`);

  // Step 1: Create job
  console.log('Step 1/5: Creating job...');
  const result = await db.query(
    'INSERT INTO news_jobs (raw_script, avatar_mp4_url, status) VALUES ($1, $2, $3) RETURNING id',
    [rawScript, TEST_AVATAR, 'pending']
  );
  const jobId = result.rows[0].id;
  console.log(`✅ Job: ${jobId}\n`);

  // Step 2: Analyze script directly (no queue delay)
  console.log('Step 2/5: Analyzing script...');
  const analysis = await analyzeScript(rawScript);
  console.log(`✅ Generated ${analysis.scenes.length} scenes\n`);

  // Save to database
  await db.query(
    'UPDATE news_jobs SET status = $1, avatar_script = $2 WHERE id = $3',
    ['generating_images', rawScript, jobId]
  );

  for (const scene of analysis.scenes) {
    await db.query(
      'INSERT INTO news_scenes (job_id, scene_order, image_prompt, ticker_headline) VALUES ($1, $2, $3, $4)',
      [jobId, scene.id, scene.image_prompt, scene.ticker_headline]
    );
  }

  // Step 3: Queue images
  console.log('Step 3/5: Queuing image generation...');
  const scenes = await db.query(
    'SELECT id, image_prompt FROM news_scenes WHERE job_id = $1',
    [jobId]
  );

  for (const scene of scenes.rows) {
    await queueImages.add('generate-image', {
      jobId,
      sceneId: scene.id,
      imagePrompt: scene.image_prompt,
    });
  }
  console.log(`✅ ${scenes.rows.length} images queued\n`);

  // Step 4: Monitor images
  console.log('Step 4/5: Monitoring image generation...');
  console.log('(Workers must be running for this to work)\n');

  let lastCompleted = 0;
  while (true) {
    await sleep(10000);

    const progress = await db.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as completed FROM news_scenes WHERE job_id = $1',
      [jobId]
    );

    const { total, completed } = progress.rows[0];

    if (completed > lastCompleted) {
      console.log(`[${new Date().toLocaleTimeString()}] Progress: ${completed}/${total}`);
      lastCompleted = completed;
    }

    if (completed >= total) {
      console.log(`✅ All images generated!\n`);
      break;
    }
  }

  // Step 5: Copy images to public and queue render
  console.log('Step 5/5: Copying images and queuing render...');

  const publicDir = join(process.cwd(), 'public', 'images');
  const scenesList = await db.query(
    'SELECT id, image_url FROM news_scenes WHERE job_id = $1',
    [jobId]
  );

  for (const scene of scenesList.rows) {
    if (scene.image_url && existsSync(scene.image_url)) {
      const filename = scene.image_url.split(/[/\\]/).pop();
      const destPath = join(publicDir, filename);
      copyFileSync(scene.image_url, destPath);
      await db.query(
        'UPDATE news_scenes SET image_url = $1 WHERE id = $2',
        [`images/${filename}`, scene.id]
      );
    }
  }

  // Queue render
  const { queueRender } = await import('../src/lib/queue/queues.js');
  await db.query('UPDATE news_jobs SET status = $1 WHERE id = $2', ['rendering', jobId]);
  await queueRender.add('render-video', { jobId });
  console.log('✅ Render queued\n');

  // Monitor render
  console.log('Monitoring render progress...\n');
  while (true) {
    await sleep(10000);
    const job = await db.query('SELECT status FROM news_jobs WHERE id = $1', [jobId]);
    const status = job.rows[0].status;

    console.log(`[${new Date().toLocaleTimeString()}] Status: ${status}`);

    if (status === 'completed') {
      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║              ✅ TEST COMPLETE!                           ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');
      console.log(`📹 Video: C:\\Users\\konra\\ObsidianNewsDesk\\videos\\${jobId}.mp4`);
      console.log(`🆔 Job: ${jobId}\n`);
      break;
    }

    if (status === 'failed') {
      const errorJob = await db.query('SELECT error_message FROM news_jobs WHERE id = $1', [jobId]);
      console.log('\n❌ TEST FAILED:', errorJob.rows[0].error_message);
      process.exit(1);
    }
  }

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ TEST ERROR:', error);
  process.exit(1);
});
