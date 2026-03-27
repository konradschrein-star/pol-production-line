import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '.env') });

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const jobId = '5424cf36-7cf2-4299-bad9-1605c0ae9ec7';

// ONLY pending scenes (manually verified from database)
const pendingScenes = [
  { id: '60ccd0a3-fa94-4ea4-9c8c-2d0dbdbea4fa', prompt: 'Photorealistic image of the US Capitol building at night, lights illuminating the facade, symbolizing political decision-making' },
  { id: '3691f99b-ddc7-460e-a654-bf66c5e829eb', prompt: 'High-quality photo of electric cars and solar panels representing the future of energy, clean and sustainable technology' },
  { id: '1ce05f95-2da0-416f-a360-109e7716a80f', prompt: 'Group of climate activists celebrating outside the Capitol, holding signs for environmental victory, energetic and hopeful atmosphere' },
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

  console.log(`📋 Queuing ${pendingScenes.length} PENDING scenes only...`);

  for (const scene of pendingScenes) {
    await queueImages.add('generate-image', {
      sceneId: scene.id,
      imagePrompt: scene.prompt,
      jobId: jobId,
    });
    console.log(`✅ Queued pending scene ${scene.id.substring(0, 8)}`);
  }

  await queueImages.close();
  await connection.quit();
  console.log(`✅ All ${pendingScenes.length} pending scenes queued!`);
}

queueScenes().catch(console.error);
