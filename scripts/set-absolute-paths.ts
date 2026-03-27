import 'dotenv/config';
import { db } from '../src/lib/db';
import { join } from 'path';

async function setAbsolutePaths(jobId: string) {
  console.log(`🔧 Setting absolute paths for job ${jobId}...\n`);

  const projectRoot = process.cwd();
  console.log(`Project root: ${projectRoot}\n`);

  // Update all scenes to use absolute paths
  const scenes = await db.query(
    'SELECT id, scene_order, image_url FROM news_scenes WHERE job_id = $1',
    [jobId]
  );

  for (const scene of scenes.rows) {
    // The files are in public/images/
    const filename = scene.image_url.split(/[/\\]/).pop();
    const absolutePath = join(projectRoot, 'public', 'images', filename);

    await db.query(
      'UPDATE news_scenes SET image_url = $1 WHERE id = $2',
      [absolutePath, scene.id]
    );

    console.log(`Scene ${scene.scene_order}: ${filename}`);
    console.log(`  → ${absolutePath}\n`);
  }

  console.log(`✅ Updated ${scenes.rows.length} scenes\n`);

  // Update avatar
  const job = await db.query(
    'SELECT id, avatar_mp4_url FROM news_jobs WHERE id = $1',
    [jobId]
  );

  if (job.rows.length > 0 && job.rows[0].avatar_mp4_url) {
    const filename = job.rows[0].avatar_mp4_url.split(/[/\\]/).pop();
    const absolutePath = join(projectRoot, 'public', 'avatars', filename);

    await db.query(
      'UPDATE news_jobs SET avatar_mp4_url = $1 WHERE id = $2',
      [absolutePath, jobId]
    );

    console.log(`✅ Avatar: ${absolutePath}`);
  }

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/set-absolute-paths.ts <jobId>');
  process.exit(1);
}

setAbsolutePaths(jobId).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
