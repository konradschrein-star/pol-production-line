/**
 * Re-queue existing job with correct parameters
 */

import { db } from '../src/lib/db';
import { queueAnalyze } from '../src/lib/queue/queues';

const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function requeue() {
  console.log('📤 Re-queueing job for analysis...');
  console.log(`Job ID: ${JOB_ID}`);

  // Fetch raw_script from database
  const result = await db.query(
    'SELECT raw_script FROM news_jobs WHERE id = $1',
    [JOB_ID]
  );

  if (!result.rows[0]) {
    console.error('❌ Job not found in database');
    process.exit(1);
  }

  const rawScript = result.rows[0].raw_script;

  console.log(`\n📝 Script length: ${rawScript.length} characters`);
  console.log(`🤖 Provider: google\n`);

  // Queue with correct data
  const job = await queueAnalyze.add('analyze-script', {
    jobId: JOB_ID,
    rawScript: rawScript,
    provider: 'google'
  });

  console.log(`✅ Queued successfully (BullMQ Job ID: ${job.id})`);

  // Close connections
  await db.end();
  await queueAnalyze.close();
  process.exit(0);
}

requeue().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
