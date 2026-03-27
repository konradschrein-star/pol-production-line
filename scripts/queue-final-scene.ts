import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '.env') });

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const jobId = '5424cf36-7cf2-4299-bad9-1605c0ae9ec7';

async function queueFinalScene() {
  const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });

  const queueImages = new Queue('queue_images', { connection });

  console.log('📋 Queuing final scene #6 (stock market dashboard)...');

  await queueImages.add('generate-image', {
    sceneId: 'd9222015-9a94-4909-8a8e-702105aacc12',
    imagePrompt: 'High-quality image of a stock market dashboard showing Tesla and Rivian stock prices surging, indicating market response',
    jobId: jobId,
  });

  console.log('✅ Final scene queued!');

  await queueImages.close();
  await connection.quit();
}

queueFinalScene().catch(console.error);
