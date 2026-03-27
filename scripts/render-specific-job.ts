import { renderVideo } from '../src/lib/remotion/render';
import { db } from '../src/lib/db';
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '.env') });

const jobId = process.argv[2] || '366b1877-87f3-4f0d-9b8e-b4b9c4ad8832';

async function render() {
  console.log(`\n🎬 Rendering job ${jobId}...`);
  
  try {
    // Get job data
    const jobResult = await db.query('SELECT * FROM news_jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }
    const job = jobResult.rows[0];
    
    // Get scenes
    const scenesResult = await db.query(
      'SELECT * FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
      [jobId]
    );
    const scenes = scenesResult.rows;
    
    console.log(`✅ Job status: ${job.status}`);
    console.log(`✅ Scenes: ${scenes.length}`);
    console.log(`✅ Avatar: ${job.avatar_mp4_url}`);
    console.log(`\n🎥 Starting render...`);
    
    // Render
    const outputPath = await renderVideo({
      jobId,
      avatarScript: job.avatar_script || job.raw_script,
      avatarMp4Path: job.avatar_mp4_url,
      scenes: scenes.map((s: any) => ({
        id: s.id,
        imageUrl: s.image_url,
        tickerHeadline: s.ticker_headline,
      })),
    });
    
    console.log(`\n✅ Video rendered successfully!`);
    console.log(`📁 Output: ${outputPath}`);
    
    // Update job status
    await db.query(
      'UPDATE news_jobs SET status = $1, final_video_url = $2, completed_at = NOW() WHERE id = $3',
      ['completed', outputPath, jobId]
    );
    
    console.log(`✅ Job marked as completed`);
    console.log(`\n🎉 RENDER COMPLETE!\n`);
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Render failed:`, error);
    process.exit(1);
  }
}

render();
