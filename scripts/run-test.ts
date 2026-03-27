/**
 * Test Script - Full Pipeline Test with Quality Checks
 *
 * Usage: npm run test:full
 *
 * This script:
 * 1. Creates a new job with test inputs
 * 2. Monitors pipeline progress
 * 3. Reports any errors or quality issues
 */

import 'dotenv/config'; // CRITICAL: Load environment variables first
import { db } from '../src/lib/db';
import { Queue } from 'bullmq';
import { redisOptions } from '../src/lib/queue';
import { saveFile } from '../src/lib/storage/local';

// Test inputs from test-inputs.md
const TEST_AVATAR_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';
const TEST_SCRIPT = `Breaking tonight: The Senate passed sweeping climate legislation in a narrow 51-50 vote, marking the largest environmental investment in US history. The $369 billion package includes tax credits for electric vehicles, solar panel installations, and heat pump upgrades for American households. Republicans unanimously opposed the bill, calling it government overreach and warning of inflation risks. Senate Minority Leader criticized the spending levels, arguing the funds would be better spent on reducing the national debt. Climate activists celebrated outside the Capitol, with some calling it a generational victory after decades of failed attempts. Environmental groups estimate the legislation will reduce carbon emissions by 40 percent by 2030, putting the US back on track with Paris Agreement targets. However, economists remain divided on the bill's economic impact. Goldman Sachs projects the tax incentives will create 1.5 million green jobs over the next decade, while the Heritage Foundation warns of potential energy cost increases for middle-class families. The legislation now heads to the House, where Speaker Pelosi has pledged a vote within the week. With midterm elections approaching, both parties see this as a defining moment that could reshape the political landscape. Industry reactions have been mixed. Tesla and Rivian stock surged 8 percent on the news, while traditional oil companies saw modest declines. Energy analysts predict a major shift in consumer behavior as electric vehicle tax credits of up to $7,500 make EVs competitive with gasoline cars for the first time.`;

async function runTest() {
  console.log('🚀 Starting Full Pipeline Test');
  console.log('================================\n');

  try {
    // 1. Create job in database
    console.log('📝 Step 1: Creating test job...');

    const jobResult = await db.query(
      `INSERT INTO news_jobs (raw_script, status)
       VALUES ($1, $2)
       RETURNING id`,
      [TEST_SCRIPT, 'pending']
    );

    const jobId = jobResult.rows[0].id;
    console.log(`✅ Job created: ${jobId}\n`);

    // Initialize metrics
    await db.query(
      `INSERT INTO job_metrics (job_id)
       VALUES ($1)`,
      [jobId]
    );

    // 2. Copy avatar to storage
    console.log('📁 Step 2: Copying avatar to storage...');

    const avatarFilename = `${jobId}-avatar.mp4`;
    const avatarStoragePath = await saveFile(TEST_AVATAR_PATH, 'avatars', avatarFilename);

    console.log(`✅ Avatar copied to: ${avatarStoragePath}\n`);

    // Update job with avatar path
    await db.query(
      'UPDATE news_jobs SET avatar_mp4_url = $1 WHERE id = $2',
      [avatarStoragePath, jobId]
    );

    // 3. Queue analyze job
    console.log('🧠 Step 3: Queueing analysis job...');

    const analyzeQueue = new Queue('queue_analyze', { connection: redisOptions });
    await analyzeQueue.add('analyze', { jobId });

    console.log('✅ Analysis job queued');
    console.log('   Waiting for script analysis to complete...\n');

    // Wait for status to change from 'pending'
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check status
    let status = await getJobStatus(jobId);
    console.log(`   Status: ${status}`);

    if (status === 'failed') {
      const error = await getJobError(jobId);
      throw new Error(`Analysis failed: ${error}`);
    }

    // 4. Wait for image generation
    console.log('\n🎨 Step 4: Generating images...');
    console.log('   This may take 15-20 minutes (Whisk API)');
    console.log('   Monitoring progress...\n');

    let imageGenComplete = false;
    let lastStatus = '';

    while (!imageGenComplete) {
      status = await getJobStatus(jobId);

      if (status !== lastStatus) {
        console.log(`   Status: ${status}`);
        lastStatus = status;
      }

      if (status === 'failed') {
        const error = await getJobError(jobId);
        throw new Error(`Image generation failed: ${error}`);
      }

      if (status === 'review_assets') {
        imageGenComplete = true;
        console.log('✅ Image generation complete!\n');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5s
    }

    // 5. Check scene quality
    console.log('🔍 Step 5: Validating scene quality...');

    const scenes = await db.query(
      'SELECT id, image_url, ticker_headline, scene_order FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
      [jobId]
    );

    console.log(`   Scenes generated: ${scenes.rows.length}`);

    let allValid = true;
    scenes.rows.forEach((scene, i) => {
      const hasImage = !!scene.image_url;
      console.log(`   Scene ${i + 1}: ${hasImage ? '✅' : '❌'} ${scene.ticker_headline.substring(0, 50)}...`);
      if (!hasImage) allValid = false;
    });

    if (!allValid) {
      throw new Error('Some scenes are missing images!');
    }

    console.log('✅ All scenes have images\n');

    // 6. Trigger render
    console.log('🎥 Step 6: Starting video render...');
    console.log('   This may take 2-3 minutes');
    console.log('   Quality checks will run before render starts\n');

    // Update status to trigger render queue
    await db.query(
      'UPDATE news_jobs SET status = $1 WHERE id = $2',
      ['rendering', jobId]
    );

    // Add job to render queue manually
    const renderQueue = new Queue('queue_render', { connection: redisOptions });
    await renderQueue.add('render', { jobId });

    // 7. Wait for render
    let renderComplete = false;
    lastStatus = '';

    while (!renderComplete) {
      status = await getJobStatus(jobId);

      if (status !== lastStatus) {
        console.log(`   Status: ${status}`);
        lastStatus = status;
      }

      if (status === 'failed') {
        const error = await getJobError(jobId);
        throw new Error(`Render failed: ${error}`);
      }

      if (status === 'completed') {
        renderComplete = true;
        console.log('✅ Render complete!\n');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5s
    }

    // 8. Get final video path
    const finalResult = await db.query(
      'SELECT final_video_url, thumbnail_url FROM news_jobs WHERE id = $1',
      [jobId]
    );

    const { final_video_url, thumbnail_url } = finalResult.rows[0];

    console.log('🎉 TEST COMPLETE!');
    console.log('=================\n');
    console.log(`Job ID: ${jobId}`);
    console.log(`Video: ${final_video_url}`);
    if (thumbnail_url) {
      console.log(`Thumbnail: ${thumbnail_url}`);
    }
    console.log('\n✅ All quality checks passed!');

    // Get metrics
    const metricsResult = await db.query(
      `SELECT
         render_time_ms,
         total_image_gen_time_ms,
         total_processing_time_ms,
         final_video_size_bytes,
         final_video_duration_seconds
       FROM job_metrics WHERE job_id = $1`,
      [jobId]
    );

    if (metricsResult.rows.length > 0) {
      const metrics = metricsResult.rows[0];
      console.log('\n📊 Performance Metrics:');
      console.log(`   Image generation: ${(metrics.total_image_gen_time_ms / 1000).toFixed(1)}s`);
      console.log(`   Render time: ${(metrics.render_time_ms / 1000).toFixed(1)}s`);
      console.log(`   Total processing: ${(metrics.total_processing_time_ms / 1000).toFixed(1)}s`);
      console.log(`   Video size: ${(metrics.final_video_size_bytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Video duration: ${metrics.final_video_duration_seconds.toFixed(1)}s`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function getJobStatus(jobId: string): Promise<string> {
  const result = await db.query('SELECT status FROM news_jobs WHERE id = $1', [jobId]);
  return result.rows[0]?.status || 'unknown';
}

async function getJobError(jobId: string): Promise<string> {
  const result = await db.query('SELECT error_message FROM news_jobs WHERE id = $1', [jobId]);
  return result.rows[0]?.error_message || 'Unknown error';
}

// Run test
runTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
