/**
 * Manually queue all pending scenes for a job
 */

import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '..', '.env') });

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../src/lib/db';

const jobId = process.argv[2];

if (!jobId) {
  console.error('Usage: npx tsx scripts/queue-all-scenes.ts <job-id>');
  process.exit(1);
}

async function queueAllScenes() {
  try {
    // Get all pending scenes
    const result = await db.query(
      `SELECT id, image_prompt FROM news_scenes
       WHERE job_id = $1 AND generation_status = 'pending'
       ORDER BY scene_order`,
      [jobId]
    );

    if (result.rows.length === 0) {
      console.log('✅ No pending scenes to queue');
      process.exit(0);
    }

    console.log(`📋 Queuing ${result.rows.length} scenes for image generation...`);

    // Create Redis connection
    const connection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

    // Create queue
    const queueImages = new Queue('queue_images', { connection });

    // Queue each scene
    for (const scene of result.rows) {
      await queueImages.add('generate-image', {
        sceneId: scene.id,
        imagePrompt: scene.image_prompt,
        jobId: jobId,
      });
      console.log(`  ✅ Queued scene ${scene.id}`);
    }

    console.log(`\n✅ All ${result.rows.length} scenes queued successfully!`);

    await queueImages.close();
    await connection.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to queue scenes:', error);
    process.exit(1);
  }
}

queueAllScenes();
