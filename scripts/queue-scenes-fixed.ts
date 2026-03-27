import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '.env') });

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const jobId = '5424cf36-7cf2-4299-bad9-1605c0ae9ec7';

// Scene data from database
const scenes = [
  { id: '60ccd0a3-fa94-4ea4-9c8c-2d0dbdbea4fa', prompt: 'Historic image of the US Capitol building with dramatic lighting, high quality photojournalism style' },
  { id: '3691f99b-ddc7-460e-a654-bf66c5e829eb', prompt: 'Split-screen image showing Biden and Trump shaking hands in front of American flags, presidential photography style' },
  { id: 'e532b10d-a8cf-4471-90d1-d212edb9636f', prompt: 'Modern infrastructure construction site with cranes and steel beams, bright daylight, documentary photography style' },
  { id: '1ce05f95-2da0-416f-a360-109e7716a80f', prompt: 'Sleek electric vehicles charging at a modern charging station, clean energy theme, tech journalism style' },
  { id: '066b83a8-db90-441f-9d5d-35feeff85247', prompt: 'Clean, modern infographic showing projected carbon emission reductions by 2030, blue and green palette, professional journalism style' },
  { id: 'd9222015-9a94-4909-8a8e-702105aacc12', prompt: 'Diverse group of construction workers wearing hard hats on a job site, American flags in background, documentary style' },
  { id: 'ced0b8fe-8eee-46d8-a124-f40b620fdcd7', prompt: 'Split image showing solar panels and wind turbines against blue sky, renewable energy theme, high quality photography' },
  { id: '5d7c9ec3-2aa4-4643-b912-2afb2a167d5c', prompt: 'Modern American city skyline with clean infrastructure and green spaces, hopeful future theme, aerial photography style' }
];

async function queueScenes() {
  const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });

  const queueImages = new Queue('queue_images', { connection });

  for (const scene of scenes) {
    await queueImages.add('generate-image', {
      sceneId: scene.id,
      imagePrompt: scene.prompt,
      jobId: jobId,
    });
    console.log(`✅ Queued scene ${scene.id.substring(0, 8)}`);
  }

  await queueImages.close();
  await connection.quit();
  console.log('✅ All scenes queued successfully!');
}

queueScenes().catch(console.error);
