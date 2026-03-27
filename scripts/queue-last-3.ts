import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '.env') });

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const jobId = '5424cf36-7cf2-4299-bad9-1605c0ae9ec7';

// Last 3 pending scenes (#6, #7, #8)
const lastScenes = [
  { id: 'd9222015-9a94-4909-8a8e-702105aacc12', prompt: 'High-quality image of a stock market dashboard showing Tesla and Rivian stock prices surging, indicating market response' },
  { id: 'ced0b8fe-8eee-46d8-a124-f40b620fdcd7', prompt: 'Photorealistic image of the House of Representatives chamber, preparing for a significant vote, emphasis on the Speaker\'s podium' },
  { id: '5d7c9ec3-2aa4-4643-b912-2afb2a167d5c', prompt: 'Professional journalism photo of an electric vehicle charging station with price tags, symbolizing the shift towards green energy' }
];

async function queueScenes() {
  const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });

  const queueImages = new Queue('queue_images', { connection });

  console.log(`📋 Queuing last ${lastScenes.length} scenes...`);

  for (const scene of lastScenes) {
    await queueImages.add('generate-image', {
      sceneId: scene.id,
      imagePrompt: scene.prompt,
      jobId: jobId,
    });
    console.log(`✅ Queued scene #${lastScenes.indexOf(scene) + 6}: ${scene.id.substring(0, 8)}`);
  }

  await queueImages.close();
  await connection.quit();
  console.log(`\n✅ All ${lastScenes.length} final scenes queued!`);
  console.log('📊 Expected completion: ~2-3 minutes');
}

queueScenes().catch(console.error);
