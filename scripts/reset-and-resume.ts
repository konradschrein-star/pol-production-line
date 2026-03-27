import 'dotenv/config';
import { db } from '../src/lib/db';
import { queueImages } from '../src/lib/queue/queues';

const jobId = '51065529-2613-43e9-b36a-99c05247013d';

async function run() {
  console.log('🔄 Resetting job and resuming image generation...\n');

  // Reset job status
  await db.query(
    'UPDATE news_jobs SET status = $1, error_message = NULL WHERE id = $2',
    ['generating_images', jobId]
  );

  // Check progress
  const progressResult = await db.query(
    'SELECT COUNT(*) as total, COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as completed FROM news_scenes WHERE job_id = $1',
    [jobId]
  );

  const { total, completed } = progressResult.rows[0];
  console.log(`✅ Job status reset to generating_images`);
  console.log(`📊 Current progress: ${completed}/${total} images\n`);

  if (completed >= total) {
    console.log('✅ All images already generated!');
    process.exit(0);
  }

  // Re-queue only incomplete scenes
  const scenesResult = await db.query(
    'SELECT id, scene_order, ticker_headline, image_prompt FROM news_scenes WHERE job_id = $1 AND image_url IS NULL ORDER BY scene_order',
    [jobId]
  );

  console.log(`🖼️  Re-queuing ${scenesResult.rows.length} incomplete scenes...\n`);

  for (const scene of scenesResult.rows) {
    await queueImages.add('generate-image', {
      jobId,
      sceneId: scene.id,
      imagePrompt: scene.image_prompt,
    });
    console.log(`✅ Queued scene ${scene.scene_order}: ${scene.ticker_headline}`);
  }

  console.log(`\n✅ ${scenesResult.rows.length} scenes re-queued!`);
  console.log(`⏳ Monitoring: npx tsx scripts/monitor-image-generation.ts ${jobId}\n`);

  process.exit(0);
}

run().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
