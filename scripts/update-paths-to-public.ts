/**
 * Update database paths to use public/ folder relative paths
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function updatePaths() {
  console.log('🔄 Updating paths to use public/ folder...\n');

  // Get all scenes
  const { stdout } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -A -F"|" -c "SELECT id, image_url FROM news_scenes WHERE job_id = '${JOB_ID}';"`
  );

  const scenes = stdout.trim().split('\n');
  console.log(`   Found ${scenes.length} scenes\n`);

  // Update each scene path
  for (const line of scenes) {
    const [sceneId, imageUrl] = line.split('|');
    const filename = path.basename(imageUrl);
    const newPath = `images/${filename}`;

    await execAsync(
      `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "UPDATE news_scenes SET image_url = '${newPath}' WHERE id = '${sceneId}';"`
    );

    console.log(`✅ ${sceneId.substring(0, 8)}: ${newPath}`);
  }

  // Update avatar path
  await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "UPDATE news_jobs SET avatar_mp4_url = 'avatars/test-avatar-99s.mp4' WHERE id = '${JOB_ID}';"`
  );
  console.log(`\n✅ Avatar path updated to: avatars/test-avatar-99s.mp4\n`);

  console.log('✅ All paths updated!\n');
  process.exit(0);
}

updatePaths().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
