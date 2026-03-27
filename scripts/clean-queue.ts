/**
 * Clean BullMQ queues - remove stuck/failed/completed jobs
 */
import 'dotenv/config';
import { Queue } from 'bullmq';
import { redisOptions } from '../src/lib/queue/index';

async function cleanQueues() {
  const queueNames = ['queue_analyze', 'queue_images', 'queue_avatar_automation', 'queue_render'];

  console.log('🧹 Cleaning BullMQ queues...\n');

  for (const queueName of queueNames) {
    const queue = new Queue(queueName, { connection: redisOptions });

    try {
      console.log(`📋 Cleaning ${queueName}...`);

      // Get counts before cleaning
      const counts = await queue.getJobCounts('active', 'waiting', 'failed', 'completed', 'delayed');
      console.log(`   Before: ${JSON.stringify(counts)}`);

      // Clean completed jobs (keep last 5)
      await queue.clean(0, 5, 'completed');

      // Clean failed jobs (keep last 10 for debugging)
      await queue.clean(0, 10, 'failed');

      // Remove all stuck/delayed jobs
      await queue.clean(0, 0, 'delayed');

      // Drain waiting jobs (careful - this removes ALL waiting jobs)
      const waitingJobs = await queue.getJobs(['waiting']);
      for (const job of waitingJobs) {
        await job.remove();
      }

      // Remove active jobs that are stalled
      const activeJobs = await queue.getJobs(['active']);
      console.log(`   Found ${activeJobs.length} active jobs`);

      for (const job of activeJobs) {
        const state = await job.getState();
        console.log(`   - Job ${job.id}: ${state}`);

        // Remove if truly stuck
        if (state === 'active') {
          const lockDuration = 180000; // 3 minutes
          const now = Date.now();
          const jobTimestamp = job.timestamp || 0;

          if (now - jobTimestamp > lockDuration) {
            console.log(`     ⚠️  Job stuck for ${Math.round((now - jobTimestamp) / 1000)}s - removing`);
            await job.remove();
          }
        }
      }

      // Get counts after cleaning
      const countsAfter = await queue.getJobCounts('active', 'waiting', 'failed', 'completed', 'delayed');
      console.log(`   After:  ${JSON.stringify(countsAfter)}`);
      console.log(`   ✅ ${queueName} cleaned\n`);

    } catch (error) {
      console.error(`   ❌ Error cleaning ${queueName}:`, error);
    } finally {
      await queue.close();
    }
  }

  console.log('✅ All queues cleaned!\n');
  process.exit(0);
}

cleanQueues().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
