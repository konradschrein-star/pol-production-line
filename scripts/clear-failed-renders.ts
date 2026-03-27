import 'dotenv/config';
import { queueRender } from '../src/lib/queue/queues';

async function clearFailed() {
  console.log('🧹 Clearing failed render jobs...\n');

  // Get all failed jobs
  const failed = await queueRender.getFailed();
  console.log(`Found ${failed.length} failed jobs`);

  // Remove them
  for (const job of failed) {
    await job.remove();
    console.log(`  Removed job ${job.id}`);
  }

  console.log('\n✅ Cleared all failed jobs');

  await queueRender.close();
  process.exit(0);
}

clearFailed().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
