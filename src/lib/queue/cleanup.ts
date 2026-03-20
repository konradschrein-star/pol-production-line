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
          for (const job of analyzeJobs) {
            if (job.data.jobId === jobId) {
              await job.remove();
              results.analyze = true;
            }
          }
        } catch (error) {
          results.errors.push(`Analyze queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;

      case 'generating_images':
        // Remove all scene jobs from images queue
        try {
          const imageJobs = await queueImages.getJobs(['waiting', 'active', 'delayed']);
          for (const job of imageJobs) {
            if (job.data.jobId === jobId) {
              await job.remove();
              results.images = true;
            }
          }
        } catch (error) {
          results.errors.push(`Images queue cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        break;

      case 'rendering':
        // Remove from render queue
        try {
          const renderJobs = await queueRender.getJobs(['waiting', 'active', 'delayed']);
          for (const job of renderJobs) {
            if (job.data.jobId === jobId) {
              await job.remove();
              results.render = true;
            }
          }
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
