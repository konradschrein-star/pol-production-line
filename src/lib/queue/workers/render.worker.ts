import { Worker, Job } from 'bullmq';
import { redisOptions } from '../index';
import { db } from '../../db';
import { renderNewsVideo } from '../../remotion/render';
import { saveFile } from '../../storage/local';
import { unlinkSync } from 'fs';
import { transcribeFile } from '../../transcription/whisper';
import { WordTimestamp } from '../../remotion/types';

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
        'SELECT id, avatar_mp4_url, word_timestamps FROM news_jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const { avatar_mp4_url, word_timestamps } = jobResult.rows[0];

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

      // 3. Transcribe avatar for word timestamps (if not already done)
      let wordTimestamps: WordTimestamp[] | undefined = word_timestamps ? JSON.parse(JSON.stringify(word_timestamps)) : undefined;

      if (!wordTimestamps || wordTimestamps.length === 0) {
        console.log(`🎤 [RENDER] No word timestamps found, transcribing avatar...`);

        try {
          wordTimestamps = await transcribeFile(avatar_mp4_url);

          // Store timestamps in database for future use
          await db.query(
            'UPDATE news_jobs SET word_timestamps = $1 WHERE id = $2',
            [JSON.stringify(wordTimestamps), jobId]
          );

          console.log(`✅ [RENDER] Transcription complete: ${wordTimestamps.length} words`);
        } catch (error) {
          console.warn(`⚠️ [RENDER] Transcription failed:`, error);
          console.warn(`   Continuing with time-based pacing (fallback)`);
          wordTimestamps = undefined;
        }
      } else {
        console.log(`✅ [RENDER] Using cached word timestamps: ${wordTimestamps.length} words`);
      }

      // 4. Render video
      console.log(`🎥 [RENDER] Starting Remotion render...`);

      const renderStartTime = Date.now();

      const renderResult = await renderNewsVideo({
        jobId,
        avatarMp4Url: avatar_mp4_url,
        scenes,
        wordTimestamps,
      });

      const renderTimeMs = Date.now() - renderStartTime;

      console.log(`✅ [RENDER] Video rendered to temp location: ${renderResult.outputPath}`);
      console.log(`   Size: ${(renderResult.sizeInBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Render time: ${(renderTimeMs / 1000).toFixed(1)}s`);

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

      // 6. Calculate total image generation time from generation_history
      const imageGenTimeResult = await db.query(
        `SELECT COALESCE(SUM(generation_time_ms), 0) as total_image_gen_time_ms
         FROM generation_history
         WHERE job_id = $1 AND success = true`,
        [jobId]
      );

      const totalImageGenTimeMs = parseInt(imageGenTimeResult.rows[0].total_image_gen_time_ms);

      // 7. Calculate total processing time (from job creation to completion)
      const totalTimeResult = await db.query(
        `SELECT EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 as total_processing_time_ms
         FROM news_jobs
         WHERE id = $1`,
        [jobId]
      );

      const totalProcessingTimeMs = Math.round(parseFloat(totalTimeResult.rows[0].total_processing_time_ms));

      // 8. Update job_metrics with all timing data
      await db.query(
        `UPDATE job_metrics
         SET render_time_ms = $1,
             final_video_size_bytes = $2,
             final_video_duration_seconds = $3,
             total_image_gen_time_ms = $4,
             total_processing_time_ms = $5
         WHERE job_id = $6`,
        [
          renderTimeMs,
          renderResult.sizeInBytes,
          renderResult.durationInSeconds,
          totalImageGenTimeMs,
          totalProcessingTimeMs,
          jobId,
        ]
      );

      console.log(`💾 [RENDER] Job ${jobId} marked as completed`);
      console.log(`📊 [RENDER] Metrics updated:`);
      console.log(`   - Render time: ${(renderTimeMs / 1000).toFixed(1)}s`);
      console.log(`   - Image generation total: ${(totalImageGenTimeMs / 1000).toFixed(1)}s`);
      console.log(`   - Total processing: ${(totalProcessingTimeMs / 1000).toFixed(1)}s`);
      console.log(`   - Video size: ${(renderResult.sizeInBytes / 1024 / 1024).toFixed(2)} MB`);

      // 6. Clean up temp file (if different from final path)
      if (renderResult.outputPath !== finalVideoPath) {
        try {
          unlinkSync(renderResult.outputPath);
          console.log(`🗑️ [RENDER] Cleaned up temp file`);
        } catch (error) {
          console.warn(`⚠️ [RENDER] Could not delete temp file: ${error instanceof Error ? error.message : String(error)}`);
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
        ['failed', error instanceof Error ? error.message : String(error), jobId]
      );

      throw error;
    }
  },
  {
    connection: redisOptions,
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
