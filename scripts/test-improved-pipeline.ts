import 'dotenv/config';
import { db } from '../src/lib/db';
import { queueAnalyze, queueRender } from '../src/lib/queue/queues';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_SCRIPT_PATH = join(process.cwd(), 'test-script-focused.txt');
const TEST_AVATAR_PATH = 'avatars/avatar-e2d3cc06-1cfe-49cd-961e-5c0f4f572036.mp4'; // Reuse existing avatar

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🧪 Testing Improved Script Analyzer & Pacing\n');

  // Verify test script exists
  if (!existsSync(TEST_SCRIPT_PATH)) {
    console.error('❌ Test script not found:', TEST_SCRIPT_PATH);
    process.exit(1);
  }

  const rawScript = readFileSync(TEST_SCRIPT_PATH, 'utf-8');
  console.log(`📄 Test Script: ${rawScript.length} characters`);

  // Count sentences
  const sentenceCount = rawScript.split(/[.!?]+/).filter(s => s.trim().length > 10).length;
  console.log(`📊 Estimated sentences: ${sentenceCount}`);
  console.log(`📊 Expected scenes: ~${sentenceCount} (1 per sentence)\n`);

  // Create new job
  const result = await db.query(
    `INSERT INTO news_jobs (raw_script, avatar_mp4_url, status)
     VALUES ($1, $2, 'pending')
     RETURNING id`,
    [rawScript, TEST_AVATAR_PATH]
  );

  const jobId = result.rows[0].id;
  console.log(`✅ Created job: ${jobId}\n`);

  // Queue analysis
  await queueAnalyze.add('analyze-script', { jobId });
  console.log('⏳ Queued analysis job...\n');

  // Wait for analysis to complete
  console.log('Monitoring analysis progress:\n');

  let attempts = 0;
  while (attempts < 60) {
    await sleep(2000);
    attempts++;

    const jobResult = await db.query(
      'SELECT status, error_message FROM news_jobs WHERE id = $1',
      [jobId]
    );
    const job = jobResult.rows[0];

    if (job.status === 'generating_images') {
      console.log(`✅ Analysis complete! Job moved to: ${job.status}\n`);
      break;
    }

    if (job.status === 'failed') {
      console.error(`❌ Analysis failed: ${job.error_message}`);
      process.exit(1);
    }

    if (attempts % 5 === 0) {
      console.log(`   [${attempts * 2}s] Still analyzing...`);
    }
  }

  // Check generated scenes
  const scenesResult = await db.query(
    'SELECT COUNT(*) as count FROM news_scenes WHERE job_id = $1',
    [jobId]
  );
  const sceneCount = parseInt(scenesResult.rows[0].count);

  console.log(`\n📊 ANALYSIS RESULTS:`);
  console.log(`   Sentences in script: ~${sentenceCount}`);
  console.log(`   Scenes generated: ${sceneCount}`);
  console.log(`   Ratio: ${(sceneCount / sentenceCount).toFixed(2)} scenes/sentence`);

  if (sceneCount < sentenceCount * 0.8) {
    console.warn(`\n⚠️  WARNING: Scene count is low (expected ~${sentenceCount}, got ${sceneCount})`);
  } else {
    console.log(`\n✅ Scene count looks good!`);
  }

  // Show sample scenes to verify relevance
  const sampleScenes = await db.query(
    `SELECT scene_order, ticker_headline, image_prompt
     FROM news_scenes
     WHERE job_id = $1
     ORDER BY scene_order
     LIMIT 5`,
    [jobId]
  );

  console.log(`\n📋 Sample scenes (first 5):\n`);
  sampleScenes.rows.forEach(s => {
    console.log(`${s.scene_order}. ${s.ticker_headline}`);
    console.log(`   Prompt: ${s.image_prompt.substring(0, 100)}...`);
    console.log();
  });

  console.log(`\n🎯 NEXT STEPS:`);
  console.log(`   1. Review the scenes above - do they match the script content?`);
  console.log(`   2. If they look good, we can proceed with image generation & render`);
  console.log(`\n   Job ID: ${jobId}`);
  console.log(`   To continue: npx tsx scripts/continue-test-render.ts ${jobId}`);

  process.exit(0);
}

run().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
