import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisOptions } from '../index';
import { db } from '../../db';
import { withTransaction, transitionJobState } from '../../db/transactions';
import { renderNewsVideo } from '../../remotion/render';
import { saveFile, resolveFilePath } from '../../storage/local';
import { unlinkSync } from 'fs';
import { transcribeFile } from '../../transcription/whisper';
import { WordTimestamp, SceneSentenceInfo } from '../../remotion/types';
import { ensureContinuousCoverageSimple } from '../../transcription/sentence-matcher';
import { prepareRenderAssets } from '../../remotion/asset-preparation';
import { validateSceneQuality } from '../../video/quality-check';
import { verifyFFmpegInstallation, validateMP4Format } from '../../remotion/video-utils';
import { checkDiskSpace } from '../../storage/local';

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
    let tempFilePath: string | null = null;
    let finalVideoPath: string | null = null;

    console.log(`\n🎬 [RENDER] Starting render for job ${jobId}`);

    try {
      // 1. Fetch job data and validate state
      console.log(`📋 [RENDER] Fetching job data...`);

      const jobResult = await db.query(
        'SELECT id, status, avatar_mp4_url, word_timestamps FROM news_jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const { status, avatar_mp4_url, word_timestamps } = jobResult.rows[0];

      // CRITICAL: Validate job is in rendering state
      // This prevents wasting 20+ minutes rendering cancelled or failed jobs
      if (status !== 'rendering') {
        throw new Error(
          `Job must be in 'rendering' state to render (currently: ${status}). ` +
          `This job may have been cancelled or already completed.`
        );
      }

      console.log(`✅ [RENDER] Job state validated: ${status}`);

      if (!avatar_mp4_url) {
        throw new Error('Avatar MP4 path not found. Upload avatar first.');
      }

      // CRITICAL FIX #25: Pre-flight disk space check
      console.log(`💾 [RENDER] Checking disk space...`);
      const diskSpace = checkDiskSpace(500); // Require 500MB free
      if (!diskSpace.available) {
        throw new Error(
          `Insufficient disk space for render. Available: ${diskSpace.availableMB}MB, Required: ${diskSpace.requiredMB}MB. ` +
          `Please free up space at: ${diskSpace.path}`
        );
      }
      console.log(`✅ [RENDER] Disk space OK: ${diskSpace.availableMB}MB available`);

      // 2. Fetch scenes (with timing data for database-driven pacing)
      const scenesResult = await db.query(
        `SELECT id, image_url, ticker_headline, scene_order,
                sentence_text, narrative_position, shot_type,
                word_start_time, word_end_time
         FROM news_scenes
         WHERE job_id = $1
         ORDER BY scene_order`,
        [jobId]
      );

      const scenes = scenesResult.rows;

      if (scenes.length === 0) {
        throw new Error('No scenes found for this job');
      }

      // Check all scenes have images (database level)
      const missingImages = scenes.filter(s => !s.image_url);
      if (missingImages.length > 0) {
        throw new Error(`${missingImages.length} scenes missing image_url in database`);
      }

      console.log(`✅ [RENDER] Job data loaded: ${scenes.length} scenes`);

      // 3. Check if we have stored timing data (preferred method)
      const hasStoredTiming = scenes.every(s => s.word_start_time !== null && s.word_end_time !== null);

      if (hasStoredTiming) {
        console.log(`✅ [RENDER] All scenes have stored timing from database (fast path)`);
      } else {
        const scenesWithTiming = scenes.filter(s => s.word_start_time !== null && s.word_end_time !== null).length;
        console.warn(`⚠️  [RENDER] Only ${scenesWithTiming}/${scenes.length} scenes have stored timing`);
        console.warn(`   Will use fallback: fuzzy matching or time-based pacing`);
      }

      // Build explicit scene-to-sentence mapping for fallback pacing
      const sceneSentences = scenes.every(s => s.sentence_text)
        ? scenes.map(s => ({
            sceneOrder: s.scene_order,
            sentenceText: s.sentence_text!,
            narrativePosition: s.narrative_position || 'development'
          }))
        : undefined;

      // 4. Prepare word timestamps for transcription (if available)
      let wordTimestamps: WordTimestamp[] | undefined = word_timestamps ? JSON.parse(JSON.stringify(word_timestamps)) : undefined;

      // QUALITY CHECK: Validate scene timing and coverage BEFORE rendering
      // This prevents wasting 20+ minutes on a render that will have black screens
      console.log(`\n🔍 [RENDER] Running pre-render quality checks...`);

      // We need to calculate pacing first to validate timing
      const { calculateTranscriptBasedPacing, calculateScenePacing } = await import('../../remotion/pacing');
      const { getVideoDuration } = await import('../../remotion/video-utils');

      // Get avatar duration
      const avatarDurationSeconds = await getVideoDuration(avatar_mp4_url);
      console.log(`   Avatar duration: ${avatarDurationSeconds.toFixed(2)}s`);

      // Calculate pacing: Use stored timing if available, otherwise fallback to pacing algorithm
      let pacing;

      if (hasStoredTiming) {
        // FAST PATH: Use stored timing from database (no matching needed!)
        console.log(`🚀 [RENDER] Using stored timing from database (O(1) lookup)`);

        // CRITICAL FIX (Bug #28): Validate stored timing data before use
        // This prevents using corrupt database timing that causes render failures
        const invalidScenes: string[] = [];

        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const start = scene.word_start_time!;
          const end = scene.word_end_time!;

          // Validate timing bounds
          if (start < 0 || end < 0) {
            invalidScenes.push(`Scene ${i}: negative timestamp (start=${start}, end=${end})`);
          } else if (start >= end) {
            invalidScenes.push(`Scene ${i}: start >= end (start=${start}, end=${end})`);
          } else if (end > avatarDurationSeconds + 1) { // Allow 1s tolerance
            invalidScenes.push(`Scene ${i}: end time exceeds avatar duration (end=${end}, avatar=${avatarDurationSeconds})`);
          }
        }

        if (invalidScenes.length > 0) {
          console.error(`❌ [RENDER] Invalid stored timing detected:`);
          invalidScenes.forEach(err => console.error(`   - ${err}`));
          throw new Error(
            `Database timing validation failed for ${invalidScenes.length} scene(s). ` +
            `Timing data may be corrupt. Please regenerate the job.`
          );
        }

        console.log(`✅ [RENDER] Stored timing validated (all scenes within bounds)`);

        const sceneTiming = scenes.map((scene, i) => ({
          sceneId: `scene_${i}`,
          startFrame: Math.round(scene.word_start_time! * 30),
          durationInFrames: Math.round((scene.word_end_time! - scene.word_start_time!) * 30),
          durationInSeconds: scene.word_end_time! - scene.word_start_time!
        }));

        // Count hook/body scenes
        const hookScenes = scenes.filter(s => s.narrative_position === 'opening').length;

        // Ensure continuous coverage (adjust for rounding errors)
        const totalFrames = Math.round(avatarDurationSeconds * 30);
        ensureContinuousCoverageSimple(sceneTiming, totalFrames);

        pacing = {
          totalDurationInFrames: totalFrames,
          totalDurationInSeconds: avatarDurationSeconds,
          sceneTiming,
          hookScenes,
          bodyScenes: scenes.length - hookScenes
        };

        console.log(`✅ [RENDER] Timing loaded from database: ${sceneTiming.length} scenes`);
      } else {
        // FALLBACK: Use pacing algorithm (fuzzy matching or time-based)
        console.log(`⚠️  [RENDER] Falling back to pacing algorithm`);

        pacing = wordTimestamps && wordTimestamps.length > 0
          ? calculateTranscriptBasedPacing({
              avatarDurationSeconds,
              wordTimestamps,
              sceneCount: scenes.length,
              sceneSentences,  // Pass database sentence mapping for fuzzy matching
              fps: 30,
            })
          : calculateScenePacing(avatarDurationSeconds, scenes.length, 30);
      }

      // VALIDATION: Ensure pacing matches scene count
      if (pacing.sceneTiming.length !== scenes.length) {
        throw new Error(
          `Pacing mismatch: ${pacing.sceneTiming.length} timings for ${scenes.length} scenes. ` +
          `This indicates a critical error in the pacing algorithm.`
        );
      }

      // VALIDATION: Ensure all scenes have valid durations
      const invalidTimings = pacing.sceneTiming.filter(t => t.durationInFrames <= 0);
      if (invalidTimings.length > 0) {
        throw new Error(
          `${invalidTimings.length} scenes have invalid duration (≤0 frames). ` +
          `Scene IDs: ${invalidTimings.map(t => t.sceneId).join(', ')}`
        );
      }

      console.log(`✅ [RENDER] Pacing validation passed`);
      console.log(`   Hook scenes: ${pacing.hookScenes}`);
      console.log(`   Body scenes: ${pacing.bodyScenes}`);
      console.log(`   Total duration: ${pacing.totalDurationInSeconds.toFixed(2)}s (${pacing.totalDurationInFrames} frames)`);

      // CRITICAL FIX (Bug #24): Run quality checks BEFORE asset preparation
      // This prevents wasting time preparing assets for videos with bad pacing
      const qualityCheck = validateSceneQuality(scenes, pacing.sceneTiming, pacing.totalDurationInFrames, 30);

      if (!qualityCheck.passed) {
        const errorMessage = `Quality check failed:\n${qualityCheck.errors.join('\n')}`;
        console.error(`❌ [RENDER] ${errorMessage}`);
        throw new Error(errorMessage);
      }

      if (qualityCheck.warnings.length > 0) {
        console.warn(`⚠️  [RENDER] Quality check passed with warnings:`);
        qualityCheck.warnings.forEach((warn) => console.warn(`   - ${warn}`));
      } else {
        console.log(`✅ [RENDER] Quality check passed - no issues detected`);
      }

      // CRITICAL: Validate and prepare assets AFTER quality check passes
      // This copies images from storage to public folder where Remotion can access them
      console.log(`\n🔍 [RENDER] Validating and preparing assets...`);

      const assetValidation = await prepareRenderAssets(jobId, scenes, avatar_mp4_url);

      if (!assetValidation.valid) {
        // Build detailed error message
        const errors = [
          ...assetValidation.missingImages.map(id => `Scene ${id}: image file not found in storage`),
          ...assetValidation.invalidPaths.map(p => `Invalid or inaccessible path: ${p}`),
          ...assetValidation.copyErrors.map(e => `Failed to prepare scene ${e.sceneId}: ${e.error}`),
        ];

        if (assetValidation.avatarError) {
          errors.push(`Avatar error: ${assetValidation.avatarError}`);
        }

        const errorMessage = `Asset validation failed:\n${errors.join('\n')}`;
        console.error(`❌ [RENDER] ${errorMessage}`);

        throw new Error(errorMessage);
      }

      console.log(`✅ [RENDER] All assets validated and prepared for rendering`);

      // Transcribe avatar for word timestamps (if not already done)

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
          // PRODUCTION HARDENING: Record transcription failure in job metadata
          // This allows users to see the error and understand degraded video quality
          const errorMessage = error instanceof Error ? error.message : String(error);

          console.warn(`⚠️ [RENDER] Transcription failed:`, errorMessage);
          console.warn(`   Continuing with time-based pacing (fallback)`);

          // Store error in job_metadata for visibility (nested jsonb_set)
          await db.query(
            `UPDATE news_jobs
             SET job_metadata = jsonb_set(
               jsonb_set(
                 COALESCE(job_metadata, '{}'::jsonb),
                 '{transcription_error}',
                 to_jsonb($1::text)
               ),
               '{transcription_fallback}',
               'true'::jsonb
             )
             WHERE id = $2`,
            [errorMessage, jobId]
          );

          console.log(`💾 [RENDER] Transcription error recorded in job metadata`);

          wordTimestamps = undefined;
        }
      } else {
        console.log(`✅ [RENDER] Using cached word timestamps: ${wordTimestamps.length} words`);
      }

      // 4. Render video with progress logging
      console.log(`🎥 [RENDER] Starting Remotion render...`);

      // Initial log message
      await db.query(
        `UPDATE news_jobs
         SET render_logs = jsonb_build_array(
           jsonb_build_object(
             'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
             'type', 'info',
             'message', 'Starting video render...'
           )
         )
         WHERE id = $1`,
        [jobId]
      );

      const renderStartTime = Date.now();
      let lastLoggedProgress = 0;

      // Progress callback: Push frame progress to database (throttled to every 2%)
      const onProgress = async (info: { renderedFrames: number; totalFrames: number; progress: number }) => {
        const progressPercent = Math.floor(info.progress * 100);

        // Only log every 2% to avoid too many DB writes
        if (progressPercent >= lastLoggedProgress + 2 || progressPercent === 100) {
          lastLoggedProgress = progressPercent;

          try {
            await db.query(
              `UPDATE news_jobs
               SET render_logs = COALESCE(render_logs, '[]'::jsonb) || jsonb_build_array(
                 jsonb_build_object(
                   'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                   'type', 'info',
                   'message', 'Frame ' || $1 || '/' || $2 || ' rendered (' || $3 || '%)'
                 )
               )
               WHERE id = $4`,
              [info.renderedFrames, info.totalFrames, progressPercent, jobId]
            );
          } catch (error) {
            // Don't fail render if logging fails
            console.error(`Failed to log progress:`, error);
          }
        }
      };

      const renderResult = await renderNewsVideo({
        jobId,
        avatarMp4Url: avatar_mp4_url,
        scenes,
        wordTimestamps,
        onProgress,
      });

      // Track temp file for cleanup
      tempFilePath = renderResult.outputPath;

      const renderTimeMs = Date.now() - renderStartTime;

      console.log(`✅ [RENDER] Video rendered to temp location: ${renderResult.outputPath}`);
      console.log(`   Size: ${(renderResult.sizeInBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Render time: ${(renderTimeMs / 1000).toFixed(1)}s`);

      // CRITICAL: Validate MP4 output format (Bug #18 fix)
      // This prevents marking corrupted/partial MP4 files as successful
      console.log(`\n🔍 [RENDER] Validating MP4 output format...`);
      const mp4Validation = await validateMP4Format(renderResult.outputPath);

      if (!mp4Validation.valid) {
        throw new Error(
          `Rendered MP4 is invalid or corrupted: ${mp4Validation.error}. ` +
          `The render completed but produced an unplayable video file.`
        );
      }

      console.log(`✅ [RENDER] MP4 validation passed`);
      console.log(`   Format: Valid MP4 (ftyp signature present)`);
      console.log(`   Duration: ${mp4Validation.durationSeconds?.toFixed(2)}s`);

      // Add completion log
      await db.query(
        `UPDATE news_jobs
         SET render_logs = COALESCE(render_logs, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object(
             'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
             'type', 'success',
             'message', 'Render completed in ' || $1 || 's (' || $2 || ' MB)'
           )
         )
         WHERE id = $3`,
        [(renderTimeMs / 1000).toFixed(1), (renderResult.sizeInBytes / 1024 / 1024).toFixed(2), jobId]
      );

      // 4. Move to permanent local storage
      console.log(`💾 [RENDER] Moving to permanent storage...`);

      const filename = `${jobId}.mp4`;
      finalVideoPath = await saveFile(
        renderResult.outputPath,
        'videos',
        filename
      ); // Returns relative path: "videos/jobId.mp4"

      console.log(`✅ [RENDER] Video saved: ${finalVideoPath} (relative path)`);

      // 5. Generate thumbnail from rendered video
      console.log(`🖼️ [RENDER] Generating thumbnail...`);

      let thumbnailUrl: string | null = null;
      let thumbnailGeneratedAt: Date | null = null;

      try {
        const { generateThumbnailWithRetry } = await import('../../integrations/thumbnail-api');

        // Resolve to absolute path for thumbnail generation
        const absoluteVideoPath = resolveFilePath(finalVideoPath);

        const thumbnailResult = await generateThumbnailWithRetry(absoluteVideoPath, jobId, {
          timestamp: 5, // Extract frame at 5 seconds
          width: 640, // 640px wide
          quality: 2, // High quality
        });

        thumbnailUrl = thumbnailResult.thumbnailPath;
        thumbnailGeneratedAt = new Date();

        console.log(`✅ [RENDER] Thumbnail generated: ${thumbnailUrl}`);
        console.log(`   Size: ${(thumbnailResult.sizeInBytes / 1024).toFixed(2)} KB`);

      } catch (error) {
        // Don't fail the entire render if thumbnail generation fails
        console.warn(`⚠️ [RENDER] Thumbnail generation failed:`, error);
        console.warn(`   Job will complete without thumbnail`);
      }

      // PRODUCTION HARDENING: Update job status and metrics in transaction
      // This ensures job state and metrics are updated atomically
      const metrics = await withTransaction(async (client) => {
        // Transition job state with advisory lock
        const transitioned = await transitionJobState(client, jobId, 'rendering', 'completed');

        if (!transitioned) {
          throw new Error('Failed to transition job to completed (unexpected state or already completed)');
        }

        // Update job with video URL and thumbnail
        await client.query(
          `UPDATE news_jobs
           SET final_video_url = $1,
               thumbnail_url = $2,
               thumbnail_generated_at = $3
           WHERE id = $4`,
          [finalVideoPath, thumbnailUrl, thumbnailGeneratedAt, jobId]
        );

        // Calculate total image generation time from generation_history
        const imageGenTimeResult = await client.query(
          `SELECT COALESCE(SUM(generation_time_ms), 0) as total_image_gen_time_ms
           FROM generation_history
           WHERE job_id = $1 AND success = true`,
          [jobId]
        );

        const totalImageGenTimeMs = parseInt(imageGenTimeResult.rows[0].total_image_gen_time_ms);

        // Calculate total processing time (from job creation to completion)
        const totalTimeResult = await client.query(
          `SELECT EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 as total_processing_time_ms
           FROM news_jobs
           WHERE id = $1`,
          [jobId]
        );

        const totalProcessingTimeMs = Math.round(parseFloat(totalTimeResult.rows[0].total_processing_time_ms));

        // Update job_metrics with all timing data
        await client.query(
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

        // Return metrics for logging
        return { totalImageGenTimeMs, totalProcessingTimeMs };
      });

      console.log(`💾 [RENDER] Job ${jobId} marked as completed`);
      console.log(`📊 [RENDER] Metrics updated:`);
      console.log(`   - Render time: ${(renderTimeMs / 1000).toFixed(1)}s`);
      console.log(`   - Image generation total: ${(metrics.totalImageGenTimeMs / 1000).toFixed(1)}s`);
      console.log(`   - Total processing: ${(metrics.totalProcessingTimeMs / 1000).toFixed(1)}s`);
      console.log(`   - Video size: ${(renderResult.sizeInBytes / 1024 / 1024).toFixed(2)} MB`);
      if (thumbnailUrl) {
        console.log(`   - Thumbnail: Generated`);
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

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update job status to failed and add error log
      await db.query(
        `UPDATE news_jobs
         SET status = $1,
             error_message = $2,
             render_logs = COALESCE(render_logs, '[]'::jsonb) || jsonb_build_array(
               jsonb_build_object(
                 'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                 'type', 'error',
                 'message', 'Render failed: ' || $2
               )
             )
         WHERE id = $3`,
        ['failed', errorMessage, jobId]
      );

      throw error;

    } finally {
      // CRITICAL: Clean up temp file (success OR failure)
      if (tempFilePath && finalVideoPath && tempFilePath !== finalVideoPath) {
        try {
          unlinkSync(tempFilePath);
          console.log(`🗑️ [RENDER] Cleaned up temp file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error(`⚠️ [RENDER] Failed to cleanup temp file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
      }
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

// CRITICAL FIX #23: Verify FFmpeg is installed before processing jobs
const ffmpegCheck = verifyFFmpegInstallation();
if (!ffmpegCheck.success) {
  console.error(`\n⛔ [RENDER] CRITICAL: ${ffmpegCheck.error}`);
  console.error(`⛔ [RENDER] Render worker will NOT process jobs until FFmpeg is installed.\n`);
  process.exit(1); // Fail fast - don't start worker without FFmpeg
}

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
