/**
 * BullMQ Worker: Automated Avatar Generation
 * Uses Python HeyGen browser automation to generate avatar videos
 * Only runs when AVATAR_MODE=automated
 */

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisOptions } from '../index';
import { queueRender } from '../queues';
import { db } from '../../db';
import { generateAvatar, validateSetup } from '../../integrations/heygen/python-bridge';
import { cleanupFiles } from '../../integrations/heygen/tracking-parser';
import fs from 'fs/promises';
import path from 'path';
import { getBaseStoragePath } from '../../storage/path-resolver';

interface AvatarJobData {
  jobId: string;
}

/**
 * Move downloaded MP4 from automation directory to local storage
 */
async function moveAvatarToStorage(sourcePath: string, jobId: string): Promise<string> {
  const avatarsDir = path.join(getBaseStoragePath(), 'avatars');

  // Ensure avatars directory exists
  await fs.mkdir(avatarsDir, { recursive: true });

  // Generate destination filename
  const ext = path.extname(sourcePath);
  const destFilename = `avatar_${jobId}${ext}`;
  const destPath = path.join(avatarsDir, destFilename);

  // Copy file (don't move - let Python automation clean up)
  await fs.copyFile(sourcePath, destPath);
  console.log(`✅ Avatar copied: ${sourcePath} → ${destPath}`);

  // Return relative file path for database (portable format)
  return `avatars/${destFilename}`;
}

export const avatarWorker = new Worker<AvatarJobData>(
  'queue_avatar_automation',
  async (job: Job<AvatarJobData>) => {
    const { jobId } = job.data;

    console.log(`\n🎭 [AVATAR] Starting automated generation for job ${jobId}`);

    try {
      // Validate Python setup before starting
      console.log('🔍 Validating Python automation setup...');
      await validateSetup();
      console.log('✅ Python setup validated');

      // Update job status
      await db.query(
        'UPDATE news_jobs SET status = $1 WHERE id = $2',
        ['generating_avatar', jobId]
      );

      // Fetch avatar script from database
      const jobResult = await db.query(
        'SELECT avatar_script FROM news_jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error(`Job ${jobId} not found in database`);
      }

      const { avatar_script } = jobResult.rows[0];

      if (!avatar_script) {
        throw new Error(`Job ${jobId} has no avatar_script`);
      }

      console.log(`📝 Avatar script length: ${avatar_script.length} characters`);

      // Clean up any previous tracking files
      await cleanupFiles();

      // Run Python automation (spawns process + polls for completion)
      console.log('🚀 Starting HeyGen automation...');
      const result = await generateAvatar(jobId, {
        scriptText: avatar_script,
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        pollIntervalMs: 5000 // Poll every 5 seconds
      });

      if (!result.success) {
        throw new Error(result.error || 'Avatar generation failed');
      }

      console.log(`✅ Avatar generated in ${result.duration}s: ${result.videoPath}`);

      // Move avatar to local storage
      const avatarUrl = await moveAvatarToStorage(result.videoPath!, jobId);
      console.log(`📦 Avatar stored: ${avatarUrl}`);

      // Update database with avatar URL and advance to rendering
      await db.query(
        `UPDATE news_jobs
         SET avatar_mp4_url = $1, status = $2
         WHERE id = $3`,
        [avatarUrl, 'rendering', jobId]
      );

      console.log(`✅ Job ${jobId} updated with avatar URL`);

      // Queue for video rendering
      await queueRender.add('render-video', { jobId });
      console.log(`🎬 Job ${jobId} queued for rendering`);

      // Clean up tracking files after success
      await cleanupFiles();

      return {
        success: true,
        avatarUrl,
        duration: result.duration
      };
    } catch (error) {
      console.error(`❌ [AVATAR] Error for job ${jobId}:`, error);

      // Update job status to failed with error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      await db.query(
        `UPDATE news_jobs
         SET status = $1, error_message = $2
         WHERE id = $3`,
        ['failed', `Avatar generation failed: ${errorMessage}`, jobId]
      );

      // Provide helpful context based on error type
      if (errorMessage.includes('Python not found')) {
        console.error('💡 Fix: Install Python 3.8+ or set PYTHON_EXECUTABLE in .env');
      } else if (errorMessage.includes('Python script not found')) {
        console.error('💡 Fix: Clone the HeyGen automation repository');
        console.error('   cd integrations && git clone https://github.com/marifaceless/heygen-web-automation.git heygen-automation');
      } else if (errorMessage.includes('login')) {
        console.error('💡 Fix: Run Python setup_profile.py to login to HeyGen');
      } else if (errorMessage.includes('timeout')) {
        console.error('💡 This might work on retry - HeyGen generation can be slow');
      }

      throw error; // Re-throw for BullMQ retry mechanism
    }
  },
  {
    connection: redisOptions,
    concurrency: 1, // Only one avatar generation at a time
    limiter: {
      max: 1, // Max 1 job
      duration: 1000 // per second
    },
    settings: {
      backoffStrategies: {
        exponential: (attemptsMade: number) => {
          // Exponential backoff: 1min, 2min, 4min
          return Math.pow(2, attemptsMade) * 60 * 1000;
        }
      }
    }
  }
);

// Error handling
avatarWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`❌ Avatar worker failed for job ${job.data.jobId}:`, err.message);

    // After max retries, suggest manual mode
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      console.error(`⚠️  Max retries reached for job ${job.data.jobId}`);
      console.error('💡 Consider switching to AVATAR_MODE=manual in settings');
    }
  }
});

avatarWorker.on('completed', (job) => {
  console.log(`✅ Avatar worker completed for job ${job.data.jobId}`);
});

console.log('✅ Avatar automation worker loaded (concurrency: 1)');
