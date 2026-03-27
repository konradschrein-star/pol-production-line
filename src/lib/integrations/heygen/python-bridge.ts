/**
 * Bridge between Node.js and Python HeyGen automation
 * Spawns Python subprocess and polls tracking.json for completion
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import {
  readTracking,
  writeQueue,
  getDefaultQueueData,
  getAutomationDir,
  getTrackingPath,
  getQueuePath,
  isCompleted,
  isFailed,
  type TrackingData
} from './tracking-parser';

/**
 * Result of avatar automation
 */
export interface AutomationResult {
  success: boolean;
  videoPath?: string; // Local path to downloaded MP4
  error?: string;
  duration: number; // Seconds elapsed
}

/**
 * Options for automation
 */
export interface AutomationOptions {
  scriptText: string;
  avatar?: string; // Override default avatar
  quality?: '720p' | '1080p';
  fps?: '25' | '30' | '60';
  timeoutMs?: number; // Max wait time (default: 30 minutes)
  pollIntervalMs?: number; // Polling frequency (default: 5 seconds)
}

/**
 * Spawn HeyGen Python automation as detached subprocess
 * Returns immediately - use pollTracking() to monitor progress
 */
export async function spawnHeyGenAutomation(
  jobId: string,
  options: AutomationOptions
): Promise<void> {
  const automationDir = getAutomationDir();
  const queuePath = getQueuePath();
  const pythonScript = path.join(automationDir, 'heygen_automation.py');
  const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python';

  // Write queue file to trigger automation
  const queueData = {
    ...getDefaultQueueData(options.scriptText),
    ...(options.avatar && { avatar: options.avatar }),
    ...(options.quality && { quality: options.quality }),
    ...(options.fps && { fps: options.fps })
  };

  await writeQueue(queuePath, queueData);
  console.log(`📝 Queue file created for job ${jobId}`);

  // Spawn Python process in detached mode
  const python: ChildProcess = spawn(
    pythonExecutable,
    [pythonScript, '--ui-queue', queuePath],
    {
      cwd: automationDir,
      detached: true, // Run independently
      stdio: 'ignore', // Don't capture output (prevents blocking)
      env: {
        ...process.env,
        // Pass any Python-specific env vars
      }
    }
  );

  // Detach from parent process
  python.unref();

  console.log(`🚀 Spawned Python automation (PID: ${python.pid}) for job ${jobId}`);
}

/**
 * Poll tracking.json until completion or timeout
 * Returns result with video path or error
 */
export async function pollTracking(
  jobId: string,
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {}
): Promise<AutomationResult> {
  const timeoutMs = options.timeoutMs || 30 * 60 * 1000; // 30 minutes default
  const pollIntervalMs = options.pollIntervalMs || 5000; // 5 seconds default
  const trackingPath = getTrackingPath();
  const startTime = Date.now();

  console.log(`🔄 Polling tracking.json for job ${jobId} (timeout: ${timeoutMs / 1000}s)`);

  return new Promise((resolve) => {
    const pollInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      // Check timeout
      if (elapsed > timeoutMs) {
        clearInterval(pollInterval);
        console.error(`⏱️  Timeout waiting for job ${jobId} (${elapsed / 1000}s)`);
        resolve({
          success: false,
          error: `Automation timed out after ${timeoutMs / 1000} seconds`,
          duration: elapsed / 1000
        });
        return;
      }

      // Read tracking file
      const tracking = await readTracking(trackingPath);

      if (!tracking) {
        // File doesn't exist yet - keep waiting
        console.log(`⏳ Job ${jobId}: Waiting for tracking.json... (${elapsed / 1000}s)`);
        return;
      }

      // Log progress
      console.log(
        `⏳ Job ${jobId}: ${tracking.status} (${tracking.progress}%) - ${elapsed / 1000}s`
      );

      // Check completion
      if (isCompleted(tracking)) {
        clearInterval(pollInterval);
        console.log(`✅ Job ${jobId}: Completed - ${tracking.video_path}`);
        resolve({
          success: true,
          videoPath: tracking.video_path!,
          duration: elapsed / 1000
        });
        return;
      }

      // Check failure
      if (isFailed(tracking)) {
        clearInterval(pollInterval);
        console.error(`❌ Job ${jobId}: Failed - ${tracking.error}`);
        resolve({
          success: false,
          error: tracking.error || 'Unknown error',
          duration: elapsed / 1000
        });
        return;
      }

      // Otherwise keep polling (queued or processing)
    }, pollIntervalMs);
  });
}

/**
 * Check if Python automation is properly set up
 * Throws error if not ready
 */
export async function validateSetup(): Promise<void> {
  const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python';
  const automationDir = getAutomationDir();
  const pythonScript = path.join(automationDir, 'heygen_automation.py');

  // Check Python script exists
  const fs = await import('fs/promises');
  try {
    await fs.access(pythonScript);
  } catch {
    throw new Error(
      `Python script not found: ${pythonScript}\n` +
      'Run: cd integrations && git clone https://github.com/marifaceless/heygen-web-automation.git heygen-automation'
    );
  }

  // Check Python executable
  return new Promise((resolve, reject) => {
    const python = spawn(pythonExecutable, ['--version'], { stdio: 'ignore' });

    python.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(
          new Error(
            `Python not found: ${pythonExecutable}\n` +
            'Install Python 3.8+ from https://www.python.org/downloads/'
          )
        );
      } else {
        reject(error);
      }
    });

    python.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Python check failed with code ${code}`));
      }
    });
  });
}

/**
 * One-shot: Submit avatar script and wait for completion
 * Combines spawnHeyGenAutomation + pollTracking
 */
export async function generateAvatar(
  jobId: string,
  options: AutomationOptions
): Promise<AutomationResult> {
  console.log(`🎭 Starting avatar generation for job ${jobId}`);

  try {
    // Validate setup first
    await validateSetup();

    // Spawn automation
    await spawnHeyGenAutomation(jobId, options);

    // Poll for completion
    const result = await pollTracking(jobId, {
      timeoutMs: options.timeoutMs,
      pollIntervalMs: options.pollIntervalMs
    });

    return result;
  } catch (error) {
    console.error(`❌ Error generating avatar for job ${jobId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: 0
    };
  }
}
