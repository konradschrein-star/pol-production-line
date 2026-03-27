import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '.env') });

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const jobId = '5424cf36-7cf2-4299-bad9-1605c0ae9ec7';

async function queueRender() {
  const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  });

  const queueRender = new Queue('queue_render', { connection });

  console.log('🎬 Queuing video render job...');
  console.log('   Job ID:', jobId);
  console.log('   Scenes: 7/8 completed');

  await queueRender.add('render-video', { jobId });

  console.log('\n✅ Render job queued!');
  console.log('📊 Expected render time: 2-3 minutes');
  console.log('📹 Output will be saved to: obsidian-news-desk/tmp/' + jobId + '.mp4');

  await queueRender.close();
  await connection.quit();
}

queueRender().catch(console.error);
