import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisOptions, redisConnection } from '../index';
import { queueAvatarAutomation } from '../queues';
import { db } from '../../db';
import { transitionJobStateStandalone } from '../../db/transactions';
import { WhiskAPIClient } from '../../whisk/api';
import { WhiskReferenceImages } from '../../whisk/types';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AdaptiveRateLimiter, calculateBackoff } from '../rate-limiter';
import { PromptSanitizer, quickSanitize } from '../../ai/prompt-sanitizer';
import { PromptSimplifier } from '../../ai/prompt-simplifier';
import { stylePresetManager } from '../../style-presets/manager';
import { referenceManager } from '../../whisk/reference-manager';
import { getBaseStoragePath } from '../../storage/path-resolver';
import { categorizeError } from '../../errors/categorization';
import { withRedisLock } from '../redis-lock';

interface ImageJobData {
  sceneId: string;
  imagePrompt: string;
  jobId: string;
}

// PRODUCTION HARDENING CONSTANTS
const MAX_RETRIES = 3; // Maximum retry attempts per scene
const RETRY_BACKOFF_BASE = 3000; // 3s base backoff (3s, 6s, 12s) - Reduced from 5s for faster retries
const MAX_PROMPT_SANITIZATION_ATTEMPTS = 3; // Max attempts to sanitize a rejected prompt
const API_TIMEOUT_MS = 90000; // 90s timeout for API calls (Whisk can be slow)

// Adaptive rate limiter instance (shared across all workers)
const rateLimiter = new AdaptiveRateLimiter({
  minConcurrency: parseInt(process.env.WHISK_MIN_CONCURRENCY || '2'),
  maxConcurrency: parseInt(process.env.WHISK_MAX_CONCURRENCY || '8'),
  initialConcurrency: parseInt(process.env.WHISK_CONCURRENCY || '3'), // Increased from 2 to 3 for faster processing
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
 * Wrapper to add timeout to API calls
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Get local storage path for images
 */
function getImageStoragePath(): string {
  return join(getBaseStoragePath(), 'images');
}

/**
 * Images Worker
 * Processes individual scenes by generating images via Whisk API
 */
export const imagesWorker = new Worker<ImageJobData>(
  'queue_images',
  async (job: Job<ImageJobData>) => {
    const { sceneId, imagePrompt, jobId } = job.data;
    const attemptNumber = job.attemptsMade;

    console.log(`\n🖼️ [IMAGES] Starting image generation for scene ${sceneId} (attempt ${attemptNumber + 1}/${MAX_RETRIES})`);
    console.log(`📝 Prompt: ${imagePrompt.substring(0, 100)}...`);

    try {
      // 1. Update scene status
      await db.query(
        'UPDATE news_scenes SET generation_status = $1 WHERE id = $2',
        ['generating', sceneId]
      );

      console.log(`✅ [IMAGES] Scene status updated to 'generating'`);

      // 2. QUALITY MANAGEMENT: Check if this is final retry attempt
      // If so, use simplified prompt to increase success rate
      let currentPrompt = imagePrompt;

      if (attemptNumber === MAX_RETRIES - 1) {
        // This is the FINAL attempt - use aggressive simplification
        currentPrompt = PromptSimplifier.simplify(imagePrompt, 2);
        console.warn(`⚠️ [IMAGES] FINAL RETRY - Using simplified prompt:`);
        console.warn(`   Original: ${imagePrompt.substring(0, 80)}...`);
        console.warn(`   Simplified: ${currentPrompt}`);
      } else if (attemptNumber === MAX_RETRIES - 2) {
        // This is the second-to-last attempt - use light simplification
        currentPrompt = PromptSimplifier.simplify(imagePrompt, 1);
        console.warn(`⚠️ [IMAGES] Second retry - Using lightly simplified prompt`);
      }

      // 3. Fetch and apply style preset if job has one (after simplification)
      const jobStyleResult = await db.query(
        'SELECT style_preset_id FROM news_jobs WHERE id = $1',
        [jobId]
      );

      if (jobStyleResult.rows[0]?.style_preset_id) {
        const presetId = jobStyleResult.rows[0].style_preset_id;
        try {
          currentPrompt = await stylePresetManager.applyToPrompt(currentPrompt, presetId);
          console.log(`📐 [IMAGES] Applied style preset to prompt`);
        } catch (error) {
          console.warn(`⚠️  [IMAGES] Failed to apply style preset ${presetId}, using original prompt:`, error);
        }
      }

      // 3. Reference images - Resolve using modular reference manager
      const stylePresetId = jobStyleResult.rows[0]?.style_preset_id;
      const refResolution = await referenceManager.resolveReferences(sceneId, stylePresetId);

      console.log(`📐 [IMAGES] Reference strategy: ${refResolution.strategy}`);
      if (refResolution.appliedReferences.length > 0) {
        console.log(`🎨 [IMAGES] Applied references: ${refResolution.appliedReferences.join(', ')}`);
      } else {
        console.log(`📭 [IMAGES] No reference images for this scene`);
      }

      const referenceImages = refResolution.references;

      // 4. Initialize Whisk API client
      const whiskClient = new WhiskAPIClient();

      // 5. Generate image via API with automatic content policy retry
      console.log(`🎨 [IMAGES] Calling Whisk API...`);
      if (referenceImages && Object.keys(referenceImages).length > 0) {
        console.log(`🎨 [IMAGES] Using reference images:`, Object.keys(referenceImages));
      }

      let result;
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

          // Add timeout to prevent hanging API calls
          result = await withTimeout(
            whiskClient.generateImage({
              prompt: currentPrompt,
              aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE', // 16:9 for news videos
              referenceImages: Object.keys(referenceImages || {}).length > 0
                ? referenceImages
                : undefined,
              imageModel: (process.env.WHISK_IMAGE_MODEL as any) || 'IMAGEN_3_5',
            }),
            API_TIMEOUT_MS,
            `Whisk API timed out after ${API_TIMEOUT_MS / 1000}s`
          );

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

          // Parse Whisk API error details for specific policy violation codes
          let whiskErrorReason = '';
          try {
            // Whisk errors are formatted as: "Whisk API error: 400 - {json}"
            const jsonMatch = errorMessage.match(/\{.*\}/s);
            if (jsonMatch) {
              const errorData = JSON.parse(jsonMatch[0]);
              const details = errorData?.error?.details;
              if (Array.isArray(details) && details.length > 0) {
                whiskErrorReason = details[0]?.reason || '';
              }
            }
          } catch (parseError) {
            // Ignore JSON parse errors
          }

          // Check if this is a content policy violation
          const isPolicyViolation =
            errorMessage.includes('content policy') ||
            errorMessage.includes('safety') ||
            errorMessage.includes('inappropriate') ||
            errorMessage.includes('violated') ||
            errorMessage.includes('blocked') ||
            errorMessage.includes('prohibited') ||
            whiskErrorReason.includes('FILTER_FAILED') || // Whisk-specific: PROMINENT_PEOPLE_FILTER_FAILED, etc.
            whiskErrorReason.includes('POLICY') ||
            whiskErrorReason.includes('SAFETY') ||
            (errorMessage.includes('400') && whiskErrorReason); // 400 with a reason code = policy violation

          if (isPolicyViolation && sanitizationAttempt < MAX_PROMPT_SANITIZATION_ATTEMPTS - 1) {
            sanitizationAttempt++;
            console.warn(`⚠️  [IMAGES] Content policy violation detected (attempt ${sanitizationAttempt}/${MAX_PROMPT_SANITIZATION_ATTEMPTS})`);
            if (whiskErrorReason) {
              console.warn(`   Whisk API Reason: ${whiskErrorReason}`);
            }
            console.warn(`   Error: ${errorMessage.substring(0, 150)}`);
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

            // Update scene with sanitization attempt count
            await db.query(
              `UPDATE news_scenes
               SET error_category = $1,
                   sanitization_attempts = $2,
                   last_error_code = $3
               WHERE id = $4`,
              [
                'policy_violation',
                sanitizationAttempt,
                'CONTENT_POLICY_VIOLATION',
                sceneId,
              ]
            );

            // Use AI to sanitize the prompt with timeout
            try {
              currentPrompt = await withTimeout(
                promptSanitizer.sanitizePrompt(
                  currentPrompt,
                  errorMessage,
                  sanitizationAttempt
                ),
                15000, // 15s timeout for AI sanitization
                'Prompt sanitization timed out'
              );
            } catch (sanitizeError) {
              console.error('⚠️  [IMAGES] Prompt sanitization failed:', sanitizeError);
              // Fall back to simple sanitization
              currentPrompt = quickSanitize(currentPrompt);
            }

            // Wait a bit before retrying (reduced from 2s to 1s)
            await delay(1000);
            continue;
          }

          // Not a policy violation or out of retries - record failure and throw error
          const errorCategory = categorizeError(error);

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

          // Update scene with error categorization for UI display
          await db.query(
            `UPDATE news_scenes
             SET error_category = $1,
                 sanitization_attempts = $2,
                 last_error_code = $3
             WHERE id = $4`,
            [
              errorCategory,
              sanitizationAttempt + 1,
              'IMAGE_GENERATION_FAILED',
              sceneId,
            ]
          );

          throw error;
        }
      }

      if (!result) {
        throw new Error(`Failed to generate image after ${MAX_PROMPT_SANITIZATION_ATTEMPTS} sanitization attempts`);
      }

      // 5. Decode base64 image with timeout
      const image = result.images[0];
      const imageBuffer = await withTimeout(
        whiskClient.downloadImage(image.url, image.base64),
        30000, // 30s timeout for download
        'Image download timed out'
      );

      console.log(`✅ [IMAGES] Image downloaded (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

      // 6. Save to local storage (optimized)
      const storageDir = getImageStoragePath();
      const filename = `${sceneId}.jpg`;
      const localPath = join(storageDir, filename);

      // Ensure directory exists (use lazy mkdir)
      const { mkdirSync, existsSync } = require('fs');
      if (!existsSync(storageDir)) {
        mkdirSync(storageDir, { recursive: true });
      }

      // Write file synchronously (faster for small files)
      writeFileSync(localPath, imageBuffer);

      console.log(`💾 [IMAGES] Saved to: ${localPath}`);

      // 7. Update scene in database with RELATIVE PATH (for portability)
      const relativePath = `images/${filename}`; // Store as "images/uuid.jpg" format
      await db.query(
        `UPDATE news_scenes
         SET
           image_url = $1,
           generation_status = $2,
           retry_count = $3
         WHERE id = $4`,
        [
          relativePath,
          'completed',
          job.attemptsMade, // Track number of retries required
          sceneId,
        ]
      );

      console.log(`💾 [IMAGES] Database updated with local path`);

      // Record successful generation for rate limiter
      rateLimiter.onSuccess();

      // 8. Check if all scenes for this job are complete
      // ✅ FIX (Bug #1): Use Redis distributed lock to prevent race condition
      // Multiple workers can complete their scenes simultaneously and both see "all complete",
      // leading to duplicate state transitions or multiple avatar automation jobs being queued.
      const completionLockKey = `job:${jobId}:completion_check`;

      const lockResult = await withRedisLock(
        completionLockKey,
        async () => {
          // PROTECTED SECTION: Only one worker can execute this
          const progressResult = await db.query(
          `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN generation_status = 'failed' THEN 1 END) as failed,
            COUNT(CASE WHEN generation_status IN ('pending', 'generating') THEN 1 END) as in_progress
           FROM news_scenes
           WHERE job_id = $1`,
          [jobId]
        );

        const { total, completed, failed, in_progress } = progressResult.rows[0];

        console.log(`📊 [IMAGES] Job progress: ${completed}/${total} scenes complete (${failed} failed, ${in_progress} in progress)`);

        // Check if all scenes are done (either completed or permanently failed)
        const allScenesProcessed = parseInt(completed) + parseInt(failed) === parseInt(total);

        if (parseInt(completed) === parseInt(total)) {
        // ✅ All scenes completed successfully
        // All scenes done → check if auto-approve is enabled
        const jobResult = await db.query(
          'SELECT job_metadata, avatar_mp4_url FROM news_jobs WHERE id = $1',
          [jobId]
        );

        const job_metadata = jobResult.rows[0]?.job_metadata || {};
        const avatar_mp4_url = jobResult.rows[0]?.avatar_mp4_url;
        const skipReview = job_metadata.skip_review === true;

        // Check if auto-approve is enabled AND avatar is already uploaded
        if (skipReview && avatar_mp4_url) {
          console.log(`⏭️  [IMAGES] Auto-approve enabled for job ${jobId} - skipping human review`);

          // Import queueRender
          const { queueRender } = await import('../queues');

          // Transition directly to rendering
          const transitioned = await transitionJobStateStandalone(
            jobId,
            'generating_images',
            'rendering'
          );

          if (!transitioned) {
            console.log(`⏭️  [IMAGES] Job ${jobId} already transitioned by another worker`);
            return {
              success: true,
              sceneId,
              message: 'Scene completed but status already updated'
            };
          }

          // CRITICAL FIX #2: Wrap queue operation to prevent dead-lettered jobs
          try {
            await queueRender.add('render-video', { jobId });
            console.log(`✅ [IMAGES] All scenes complete! Job ${jobId} → rendering (auto-approved)`);
          } catch (queueError) {
            console.error(`❌ [IMAGES] Failed to queue render job for ${jobId}:`, queueError);
            // Revert state transition to allow retry
            await transitionJobStateStandalone(jobId, 'rendering', 'generating_images');
            throw new Error(`State transitioned but queue operation failed: ${queueError instanceof Error ? queueError.message : String(queueError)}`);
          }
        } else {
          // Standard workflow: transition to review_assets
          const avatarMode = process.env.AVATAR_MODE || 'manual';

          // PRODUCTION HARDENING: Use advisory lock-based state transition to prevent race conditions
          const transitioned = await transitionJobStateStandalone(
            jobId,
            'generating_images',
            'review_assets'
          );

          if (!transitioned) {
            console.log(`⏭️  [IMAGES] Job ${jobId} already transitioned by another worker`);
            return {
              success: true,
              sceneId,
              message: 'Scene completed but status already updated'
            };
          }

          // CRITICAL FIX #2: Wrap queue operations to prevent dead-lettered jobs
          if (avatarMode === 'automated') {
            try {
              // Automated mode: Queue for avatar automation
              await queueAvatarAutomation.add('generate-avatar', { jobId });
              console.log(`✅ [IMAGES] All scenes complete! Job ${jobId} → avatar automation queued`);
            } catch (queueError) {
              console.error(`❌ [IMAGES] Failed to queue avatar automation for ${jobId}:`, queueError);
              // Revert state transition to allow retry
              await transitionJobStateStandalone(jobId, 'review_assets', 'generating_images');
              throw new Error(`State transitioned but queue operation failed: ${queueError instanceof Error ? queueError.message : String(queueError)}`);
            }
          } else {
            // Manual mode: Pause at review_assets for human intervention
            if (skipReview && !avatar_mp4_url) {
              console.log(`⚠️  [IMAGES] Auto-approve enabled but avatar not uploaded yet. Waiting at review_assets...`);
            }
            console.log(`✅ [IMAGES] All scenes complete! Job ${jobId} → review_assets (manual avatar generation required)`);
          }
        }
      } else if (allScenesProcessed && parseInt(failed) > 0) {
        // ⚠️ Some scenes failed - transition to review_assets so user can manually regenerate
        console.warn(`⚠️  [IMAGES] Job ${jobId}: ${completed}/${total} scenes succeeded, ${failed} failed`);

        // Get details of failed scenes for logging
        const failedScenesResult = await db.query(
          `SELECT id, scene_order, image_prompt, error_message
           FROM news_scenes
           WHERE job_id = $1 AND generation_status = 'failed'
           ORDER BY scene_order`,
          [jobId]
        );

        console.warn(`⚠️  [IMAGES] Failed scenes:`);
        failedScenesResult.rows.forEach((scene: any) => {
          console.warn(`   - Scene ${scene.scene_order}: ${scene.error_message?.substring(0, 100)}`);
        });

        // Transition to review_assets so user can manually regenerate failed scenes
        const transitioned = await transitionJobStateStandalone(
          jobId,
          'generating_images',
          'review_assets'
        );

        if (transitioned) {
          console.log(`✅ [IMAGES] Job ${jobId} → review_assets (${failed} scenes need regeneration)`);
        }
      }

          return { success: true };
        },
        { timeout: 30000 } // 30-second lock timeout (covers DB queries + state transitions + queue operations)
                            // Increased from 10s to prevent timeout during slow DB operations (Bug #1 fix)
      );

      if (!lockResult) {
        // Another worker is handling completion for this job
        console.log(`⏭️  [IMAGES] Another worker is processing job completion for ${jobId}`);

        // CRITICAL FIX #11: Check for stale locks that could indicate crashed worker
        const { checkStaleLock } = await import('../redis-lock');
        const staleCheck = await checkStaleLock(completionLockKey, 45000); // 45s = 1.5x timeout

        if (staleCheck.isStale) {
          console.error(
            `⚠️  [IMAGES] STALE LOCK DETECTED for job ${jobId}! ` +
            `Lock has been held for ${(staleCheck.ageMs! / 1000).toFixed(1)}s. ` +
            `This may indicate a crashed worker. Lock will auto-expire soon.`
          );
          // Don't force-release here - let Redis auto-expiry handle it for safety
          // Manual intervention can use forceReleaseLock() if needed
        }

        return {
          success: true,
          sceneId,
          imageUrl: localPath,
          message: 'Scene completed, completion check handled by another worker',
        };
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
                          errorMessage.includes('Token refresh failed');

      const isRateLimitError = errorMessage.includes('429') ||
                               errorMessage.includes('Rate limit') ||
                               errorMessage.includes('Too many requests');

      if (isAuthError) {
        // Token refresh is now handled automatically by WhiskAPIClient
        // If we see this error, it means automatic refresh failed
        console.error('❌ [IMAGES] Automatic token refresh failed for scene', sceneId);
        console.error('   Error details:', errorMessage);

        // ⚠️ CRITICAL FIX: Do NOT mark entire job as failed!
        // Only mark THIS scene as failed - other scenes can still succeed.
        // Quality management will check if job is complete at the end.

        await db.query(
          `UPDATE news_scenes
           SET generation_status = $1,
               error_message = $2,
               error_category = $3,
               last_error_code = $4
           WHERE id = $5`,
          ['failed', errorMessage, 'auth_error', 'TOKEN_EXPIRED', sceneId]
        );

        // Let BullMQ retry logic handle it (don't pause queue)
        throw new Error(errorMessage);
      }

      if (isRateLimitError) {
        // Rate limit - notify rate limiter and use exponential backoff
        rateLimiter.onRateLimit();

        const backoffDelay = calculateBackoff(attemptNumber, 5000, 60000);
        console.warn(`⚠️ [IMAGES] Rate limited. Backing off for ${backoffDelay / 1000}s...`);
        console.warn(`   Current rate limiter stats:`, rateLimiter.getStats());

        await db.query(
          `UPDATE news_scenes
           SET generation_status = $1,
               error_message = $2,
               error_category = $3,
               last_error_code = $4
           WHERE id = $5`,
          ['pending', `Rate limited. Retrying in ${backoffDelay / 1000}s`, 'rate_limit', 'RATE_LIMIT_EXCEEDED', sceneId]
        );

        await delay(backoffDelay);
        throw error; // Retry after backoff
      }

      // Handle retry logic (prompt simplification happens at worker start)
      if (attemptNumber < MAX_RETRIES - 1) {
        // More retries available - update status and backoff
        rateLimiter.onError(); // Non-rate-limit error

        const backoffDelay = calculateBackoff(attemptNumber, RETRY_BACKOFF_BASE);

        // Provide helpful error message indicating what will happen next
        let retryMessage = `Failed (attempt ${attemptNumber + 1}/${MAX_RETRIES}). Retrying in ${backoffDelay / 1000}s...`;

        if (attemptNumber === MAX_RETRIES - 2) {
          retryMessage = `Failed ${attemptNumber + 1} times. FINAL retry with simplified prompt in ${backoffDelay / 1000}s...`;
        } else if (attemptNumber === MAX_RETRIES - 3) {
          retryMessage = `Failed ${attemptNumber + 1} times. Next retry will use lighter prompt in ${backoffDelay / 1000}s...`;
        }

        await db.query(
          'UPDATE news_scenes SET generation_status = $1, error_message = $2, retry_count = $3 WHERE id = $4',
          ['pending', retryMessage, attemptNumber + 1, sceneId]
        );

        console.warn(`⚠️ [IMAGES] Retrying scene ${sceneId} in ${backoffDelay / 1000}s...`);
        await delay(backoffDelay);
        throw error; // BullMQ will retry
      } else {
        // Max retries reached - permanent failure
        const errorCategory = categorizeError(errorMessage);

        await db.query(
          `UPDATE news_scenes
           SET generation_status = $1,
               error_message = $2,
               retry_count = $3,
               failed_permanently = $4,
               error_category = $5,
               last_error_code = $6
           WHERE id = $7`,
          [
            'failed',
            `Failed after ${MAX_RETRIES} attempts: ${errorMessage}`,
            MAX_RETRIES,
            true,
            errorCategory,
            'MAX_RETRIES_EXCEEDED',
            sceneId,
          ]
        );

        console.error(`❌ [IMAGES] Scene ${sceneId} PERMANENTLY FAILED after ${MAX_RETRIES} attempts`);
        console.error(`   Error category: ${errorCategory}`);
        throw error; // Let BullMQ mark as failed
      }
    }
  },
  {
    connection: redisOptions,
    concurrency: process.env.WHISK_CONCURRENCY ? parseInt(process.env.WHISK_CONCURRENCY) : 3, // 3 parallel generations (increased from 2 for faster processing)

    // CRITICAL: Timeout settings to prevent stuck jobs
    lockDuration: 180000, // 3 minutes - max time a job can be locked (prevents stuck jobs)
    lockRenewTime: 30000, // 30 seconds - renew lock every 30s while job is active
    stalledInterval: 60000, // 60 seconds - check for stalled jobs every minute
    maxStalledCount: 2, // After 2 stalls, mark job as failed

    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours for debugging
    },
  }
);

imagesWorker.on('completed', (job) => {
  console.log(`✅ [IMAGES] Worker completed job ${job.id}`);
});

/**
 * Helper function for database update retry logic
 * Prevents silent failures when database is temporarily unavailable
 */
async function retryDatabaseUpdate(
  operation: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await operation();
      return; // Success
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Final retry failed
      }
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️  [IMAGES] Database update failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

imagesWorker.on('failed', async (job, err) => {
  console.error(`❌ [IMAGES] Worker failed job ${job?.id}:`, err);

  // Update scene status to failed if job failed
  if (job?.data?.sceneId) {
    try {
      // Update scene status with retry logic
      await retryDatabaseUpdate(
        () => db.query(
          'UPDATE news_scenes SET generation_status = $1, error_message = $2, failed_permanently = $3 WHERE id = $4',
          ['failed', `Job failed: ${err.message}`, true, job.data.sceneId]
        )
      );

      // Create notification for user visibility
      const { createNotification } = await import('../../notifications');
      await createNotification({
        job_id: job.data.jobId,
        scene_id: job.data.sceneId,
        severity: 'error',
        category: 'image_generation',
        message: `Scene ${job.data.sceneOrder} failed after ${job.attemptsMade} attempts`,
        details: {
          error: err.message,
          sceneOrder: job.data.sceneOrder,
          retryCount: job.attemptsMade,
          imagePrompt: job.data.imagePrompt?.substring(0, 100) // First 100 chars for context
        }
      });

      console.log(`📢 [IMAGES] Created failure notification for scene ${job.data.sceneOrder}`);

    } catch (dbError) {
      // Critical: Database updates failed after retries
      console.error('🚨 CRITICAL: Failed to persist scene failure after retries');
      console.error('   Job ID:', job?.data?.jobId);
      console.error('   Scene ID:', job?.data?.sceneId);
      console.error('   Original Error:', err.message);
      console.error('   Database Error:', dbError instanceof Error ? dbError.message : String(dbError));

      // Last resort: Try to write to system logs if available
      try {
        const { logger } = await import('../../logger');
        logger.error('image_generation', 'CRITICAL: Failed to persist scene failure', {
          jobId: job?.data?.jobId,
          sceneId: job?.data?.sceneId,
          originalError: err.message,
          dbError: dbError instanceof Error ? dbError.message : String(dbError)
        });
      } catch (logError) {
        // Even logging failed - this is extremely rare
        console.error('   Even logging failed:', logError);
      }
    }
  }
});

imagesWorker.on('error', (err) => {
  console.error(`❌ [IMAGES] Worker error:`, err);
});

imagesWorker.on('stalled', (jobId, prev) => {
  console.error(`⚠️ [IMAGES] Job ${jobId} STALLED (was in state: ${prev})`);
  console.error(`   This usually means the job timed out or worker crashed`);
  console.error(`   Job will be automatically retried or marked as failed`);
});

imagesWorker.on('paused', () => {
  console.log('⏸️ [IMAGES] Worker PAUSED - manual intervention required');
});

imagesWorker.on('resumed', () => {
  console.log('▶️ [IMAGES] Worker RESUMED');
});

export default imagesWorker;
