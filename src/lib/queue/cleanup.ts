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
 * @param jobId - The job ID to cancel
 * @param currentStatus - Current status of the job (determines which queues to clean)
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

  try {
    switch (currentStatus) {
      case 'pending':
      case 'analyzing':
        // Remove from analyze queue
        try {
          const analyzeJobs = await queueAnalyze.getJobs(['waiting', 'active', 'delayed']);
          let removedCount = 0;
          for (const job of analyzeJobs) {
            if (job.data.jobId === jobId) {
              try {
                await job.remove();
                removedCount++;
              } catch (removeError) {
                // If individual remove fails, don't mark as success
                results.errors.push(`Failed to remove analyze job: ${removeError instanceof Error ? removeError.message : 'Unknown error'}`);
              }
            }
          }
          // Only mark as success if we removed at least one job without errors
          results.analyze = removedCount > 0;
        } catch (error) {
          results.errors.push(`Analyze queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;

      case 'generating_images':
        // Remove all scene jobs from images queue
        try {
          const imageJobs = await queueImages.getJobs(['waiting', 'active', 'delayed']);
          let removedCount = 0;
          for (const job of imageJobs) {
            if (job.data.jobId === jobId) {
              try {
                await job.remove();
                removedCount++;
              } catch (removeError) {
                // If individual remove fails, don't mark as success
                results.errors.push(`Failed to remove image job: ${removeError instanceof Error ? removeError.message : 'Unknown error'}`);
              }
            }
          }
          // Only mark as success if we removed at least one job without errors
          results.images = removedCount > 0;
        } catch (error) {
          results.errors.push(`Images queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;

      case 'rendering':
        // Remove from render queue
        try {
          const renderJobs = await queueRender.getJobs(['waiting', 'active', 'delayed']);
          let removedCount = 0;
          for (const job of renderJobs) {
            if (job.data.jobId === jobId) {
              try {
                await job.remove();
                removedCount++;
              } catch (removeError) {
                // If individual remove fails, don't mark as success
                results.errors.push(`Failed to remove render job: ${removeError instanceof Error ? removeError.message : 'Unknown error'}`);
              }
            }
          }
          // Only mark as success if we removed at least one job without errors
          results.render = removedCount > 0;
        } catch (error) {
          results.errors.push(`Render queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;

      // review_assets, completed, failed, cancelled - no queue cleanup needed
      default:
        break;
    }
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return results;
}
