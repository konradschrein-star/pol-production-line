import 'dotenv/config';
import { db } from '../src/lib/db';

async function fixPaths(jobId: string) {
  console.log(`🔧 Fixing image paths for job ${jobId}...\n`);

  // Update all scenes to use public/images/ prefix
  const result = await db.query(
    `UPDATE news_scenes
     SET image_url = 'public/' || image_url
     WHERE job_id = $1 AND image_url NOT LIKE 'public/%'
     RETURNING id, scene_order, image_url`,
    [jobId]
  );

  console.log(`✅ Updated ${result.rows.length} scenes\n`);

  // Show first few
  result.rows.slice(0, 5).forEach(s => {
    console.log(`  ${s.scene_order}: ${s.image_url}`);
  });

  // Also update avatar if needed
  const avatarResult = await db.query(
    `UPDATE news_jobs
     SET avatar_mp4_url = 'public/' || avatar_mp4_url
     WHERE id = $1 AND avatar_mp4_url NOT LIKE 'public/%'
     RETURNING id, avatar_mp4_url`,
    [jobId]
  );

  if (avatarResult.rows.length > 0) {
    console.log(`\n✅ Updated avatar: ${avatarResult.rows[0].avatar_mp4_url}`);
  }

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/fix-image-paths.ts <jobId>');
  process.exit(1);
}

fixPaths(jobId).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
