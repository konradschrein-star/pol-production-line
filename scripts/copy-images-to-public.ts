import 'dotenv/config';
import { db } from '../src/lib/db';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const jobId = 'e2d3cc06-1cfe-49cd-961e-5c0f4f572036';

async function run() {
  try {
    // Get all scenes for this job
    const result = await db.query('SELECT id, image_url FROM news_scenes WHERE job_id = $1', [jobId]);

    // Ensure public/images directory exists
    const publicImagesDir = join(process.cwd(), 'public', 'images');
    if (!existsSync(publicImagesDir)) {
      mkdirSync(publicImagesDir, { recursive: true });
    }

    console.log('📦 Copying images to public folder...');

    for (const scene of result.rows) {
      const srcPath = scene.image_url;
      const filename = basename(srcPath);
      const destPath = join(publicImagesDir, filename);

      copyFileSync(srcPath, destPath);

      // Update database with relative path
      await db.query('UPDATE news_scenes SET image_url = $1 WHERE id = $2', [`images/${filename}`, scene.id]);

      console.log(`  ✅ ${filename}`);
    }

    console.log('✅ All images copied to public/images/\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

run();
