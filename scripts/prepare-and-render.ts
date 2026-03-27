import 'dotenv/config';
import { db } from '../src/lib/db';
import { queueRender } from '../src/lib/queue/queues';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function prepareAndRender(jobId: string) {
  console.log(`📦 Preparing assets for job ${jobId}...\n`);

  // Create public/images directory if it doesn't exist
  const publicDir = join(process.cwd(), 'public', 'images');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Get all scenes with images
  const scenesList = await db.query(
    'SELECT id, image_url FROM news_scenes WHERE job_id = $1',
    [jobId]
  );

  console.log(`Found ${scenesList.rows.length} scenes`);

  let copied = 0;
  let skipped = 0;

  // Copy images to public folder
  for (const scene of scenesList.rows) {
    if (scene.image_url) {
      const sourcePath = scene.image_url.startsWith('images/')
        ? join(process.cwd(), 'public', scene.image_url)
        : scene.image_url;

      if (existsSync(sourcePath)) {
        const filename = scene.image_url.split(/[/\\]/).pop();
        const destPath = join(publicDir, filename);

        // Copy file if not already in public folder
        if (sourcePath !== destPath) {
          copyFileSync(sourcePath, destPath);
          console.log(`✅ Copied: ${filename}`);
          copied++;
        } else {
          console.log(`⏭️  Already in public: ${filename}`);
          skipped++;
        }

        // Update database to use absolute path
        await db.query(
          'UPDATE news_scenes SET image_url = $1 WHERE id = $2',
          [destPath, scene.id]
        );
      } else {
        console.log(`❌ Not found: ${scene.image_url}`);
      }
    }
  }

  console.log(`\n📊 Summary: ${copied} copied, ${skipped} already in place\n`);

  // Update job status to rendering
  await db.query('UPDATE news_jobs SET status = $1, error_message = NULL WHERE id = $2', ['rendering', jobId]);

  // Queue render
  console.log('🎬 Queuing render...');
  await queueRender.add('render-video', { jobId });
  console.log('✅ Render queued\n');

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/prepare-and-render.ts <jobId>');
  process.exit(1);
}

prepareAndRender(jobId).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
