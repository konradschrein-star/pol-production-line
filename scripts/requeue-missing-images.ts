import 'dotenv/config';
import { db } from '../src/lib/db';
import { queueImages } from '../src/lib/queue/queues';

async function requeueMissingImages(jobId: string) {
  console.log(`🔄 Requeuing missing images for job ${jobId}...`);

  // Find scenes without images
  const result = await db.query(
    `SELECT id, scene_order, image_prompt, ticker_headline
     FROM news_scenes
     WHERE job_id = $1 AND image_url IS NULL
     ORDER BY scene_order`,
    [jobId]
  );

  console.log(`Found ${result.rows.length} scenes without images\n`);

  // Queue each scene for image generation
  for (const scene of result.rows) {
    console.log(`  Queuing scene ${scene.scene_order}: ${scene.ticker_headline}`);

    await queueImages.add('generate-image', {
      jobId,
      sceneId: scene.id,
      imagePrompt: scene.image_prompt,
    });
  }

  console.log(`\n✅ Queued ${result.rows.length} images`);

  process.exit(0);
}

const jobId = process.argv[2] || 'e78e6feb-386f-45f7-ba58-d439c6e7fca6';
requeueMissingImages(jobId).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
