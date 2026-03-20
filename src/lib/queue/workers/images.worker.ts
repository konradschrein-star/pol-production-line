import { Worker, Job } from 'bullmq';
import { redisConnection } from '../index';
import { db } from '../../db';
import { BrowserManager } from '../../browser';
import { navigateToAutoWhisk, generateImages, waitForGenerationComplete, getAutoWhiskDownloadFolder } from '../../browser/auto-whisk';
import { FolderMonitor, waitForFiles } from '../../browser/folder-monitor';
import { saveFile } from '../../storage/local';
import { unlinkSync } from 'fs';

interface ImageJobData {
  sceneId: string;
  imagePrompt: string;
  jobId: string;
}

// PRODUCTION HARDENING CONSTANTS
const GENERATION_DELAY = 60000; // 60 seconds between generations (ban prevention)
const MAX_RETRIES = 3; // Maximum retry attempts per scene
const RETRY_BACKOFF_BASE = 5000; // 5s base backoff (5s, 10s, 20s)

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Images Worker
 * Processes individual scenes by generating images via Auto Whisk
 */
export const imagesWorker = new Worker<ImageJobData>(
  'queue_images',
  async (job: Job<ImageJobData>) => {
    const { sceneId, imagePrompt, jobId } = job.data;

    console.log(`\n🖼️ [IMAGES] Starting image generation for scene ${sceneId}`);
    console.log(`📝 Prompt: ${imagePrompt.substring(0, 100)}...`);

    let browserManager: BrowserManager | null = null;
    let folderMonitor: FolderMonitor | null = null;

    try {
      // 1. Update scene status
      await db.query(
        'UPDATE news_scenes SET generation_status = $1 WHERE id = $2',
        ['generating', sceneId]
      );

      console.log(`✅ [IMAGES] Scene status updated to 'generating'`);

      // 2. Setup folder monitor
      const downloadFolder = getAutoWhiskDownloadFolder();
      folderMonitor = new FolderMonitor(downloadFolder);
      folderMonitor.start();

      console.log(`👀 [IMAGES] Folder monitor started on: ${downloadFolder}`);

      // 3. Launch browser with Auto Whisk
      browserManager = new BrowserManager({
        headless: false, // Must be false for Chrome extensions
      });

      const context = await browserManager.launch();
      const page = await browserManager.newPage();

      console.log(`🌐 [IMAGES] Browser launched`);

      // 4. Navigate to Auto Whisk extension
      await navigateToAutoWhisk(page);

      console.log(`🔗 [IMAGES] Navigated to Auto Whisk`);

      // 5. Start file monitoring promise BEFORE triggering generation
      const filesPromise = waitForFiles(folderMonitor, 1, 180000); // Wait for 1 file, 3 min timeout

      // 6. Generate image
      await generateImages(page, [imagePrompt], 1, '16:9');

      console.log(`🎨 [IMAGES] Image generation triggered`);

      // 7. Wait for download to complete
      console.log(`⏳ [IMAGES] Waiting for download...`);

      const [downloadedFilePath] = await filesPromise;

      console.log(`✅ [IMAGES] Download complete: ${downloadedFilePath}`);

      // 8. Save to local storage (replaces R2 upload)
      const filename = `${sceneId}.png`;
      const localPath = await saveFile(downloadedFilePath, 'images', filename);

      console.log(`💾 [IMAGES] Saved to local storage: ${localPath}`);

      // 9. Update scene in database with LOCAL PATH
      await db.query(
        'UPDATE news_scenes SET image_url = $1, generation_status = $2 WHERE id = $3',
        [localPath, 'completed', sceneId]
      );

      console.log(`💾 [IMAGES] Database updated with local path`);

      // 10. Clean up downloaded file
      try {
        unlinkSync(downloadedFilePath);
        console.log(`🗑️ [IMAGES] Cleaned up local file`);
      } catch (error) {
        console.warn(`⚠️ [IMAGES] Could not delete local file: ${error.message}`);
      }

      // 11. Check if all scenes for this job are complete
      const result = await db.query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed
         FROM news_scenes
         WHERE job_id = $1`,
        [jobId]
      );

      const { total, completed } = result.rows[0];

      console.log(`📊 [IMAGES] Job progress: ${completed}/${total} scenes complete`);

      if (parseInt(completed) === parseInt(total)) {
        // All scenes done → advance job to review_assets
        await db.query(
          'UPDATE news_jobs SET status = $1 WHERE id = $2',
          ['review_assets', jobId]
        );

        console.log(`✅ [IMAGES] All scenes complete! Job ${jobId} → review_assets`);
      }

      console.log(`✅ [IMAGES] Scene ${sceneId} processing complete\n`);

      // CRITICAL: Add delay before next generation (ban prevention)
      console.log(`⏳ [IMAGES] Waiting ${GENERATION_DELAY / 1000}s before next generation (ban prevention)...`);
      await delay(GENERATION_DELAY);

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
      const isBanError = errorMessage.includes('Captcha detected') ||
                         errorMessage.includes('Login required') ||
                         errorMessage.includes('Rate limit') ||
                         errorMessage.includes('Generation blocked');

      if (isBanError) {
        // Session/ban issue - pause queue and notify user
        if (errorMessage.includes('Captcha') || errorMessage.includes('Login required')) {
          console.error('⚠️ [IMAGES] PAUSING QUEUE: Google login/captcha required');
          await imagesWorker.pause();

          await db.query(
            'UPDATE news_jobs SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', 'Google login required. Please log in and resume queue.', jobId]
          );

          // Don't retry - manual intervention needed
          await db.query(
            'UPDATE news_scenes SET generation_status = $1, error_message = $2 WHERE id = $3',
            ['pending', errorMessage, sceneId]
          );

          return; // Exit without throwing (don't retry)
        }

        // Rate limit - aggressive backoff
        if (errorMessage.includes('Rate limit')) {
          const backoffDelay = 300000; // 5 minutes
          console.warn(`⚠️ [IMAGES] Rate limited. Backing off for ${backoffDelay / 1000}s...`);

          await db.query(
            'UPDATE news_scenes SET generation_status = $1, error_message = $2 WHERE id = $3',
            ['pending', `Rate limited. Retrying in ${backoffDelay / 1000}s`, sceneId]
          );

          await delay(backoffDelay);
          throw error; // Retry after backoff
        }
      }

      // Handle retry logic
      if (attemptNumber < MAX_RETRIES - 1) {
        // More retries available - update status and backoff
        const backoffDelay = RETRY_BACKOFF_BASE * Math.pow(2, attemptNumber);

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

    } finally {
      // Clean up resources
      if (folderMonitor?.isWatching()) {
        await folderMonitor.stop();
      }

      if (browserManager?.isRunning()) {
        await browserManager.close();
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // CRITICAL: Only 1 generation at a time (ban prevention)
    attempts: MAX_RETRIES, // Max retry attempts
    backoff: {
      type: 'exponential',
      delay: RETRY_BACKOFF_BASE, // 5s, 10s, 20s
    },
    // Remove rate limiter - we handle delays manually with GENERATION_DELAY
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
