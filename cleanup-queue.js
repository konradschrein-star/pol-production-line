/**
 * Cleanup Script for Stuck BullMQ Jobs
 * Run with: node cleanup-queue.js
 */

const { Queue } = require('bullmq');

const redisOptions = {
  host: 'localhost',
  port: 6379,
};

const queueImages = new Queue('queue_images', { connection: redisOptions });

async function cleanupQueue() {
  console.log('\n🔍 Checking BullMQ Queue Status...\n');

  try {
    // Get queue counts
    const counts = await queueImages.getJobCounts();
    console.log('📊 Queue Counts:');
    console.log(`  Waiting: ${counts.waiting}`);
    console.log(`  Active: ${counts.active} ${counts.active > 0 ? '⚠️  STUCK JOBS!' : ''}`);
    console.log(`  Completed: ${counts.completed}`);
    console.log(`  Failed: ${counts.failed}`);
    console.log(`  Delayed: ${counts.delayed}`);

    // Get active jobs (these might be stuck)
    const activeJobs = await queueImages.getActive();
    if (activeJobs.length > 0) {
      console.log('\n⚠️  Active Jobs (potentially stuck):');
      for (const job of activeJobs) {
        const age = Date.now() - job.timestamp;
        const ageMinutes = Math.floor(age / 1000 / 60);
        console.log(`  Job ${job.id}:`);
        console.log(`    Scene: ${job.data.sceneId}`);
        console.log(`    Prompt: ${job.data.imagePrompt.substring(0, 60)}...`);
        console.log(`    Age: ${ageMinutes} minutes ${ageMinutes > 5 ? '🚨 STUCK!' : ''}`);
        console.log(`    Attempts: ${job.attemptsMade + 1}`);
      }
    }

    // Get waiting jobs
    const waitingJobs = await queueImages.getWaiting();
    if (waitingJobs.length > 0) {
      console.log(`\n⏳ Waiting Jobs: ${waitingJobs.length}`);
      waitingJobs.slice(0, 5).forEach((job, i) => {
        console.log(`  ${i + 1}. Scene ${job.data.sceneId.substring(0, 8)}... (Job ${job.id})`);
      });
      if (waitingJobs.length > 5) {
        console.log(`  ... and ${waitingJobs.length - 5} more`);
      }
    }

    // Get failed jobs
    const failedJobs = await queueImages.getFailed();
    if (failedJobs.length > 0) {
      console.log(`\n❌ Failed Jobs: ${failedJobs.length}`);
      failedJobs.slice(0, 3).forEach((job, i) => {
        console.log(`  ${i + 1}. Scene ${job.data.sceneId.substring(0, 8)}...`);
        console.log(`     Error: ${job.failedReason ? job.failedReason.substring(0, 80) : 'Unknown'}`);
      });
    }

    // Offer cleanup options
    console.log('\n🔧 Cleanup Options:');
    console.log('  1. Clean stuck active jobs (moves them to failed)');
    console.log('  2. Clean all failed jobs');
    console.log('  3. Clean all completed jobs');
    console.log('  4. Full queue reset (nuclear option)');
    console.log('  5. Just show info (no changes)');

    // For now, just auto-clean stuck active jobs if any
    if (activeJobs.length > 0) {
      console.log('\n⚠️  Automatically cleaning stuck active jobs...');

      for (const job of activeJobs) {
        const age = Date.now() - job.timestamp;
        const ageMinutes = Math.floor(age / 1000 / 60);

        // If job is older than 5 minutes, it's definitely stuck
        if (ageMinutes > 5) {
          console.log(`  Failing stuck job ${job.id} (${ageMinutes} minutes old)...`);
          await job.moveToFailed(
            new Error(`Job stuck for ${ageMinutes} minutes - cleaned up by cleanup script`),
            '0' // token
          );
        }
      }

      console.log('✅ Stuck jobs cleaned!');
    }

    // Clean completed jobs older than 1 hour
    console.log('\n🧹 Cleaning old completed jobs...');
    const removed = await queueImages.clean(3600 * 1000, 100, 'completed'); // 1 hour
    console.log(`  Removed ${removed.length} old completed jobs`);

    // Final status
    const finalCounts = await queueImages.getJobCounts();
    console.log('\n✅ Final Queue Status:');
    console.log(`  Waiting: ${finalCounts.waiting}`);
    console.log(`  Active: ${finalCounts.active}`);
    console.log(`  Completed: ${finalCounts.completed}`);
    console.log(`  Failed: ${finalCounts.failed}`);

    if (finalCounts.active === 0 && finalCounts.waiting > 0) {
      console.log('\n✅ Queue is clean! Waiting jobs should start processing now.');
      console.log('   Make sure workers are running (START.bat)');
    } else if (finalCounts.active > 0) {
      console.log('\n⚠️  Some active jobs remain. They may be actively processing.');
      console.log('   Wait 3 minutes, then run this script again if still stuck.');
    }

    console.log('\n✅ Cleanup complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await queueImages.close();
  }
}

cleanupQueue();
