/**
 * Queue Recovery System
 *
 * Handles:
 * - Orphaned jobs stuck in queue after worker crashes
 * - Stale jobs processing for too long
 * - Database/queue state synchronization
 *
 * Runs automatically on startup and every 15 minutes
 */

import { Queue } from 'bullmq';
import { db } from '../db';

// Configuration
const STALE_JOB_THRESHOLD = 60 * 60 * 1000; // 1 hour
const RECOVERY_INTERVAL = 15 * 60 * 1000; // 15 minutes

interface JobRecoveryStats {
  queue: string;
  activeJobs: number;
  staleJobs: number;
  recovered: number;
  failed: number;
}

/**
 * Recover orphaned jobs from a single queue
 *
 * @param queue - BullMQ queue instance
 * @returns Recovery statistics
 */
export async function recoverOrphanedJobs(queue: Queue): Promise<JobRecoveryStats> {
  const queueName = queue.name;
  const stats: JobRecoveryStats = {
    queue: queueName,
    activeJobs: 0,
    staleJobs: 0,
    recovered: 0,
    failed: 0,
  };

  try {
    const activeJobs = await queue.getActive();
    stats.activeJobs = activeJobs.length;

    const now = Date.now();

    for (const job of activeJobs) {
      const processedOn = job.processedOn || job.timestamp;
      const ageMs = now - processedOn;

      if (ageMs > STALE_JOB_THRESHOLD) {
        stats.staleJobs++;

        console.warn(`⚠️ [RECOVERY] Stale job detected in ${queueName}:`);
        console.warn(`   Job ID: ${job.id}`);
        console.warn(`   Age: ${(ageMs / 1000 / 60).toFixed(1)} minutes`);

        try {
          // Extract job ID from job data
          const jobData = job.data as { jobId?: string; sceneId?: string };
          const dbJobId = jobData.jobId;

          if (dbJobId) {
            // Check database state
            const dbResult = await db.query(
              'SELECT status FROM news_jobs WHERE id = $1',
              [dbJobId]
            );

            if (dbResult.rows.length > 0) {
              const currentStatus = dbResult.rows[0].status;

              // Determine recovery action based on queue and status
              if (currentStatus === 'completed' || currentStatus === 'failed' || currentStatus === 'cancelled') {
                // Job already finished in database, remove from queue
                console.log(`   Database shows ${currentStatus}, removing stale queue job`);
                await job.remove();
                stats.recovered++;
              } else {
                // Job still active in database, retry the queue job
                console.log(`   Database shows ${currentStatus}, retrying queue job`);

                // Update database to pending to allow retry
                const statusMap: Record<string, string> = {
                  'analyzing': 'pending',
                  'generating_images': 'analyzing',
                  'rendering': 'review_assets',
                };

                const newStatus = statusMap[currentStatus] || 'pending';

                await db.query(
                  `UPDATE news_jobs
                   SET status = $1, error_message = $2, updated_at = NOW()
                   WHERE id = $3 AND status = $4`,
                  [
                    newStatus,
                    `Recovered from stale queue job (was stuck for ${(ageMs / 1000 / 60).toFixed(1)} minutes)`,
                    dbJobId,
                    currentStatus,
                  ]
                );

                // Retry the queue job
                await job.retry();
                stats.recovered++;
              }
            } else {
              // Job not found in database, remove from queue
              console.log(`   Job not found in database, removing from queue`);
              await job.remove();
              stats.recovered++;
            }
          } else {
            // No job ID in data, just retry
            console.log(`   No job ID in data, retrying`);
            await job.retry();
            stats.recovered++;
          }
        } catch (error) {
          console.error(`   Failed to recover job ${job.id}:`, error);
          stats.failed++;
        }
      }
    }

    if (stats.staleJobs > 0) {
      console.log(`✅ [RECOVERY] ${queueName}: Recovered ${stats.recovered}/${stats.staleJobs} stale jobs`);
    }

  } catch (error) {
    console.error(`❌ [RECOVERY] Failed to recover orphaned jobs from ${queueName}:`, error);
  }

  return stats;
}

/**
 * Initialize queue recovery system
 *
 * Runs recovery immediately on startup, then every 15 minutes
 *
 * @param queues - Array of BullMQ queue instances to monitor
 */
export async function initQueueRecovery(queues: Queue[]): Promise<void> {
  console.log(`🔧 [RECOVERY] Initializing queue recovery system for ${queues.length} queues`);

  // Run initial recovery
  await runRecovery(queues);

  // Schedule periodic recovery
  setInterval(async () => {
    await runRecovery(queues);
  }, RECOVERY_INTERVAL);

  console.log(`✅ [RECOVERY] Queue recovery system active (checking every ${RECOVERY_INTERVAL / 1000 / 60} minutes)`);
}

/**
 * Run recovery on all queues
 */
async function runRecovery(queues: Queue[]): Promise<void> {
  console.log(`\n🔍 [RECOVERY] Running queue recovery check...`);

  const allStats: JobRecoveryStats[] = [];

  for (const queue of queues) {
    const stats = await recoverOrphanedJobs(queue);
    allStats.push(stats);
  }

  // Log summary
  const totalActive = allStats.reduce((sum, s) => sum + s.activeJobs, 0);
  const totalStale = allStats.reduce((sum, s) => sum + s.staleJobs, 0);
  const totalRecovered = allStats.reduce((sum, s) => sum + s.recovered, 0);
  const totalFailed = allStats.reduce((sum, s) => sum + s.failed, 0);

  console.log(`📊 [RECOVERY] Summary:`);
  console.log(`   Total active jobs: ${totalActive}`);
  console.log(`   Total stale jobs: ${totalStale}`);
  console.log(`   Successfully recovered: ${totalRecovered}`);
  console.log(`   Failed to recover: ${totalFailed}`);

  if (totalStale === 0) {
    console.log(`   ✅ All queues healthy`);
  }
}

/**
 * Check queue health (useful for monitoring endpoints)
 *
 * @param queues - Array of queues to check
 * @returns Health information for each queue
 */
export async function checkQueueHealth(queues: Queue[]): Promise<{
  healthy: boolean;
  queues: Array<{
    name: string;
    active: number;
    waiting: number;
    completed: number;
    failed: number;
  }>;
}> {
  const queueStats = await Promise.all(
    queues.map(async (queue) => {
      const [active, waiting, completed, failed] = await Promise.all([
        queue.getActiveCount(),
        queue.getWaitingCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      return {
        name: queue.name,
        active,
        waiting,
        completed,
        failed,
      };
    })
  );

  // Consider unhealthy if any queue has very high waiting count
  const healthy = queueStats.every((q) => q.waiting < 100);

  return {
    healthy,
    queues: queueStats,
  };
}
