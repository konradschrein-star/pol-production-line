import { Worker, Job } from 'bullmq';
import { redisConnection } from '../index';
import { db } from '../../db';
import { renderNewsVideo } from '../../remotion/render';
import { saveFile } from '../../storage/local';
import { unlinkSync } from 'fs';

interface RenderJobData {
  jobId: string;
}

/**
 * Render Worker
 * Processes final video rendering using Remotion
 */
export const renderWorker = new Worker<RenderJobData>(
  'queue_render',
  async (job: Job<RenderJobData>) => {
    const { jobId } = job.data;

    console.log(`\n🎬 [RENDER] Starting render for job ${jobId}`);

    try {
      // 1. Fetch job data
      console.log(`📋 [RENDER] Fetching job data...`);

      const jobResult = await db.query(
        'SELECT id, avatar_mp4_url FROM news_jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const { avatar_mp4_url } = jobResult.rows[0];

      if (!avatar_mp4_url) {
        throw new Error('Avatar MP4 path not found. Upload avatar first.');
      }

      // 2. Fetch scenes
      const scenesResult = await db.query(
        `SELECT id, image_url, ticker_headline, scene_order
         FROM news_scenes
         WHERE job_id = $1
         ORDER BY scene_order`,
        [jobId]
      );

      const scenes = scenesResult.rows;

      if (scenes.length === 0) {
        throw new Error('No scenes found for this job');
      }

      // Check all scenes have images
      const missingImages = scenes.filter(s => !s.image_url);
      if (missingImages.length > 0) {
        throw new Error(`${missingImages.length} scenes missing images`);
      }

      console.log(`✅ [RENDER] Job data loaded: ${scenes.length} scenes`);

      // 3. Render video
      console.log(`🎥 [RENDER] Starting Remotion render...`);

      const renderResult = await renderNewsVideo({
        jobId,
        avatarMp4Url: avatar_mp4_url,
        scenes,
      });

      console.log(`✅ [RENDER] Video rendered to temp location: ${renderResult.outputPath}`);
      console.log(`   Size: ${(renderResult.sizeInBytes / 1024 / 1024).toFixed(2)} MB`);

      // 4. Move to permanent local storage
      console.log(`💾 [RENDER] Moving to permanent storage...`);

      const filename = `${jobId}.mp4`;
      const finalVideoPath = await saveFile(
        renderResult.outputPath,
        'videos',
        filename
      );

      console.log(`✅ [RENDER] Video saved to: ${finalVideoPath}`);

      // 5. Update job in database with LOCAL PATH
      await db.query(
        'UPDATE news_jobs SET final_video_url = $1, status = $2 WHERE id = $3',
        [finalVideoPath, 'completed', jobId]
      );

      console.log(`💾 [RENDER] Job ${jobId} marked as completed`);

      // 6. Clean up temp file (if different from final path)
      if (renderResult.outputPath !== finalVideoPath) {
        try {
          unlinkSync(renderResult.outputPath);
          console.log(`🗑️ [RENDER] Cleaned up temp file`);
        } catch (error) {
          console.warn(`⚠️ [RENDER] Could not delete temp file: ${error.message}`);
        }
      }

      console.log(`✅ [RENDER] Job ${jobId} render complete!\n`);

      return {
        success: true,
        jobId,
        finalVideoUrl: finalVideoPath,
        durationInSeconds: renderResult.durationInSeconds,
        sizeInBytes: renderResult.sizeInBytes,
      };

    } catch (error) {
      console.error(`❌ [RENDER] Job ${jobId} failed:`, error);

      // Update job status to failed
      await db.query(
        'UPDATE news_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, jobId]
      );

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one render at a time (CPU intensive)
    limiter: {
      max: 5, // Max 5 renders
      duration: 60000, // Per minute
    },
  }
);

renderWorker.on('completed', (job) => {
  console.log(`✅ [RENDER] Worker completed job ${job.id}`);
});

renderWorker.on('failed', (job, err) => {
  console.error(`❌ [RENDER] Worker failed job ${job?.id}:`, err);
});

renderWorker.on('error', (err) => {
  console.error(`❌ [RENDER] Worker error:`, err);
});

export default renderWorker;
