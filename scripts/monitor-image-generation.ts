import 'dotenv/config';
import { db } from '../src/lib/db';

const jobId = process.argv[2] || '51065529-2613-43e9-b36a-99c05247013d';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('📊 Monitoring image generation progress...\n');
  console.log(`Job ID: ${jobId}`);
  console.log(`Checking every 10 seconds...\n`);

  let lastCompletedCount = 0;

  while (true) {
    await sleep(10000);

    // Get total and completed scene counts
    const result = await db.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as completed
       FROM news_scenes
       WHERE job_id = $1`,
      [jobId]
    );

    const { total, completed } = result.rows[0];
    const percentage = ((completed / total) * 100).toFixed(1);

    console.log(`[${new Date().toLocaleTimeString()}] Progress: ${completed}/${total} (${percentage}%)`);

    // Show newly completed scenes
    if (completed > lastCompletedCount) {
      const newlyCompleted = await db.query(
        `SELECT scene_order, ticker_headline
         FROM news_scenes
         WHERE job_id = $1 AND image_url IS NOT NULL
         ORDER BY scene_order DESC
         LIMIT ${completed - lastCompletedCount}`,
        [jobId]
      );

      newlyCompleted.rows.forEach(s => {
        console.log(`   ✅ Scene ${s.scene_order}: ${s.ticker_headline}`);
      });

      lastCompletedCount = completed;
    }

    // Check if all complete
    if (completed >= total) {
      console.log(`\n╔══════════════════════════════════════════════════════════╗`);
      console.log(`║   ✅ ALL IMAGES GENERATED! (${total}/${total})                    ║`);
      console.log(`╚══════════════════════════════════════════════════════════╝\n`);

      // Copy images to public folder
      console.log('📦 Copying images to public folder...');

      const scenes = await db.query(
        'SELECT id, image_url FROM news_scenes WHERE job_id = $1',
        [jobId]
      );

      const fs = await import('fs');
      const path = await import('path');

      const publicImagesDir = path.join(process.cwd(), 'public', 'images');
      if (!fs.existsSync(publicImagesDir)) {
        fs.mkdirSync(publicImagesDir, { recursive: true });
      }

      for (const scene of scenes.rows) {
        const srcPath = scene.image_url;
        const filename = path.basename(srcPath);
        const destPath = path.join(publicImagesDir, filename);

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          await db.query(
            'UPDATE news_scenes SET image_url = $1 WHERE id = $2',
            [`images/${filename}`, scene.id]
          );
        }
      }

      console.log('✅ Images copied to public/images/\n');

      console.log('🎬 Ready to render!');
      console.log(`   Run: npx tsx scripts/queue-final-render.ts ${jobId}\n`);

      process.exit(0);
    }
  }
}

run().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
