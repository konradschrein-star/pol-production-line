import { Worker, Job } from 'bullmq';
import { redisOptions } from '../index';
import { queueAvatarAutomation } from '../queues';
import { db } from '../../db';
import { WhiskAPIClient } from '../../whisk/api';
import { WhiskReferenceImages } from '../../whisk/types';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AdaptiveRateLimiter, calculateBackoff } from '../rate-limiter';
import { PromptSanitizer, quickSanitize } from '../../ai/prompt-sanitizer';

interface ImageJobData {
  sceneId: string;
  imagePrompt: string;
  jobId: string;
}

// PRODUCTION HARDENING CONSTANTS
const MAX_RETRIES = 3; // Maximum retry attempts per scene
const RETRY_BACKOFF_BASE = 5000; // 5s base backoff (5s, 10s, 20s)
const MAX_PROMPT_SANITIZATION_ATTEMPTS = 3; // Max attempts to sanitize a rejected prompt

// Adaptive rate limiter instance (shared across all workers)
const rateLimiter = new AdaptiveRateLimiter({
  minConcurrency: parseInt(process.env.WHISK_MIN_CONCURRENCY || '2'),
  maxConcurrency: parseInt(process.env.WHISK_MAX_CONCURRENCY || '5'),
  initialConcurrency: parseInt(process.env.WHISK_CONCURRENCY || '2'),
});

// Prompt sanitizer for handling content policy violations
const promptSanitizer = new PromptSanitizer();

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get local storage path for images
 */
function getImageStoragePath(): string {
  const storageRoot = process.env.LOCAL_STORAGE_ROOT || 'C:\\Users\\konra\\ObsidianNewsDesk';
  return join(storageRoot, 'images');
}

/**
 * Images Worker
 * Processes individual scenes by generating images via Whisk API
 */
export const imagesWorker = new Worker<ImageJobData>(
  'queue_images',
  async (job: Job<ImageJobData>) => {
    const { sceneId, imagePrompt, jobId } = job.data;

    console.log(`\n🖼️ [IMAGES] Starting image generation for scene ${sceneId}`);
    console.log(`📝 Prompt: ${imagePrompt.substring(0, 100)}...`);

    try {
      // 1. Update scene status
      await db.query(
        'UPDATE news_scenes SET generation_status = $1 WHERE id = $2',
        ['generating', sceneId]
      );

      console.log(`✅ [IMAGES] Scene status updated to 'generating'`);

      // 2. Reference images (disabled - database schema not ready)
      const referenceImages: WhiskReferenceImages | undefined = undefined;

      // 3. Initialize Whisk API client
      const whiskClient = new WhiskAPIClient();

      // 4. Generate image via API with automatic content policy retry
      console.log(`🎨 [IMAGES] Calling Whisk API...`);
      if (referenceImages && Object.keys(referenceImages).length > 0) {
        console.log(`🎨 [IMAGES] Using reference images:`, Object.keys(referenceImages));
      }

      let result;
      let currentPrompt = imagePrompt;
      let sanitizationAttempt = 0;
      const originalPrompt = imagePrompt; // Track original for logging
      const generationStartTime = Date.now(); // Track generation time

      // Retry loop with progressive prompt sanitization
      while (sanitizationAttempt < MAX_PROMPT_SANITIZATION_ATTEMPTS) {
        try {
          // Try quick rule-based sanitization on first attempt
          if (sanitizationAttempt === 0) {
            const quickSanitized = quickSanitize(currentPrompt);
            if (quickSanitized !== currentPrompt) {
              console.log(`🔧 [IMAGES] Quick-sanitized prompt (removed obvious violations)`);
              currentPrompt = quickSanitized;
            }
          }

          const attemptStartTime = Date.now();

          result = await whiskClient.generateImage({
            prompt: currentPrompt,
            aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE', // 16:9 for news videos
            referenceImages: Object.keys(referenceImages || {}).length > 0
              ? referenceImages
              : undefined,
            imageModel: (process.env.WHISK_IMAGE_MODEL as any) || 'IMAGEN_3_5',
          });

          const attemptTimeMs = Date.now() - attemptStartTime;

          if (!result.images || result.images.length === 0) {
            throw new Error('Whisk API returned no images');
          }

          // Success! Record in generation_history
          await db.query(
            `INSERT INTO generation_history
             (scene_id, job_id, attempt_number, image_url, generation_params, success, generation_time_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              sceneId,
              jobId,
              sanitizationAttempt + 1,
              result.images[0].url,
              JSON.stringify({
                prompt: currentPrompt,
                originalPrompt: sanitizationAttempt > 0 ? originalPrompt : null,
                aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
                imageModel: process.env.WHISK_IMAGE_MODEL || 'IMAGEN_3_5',
              }),
              true, // success
              attemptTimeMs,
            ]
          );

          console.log(`✅ [IMAGES] Image generated successfully (${attemptTimeMs}ms)`);
          if (sanitizationAttempt > 0) {
            console.log(`   (Used sanitized prompt after ${sanitizationAttempt} attempt(s))`);
          }
          break;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Check if this is a content policy violation
          const isPolicyViolation =
            errorMessage.includes('content policy') ||
            errorMessage.includes('safety') ||
            errorMessage.includes('inappropriate') ||
            errorMessage.includes('violated') ||
            errorMessage.includes('blocked') ||
            errorMessage.includes('prohibited') ||
            (error as any)?.status === 400; // Whisk may return 400 for policy violations

          if (isPolicyViolation && sanitizationAttempt < MAX_PROMPT_SANITIZATION_ATTEMPTS - 1) {
            sanitizationAttempt++;
            console.warn(`⚠️  [IMAGES] Content policy violation detected (attempt ${sanitizationAttempt}/${MAX_PROMPT_SANITIZATION_ATTEMPTS})`);
            console.warn(`   Error: ${errorMessage.substring(0, 100)}`);
            console.warn(`   Rewriting prompt to be policy-compliant...`);

            // Record failed attempt in generation_history
            await db.query(
              `INSERT INTO generation_history
               (scene_id, job_id, attempt_number, success, error_message, generation_params)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                sceneId,
                jobId,
                sanitizationAttempt,
                false, // success = false
                errorMessage.substring(0, 500), // Truncate error message
                JSON.stringify({ prompt: currentPrompt }),
              ]
            );

            // Use AI to sanitize the prompt
            currentPrompt = await promptSanitizer.sanitizePrompt(
              currentPrompt,
              errorMessage,
              sanitizationAttempt
            );

            // Wait a bit before retrying
            await delay(2000);
            continue;
          }

          // Not a policy violation or out of retries - record failure and throw error
          await db.query(
            `INSERT INTO generation_history
             (scene_id, job_id, attempt_number, success, error_message, generation_params)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              sceneId,
              jobId,
              sanitizationAttempt + 1,
              false, // success = false
              errorMessage.substring(0, 500),
              JSON.stringify({ prompt: currentPrompt }),
            ]
          );

          throw error;
        }
      }

      if (!result) {
        throw new Error(`Failed to generate image after ${MAX_PROMPT_SANITIZATION_ATTEMPTS} sanitization attempts`);
      }

      // 5. Decode base64 image
      const image = result.images[0];
      const imageBuffer = await whiskClient.downloadImage(image.url, image.base64);

      console.log(`✅ [IMAGES] Image decoded from base64`);

      // 6. Save to local storage
      const storageDir = getImageStoragePath();
      const filename = `${sceneId}.jpg`;
      const localPath = join(storageDir, filename);

      // Ensure directory exists
      const { mkdirSync, existsSync } = require('fs');
      if (!existsSync(storageDir)) {
        mkdirSync(storageDir, { recursive: true });
      }

      writeFileSync(localPath, imageBuffer);

      console.log(`💾 [IMAGES] Saved to local storage: ${localPath}`);

      // 7. Update scene in database with LOCAL PATH (simplified - removed metadata columns that don't exist yet)
      await db.query(
        `UPDATE news_scenes
         SET
           image_url = $1,
           generation_status = $2
         WHERE id = $3`,
        [
          localPath,
          'completed',
          sceneId,
        ]
      );

      console.log(`💾 [IMAGES] Database updated with local path`);

      // Record successful generation for rate limiter
      rateLimiter.onSuccess();

      // 8. Check if all scenes for this job are complete
      const progressResult = await db.query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed
         FROM news_scenes
         WHERE job_id = $1`,
        [jobId]
      );

      const { total, completed } = progressResult.rows[0];

      console.log(`📊 [IMAGES] Job progress: ${completed}/${total} scenes complete`);

      if (parseInt(completed) === parseInt(total)) {
        // All scenes done → check avatar mode
        const avatarMode = process.env.AVATAR_MODE || 'manual';

        if (avatarMode === 'automated') {
          // Automated mode: Queue for avatar automation
          await db.query(
            'UPDATE news_jobs SET status = $1 WHERE id = $2',
            ['review_assets', jobId]
          );

          await queueAvatarAutomation.add('generate-avatar', { jobId });

          console.log(`✅ [IMAGES] All scenes complete! Job ${jobId} → avatar automation queued`);
        } else {
          // Manual mode: Pause at review_assets for human intervention
          await db.query(
            'UPDATE news_jobs SET status = $1 WHERE id = $2',
            ['review_assets', jobId]
          );

          console.log(`✅ [IMAGES] All scenes complete! Job ${jobId} → review_assets (manual avatar generation required)`);
        }
      }

      console.log(`✅ [IMAGES] Scene ${sceneId} processing complete\n`);

      return {
        success: true,
        sceneId,
        imageUrl: localPath,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const attemptNumber = job.attemptsMade;

      console.error(`❌ [IMAGES] Scene ${sceneId} failed (attempt ${attemptNumber + 1}/${MAX_RETRIES}):`, errorMessage);

      // Classify error type for appropriate handling
      const isAuthError = errorMessage.includes('401') ||
                          errorMessage.includes('Unauthorized') ||
                          errorMessage.includes('WHISK_API_TOKEN');

      const isRateLimitError = errorMessage.includes('429') ||
                               errorMessage.includes('Rate limit') ||
                               errorMessage.includes('Too many requests');

      if (isAuthError) {
        // Token expired or invalid - pause queue
        console.error('⚠️ [IMAGES] PAUSING QUEUE: Whisk API token expired or invalid');
        await imagesWorker.pause();

        await db.query(
          'UPDATE news_jobs SET status = $1, error_message = $2 WHERE id = $3',
          ['failed', 'Whisk API token expired. Please refresh token in .env and resume queue.', jobId]
        );

        await db.query(
          'UPDATE news_scenes SET generation_status = $1, error_message = $2 WHERE id = $3',
          ['pending', errorMessage, sceneId]
        );

        return; // Exit without throwing (don't retry)
      }

      if (isRateLimitError) {
        // Rate limit - notify rate limiter and use exponential backoff
        rateLimiter.onRateLimit();

        const backoffDelay = calculateBackoff(attemptNumber, 5000, 60000);
        console.warn(`⚠️ [IMAGES] Rate limited. Backing off for ${backoffDelay / 1000}s...`);
        console.warn(`   Current rate limiter stats:`, rateLimiter.getStats());

        await db.query(
          'UPDATE news_scenes SET generation_status = $1, error_message = $2 WHERE id = $3',
          ['pending', `Rate limited. Retrying in ${backoffDelay / 1000}s`, sceneId]
        );

        await delay(backoffDelay);
        throw error; // Retry after backoff
      }

      // Handle retry logic
      if (attemptNumber < MAX_RETRIES - 1) {
        // More retries available - update status and backoff
        rateLimiter.onError(); // Non-rate-limit error

        const backoffDelay = calculateBackoff(attemptNumber, RETRY_BACKOFF_BASE);

        await db.query(
          'UPDATE news_scenes SET generation_status = $1, error_message = $2 WHERE id = $3',
          ['pending', `Failed (attempt ${attemptNumber + 1}). Retrying in ${backoffDelay / 1000}s...`, sceneId]
        );

        console.warn(`⚠️ [IMAGES] Retrying scene ${sceneId} in ${backoffDelay / 1000}s...`);
        await delay(backoffDelay);
        throw error; // BullMQ will retry
      } else {
        // Max retries reached - permanent failure
        await db.query(
          'UPDATE news_scenes SET generation_status = $1, error_message = $2 WHERE id = $3',
          ['failed', `Failed after ${MAX_RETRIES} attempts: ${errorMessage}`, sceneId]
        );

        console.error(`❌ [IMAGES] Scene ${sceneId} PERMANENTLY FAILED after ${MAX_RETRIES} attempts`);
        throw error; // Let BullMQ mark as failed
      }
    }
  },
  {
    connection: redisOptions,
    concurrency: process.env.WHISK_CONCURRENCY ? parseInt(process.env.WHISK_CONCURRENCY) : 2, // 2 parallel generations (configurable)
  }
);

imagesWorker.on('completed', (job) => {
  console.log(`✅ [IMAGES] Worker completed job ${job.id}`);
});

imagesWorker.on('failed', (job, err) => {
  console.error(`❌ [IMAGES] Worker failed job ${job?.id}:`, err);
});

imagesWorker.on('error', (err) => {
  console.error(`❌ [IMAGES] Worker error:`, err);
});

imagesWorker.on('paused', () => {
  console.log('⏸️ [IMAGES] Worker PAUSED - manual intervention required');
});

imagesWorker.on('resumed', () => {
  console.log('▶️ [IMAGES] Worker RESUMED');
});

export default imagesWorker;
