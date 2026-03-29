/**
 * Queue Cleanup Service
 * Handles cancellation and removal of jobs from BullMQ queues
 */

import { queueAnalyze, queueImages, queueRender } from './queues';

interface CleanupResult {
  analyze: boolean;
  images: boolean;
  render: boolean;
  errors: string[];
}

/**
 * Cancel and remove all queue entries for a specific job
 *
 * CRITICAL (Bug #3 fix): Always checks ALL queues, not just the one matching current status
 * This prevents orphaned scene jobs when a job is deleted mid-processing
 *
 * @param jobId - The job ID to cancel
 * @param currentStatus - Current status of the job (for logging only)
 * @returns Results of cleanup operations
 */
export async function cancelJobQueues(
  jobId: string,
  currentStatus: string
): Promise<CleanupResult> {
  const results: CleanupResult = {
    analyze: false,
    images: false,
    render: false,
    errors: []
  };

  console.log(`🧹 [Cleanup] Removing all queue entries for job ${jobId} (status: ${currentStatus})...`);

  // CRITICAL FIX (Bug #3): Always clean ALL queues, not just the one for current status
  // Scenes may still be processing even after state transitions

  // 1. Clean analyze queue
  try {
    const analyzeJobs = await queueAnalyze.getJobs(['waiting', 'active', 'delayed']);
    let removedCount = 0;
    for (const job of analyzeJobs) {
      if (job.data.jobId === jobId) {
        try {
          await job.remove();
          removedCount++;
        } catch (removeError) {
          results.errors.push(`Failed to remove analyze job: ${removeError instanceof Error ? removeError.message : 'Unknown error'}`);
        }
      }
    }
    if (removedCount > 0) {
      console.log(`   ✅ Removed ${removedCount} analyze job(s)`);
      results.analyze = true;
    }
  } catch (error) {
    results.errors.push(`Analyze queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 2. Clean images queue (scene jobs)
  try {
    const imageJobs = await queueImages.getJobs(['waiting', 'active', 'delayed']);
    let removedCount = 0;
    for (const job of imageJobs) {
      if (job.data.jobId === jobId) {
        try {
          await job.remove();
          removedCount++;
        } catch (removeError) {
          results.errors.push(`Failed to remove image job: ${removeError instanceof Error ? removeError.message : 'Unknown error'}`);
        }
      }
    }
    if (removedCount > 0) {
      console.log(`   ✅ Removed ${removedCount} image job(s)`);
      results.images = true;
    }
  } catch (error) {
    results.errors.push(`Images queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 3. Clean render queue
  try {
    const renderJobs = await queueRender.getJobs(['waiting', 'active', 'delayed']);
    let removedCount = 0;
    for (const job of renderJobs) {
      if (job.data.jobId === jobId) {
        try {
          await job.remove();
          removedCount++;
        } catch (removeError) {
          results.errors.push(`Failed to remove render job: ${removeError instanceof Error ? removeError.message : 'Unknown error'}`);
        }
      }
    }
    if (removedCount > 0) {
      console.log(`   ✅ Removed ${removedCount} render job(s)`);
      results.render = true;
    }
  } catch (error) {
    results.errors.push(`Render queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log(`✅ [Cleanup] Queue cleanup complete for job ${jobId}`);

  return results;
}
