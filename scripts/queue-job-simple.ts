/**
 * Queue job - Simple version (no DB query)
 */

import { Queue } from 'bullmq';
import { redisOptions } from '../src/lib/queue/index';

const jobId = process.argv[2];
const rawScript = process.argv[3];

if (!jobId || !rawScript) {
  console.error('Usage: npx tsx scripts/queue-job-simple.ts <job-id> "<raw-script>"');
  process.exit(1);
}

async function queueJob() {
  console.log('📋 Queuing job for processing...');
  console.log('   Job ID:', jobId);

  const queueAnalyze = new Queue('queue_analyze', { connection: redisOptions });

  await queueAnalyze.add('analyze-script', { jobId, rawScript });

  console.log('✅ Job queued successfully!');
  await queueAnalyze.close();
  process.exit(0);
}

queueJob().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
