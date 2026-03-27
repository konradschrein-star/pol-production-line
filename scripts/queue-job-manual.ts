/**
 * Manually queue a job that exists in database
 * Uses proper env config for Redis authentication
 */

import dotenv from 'dotenv';
import { join } from 'path';

// Load env FIRST
dotenv.config({ path: join(__dirname, '..', '.env') });

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const jobId = process.argv[2];
const rawScript = process.argv[3];

if (!jobId || !rawScript) {
  console.error('Usage: npx tsx scripts/queue-job-manual.ts <job-id> "<raw-script>"');
  process.exit(1);
}

async function queueJob() {
  console.log('📋 Queuing job for analysis...');
  console.log('   Job ID:', jobId);

  try {
    // Create Redis connection with auth
    const connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

    // Create queue
    const queueAnalyze = new Queue('queue_analyze', { connection });

    // Add job
    await queueAnalyze.add('analyze-script', { jobId, rawScript });

    console.log('✅ Job queued successfully!');

    await queueAnalyze.close();
    await connection.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to queue job:', error);
    process.exit(1);
  }
}

queueJob();
