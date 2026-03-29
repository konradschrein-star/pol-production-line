#!/usr/bin/env tsx
/**
 * Check Redis BullMQ queue for failed jobs and error messages
 */

import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

async function checkRedisErrors() {
  try {
    // Check each queue
    const queueNames = ['queue_images', 'queue_analyze', 'queue_render'];

    for (const queueName of queueNames) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Queue: ${queueName}`);
      console.log('='.repeat(80));

      const queue = new Queue(queueName, { connection });

      // Get failed jobs
      const failed = await queue.getFailed(0, 10);

      if (failed.length === 0) {
        console.log('✅ No failed jobs in this queue\n');
        continue;
      }

      console.log(`\n❌ Found ${failed.length} failed jobs:\n`);

      for (const job of failed) {
        console.log(`\nJob ID: ${job.id}`);
        console.log(`Name: ${job.name}`);
        console.log(`Attempts: ${job.attemptsMade}/${job.opts.attempts || 'unlimited'}`);
        console.log(`Failed at: ${job.finishedOn ? new Date(job.finishedOn).toISOString() : 'Unknown'}`);

        if (job.failedReason) {
          console.log(`\n🔴 Error Reason:`);
          console.log(job.failedReason);
        }

        if (job.stacktrace && job.stacktrace.length > 0) {
          console.log(`\n📚 Stack Trace (first 500 chars):`);
          console.log(job.stacktrace[0].substring(0, 500));
        }

        console.log(`\nJob Data:`);
        console.log(JSON.stringify(job.data, null, 2));

        console.log('\n' + '-'.repeat(80));
      }

      // Clean up
      await queue.close();
    }

    console.log('\n\n✅ Redis queue inspection complete');

  } catch (error) {
    console.error('❌ Error checking Redis:', error);
    process.exit(1);
  } finally {
    await connection.quit();
  }
}

checkRedisErrors().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
