import 'dotenv/config';
import { db } from '../src/lib/db';
import { queueImages } from '../src/lib/queue/queues';

const jobId = '51065529-2613-43e9-b36a-99c05247013d';

async function run() {
  console.log('🖼️  Queuing image generation for all scenes...\n');

  // Get all scenes
  const result = await db.query(
    'SELECT id, scene_order, ticker_headline, image_prompt FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
    [jobId]
  );

  console.log(`📊 Found ${result.rows.length} scenes\n`);

  // Queue each scene for image generation
  for (const scene of result.rows) {
    await queueImages.add('generate-image', {
      jobId,
      sceneId: scene.id,
      imagePrompt: scene.image_prompt,
    });
    console.log(`✅ Queued scene ${scene.scene_order}: ${scene.ticker_headline}`);
  }

  console.log(`\n✅ All ${result.rows.length} scenes queued for image generation!`);
  console.log(`\n⏳ This will take approximately 20-30 minutes...`);
  console.log(`   Monitoring: npx tsx scripts/monitor-image-generation.ts ${jobId}`);

  process.exit(0);
}

run().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
