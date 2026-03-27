/**
 * Manual Render Script - Directly renders a job bypassing BullMQ
 */

import 'dotenv/config';
import { renderNewsVideo } from '../src/lib/remotion/render';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JOB_ID = process.argv[2] || '475da744-51f1-43f8-8f9b-5d3c72274bf8';

async function manualRender() {
  try {
    console.log(`\n🎬 Manual Render for Job: ${JOB_ID}\n`);

    // 1. Fetch job data
    const jobResult = await pool.query(
      'SELECT id, avatar_mp4_url FROM news_jobs WHERE id = $1',
      [JOB_ID]
    );

    if (jobResult.rows.length === 0) {
      throw new Error('Job not found');
    }

    const { avatar_mp4_url } = jobResult.rows[0];
    console.log(`✅ Job found`);
    console.log(`   Avatar: ${avatar_mp4_url}`);

    // 2. Fetch scenes
    const scenesResult = await pool.query(
      `SELECT id, image_url, ticker_headline, scene_order
       FROM news_scenes
       WHERE job_id = $1
       ORDER BY scene_order ASC`,
      [JOB_ID]
    );

    const scenes = scenesResult.rows;
    console.log(`✅ Found ${scenes.length} scenes`);

    // Use paths as-is (already in correct format for staticFile())
    const scenesWithHttpUrls = scenes;
    const avatarHttpUrl = avatar_mp4_url;

    console.log(`   Avatar URL: ${avatarHttpUrl}`);
    console.log(`   Scene URLs: Using relative paths from database`);

    // 3. Render video
    console.log(`\n🎥 Starting render...`);
    const result = await renderNewsVideo({
      jobId: JOB_ID,
      avatarMp4Url: avatarHttpUrl,
      scenes: scenesWithHttpUrls,
    });

    console.log(`\n✅ Render complete!`);
    console.log(`   Output: ${result.outputPath}`);
    console.log(`   Duration: ${result.durationInSeconds}s`);
    console.log(`   Size: ${(result.sizeInBytes / 1024 / 1024).toFixed(2)} MB`);

    // 4. Update job status
    await pool.query(
      'UPDATE news_jobs SET status = $1, final_video_url = $2 WHERE id = $3',
      ['completed', result.outputPath, JOB_ID]
    );

    console.log(`\n✅ Job marked as completed`);
    console.log(`   Final video: ${result.outputPath}`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Render failed:`, error);
    process.exit(1);
  }
}

manualRender();
