import 'dotenv/config';
import { db } from '../src/lib/db';

async function showPaths(jobId: string) {
  const result = await db.query(
    'SELECT scene_order, image_url FROM news_scenes WHERE job_id = $1 ORDER BY scene_order LIMIT 5',
    [jobId]
  );

  console.log('Scene paths in database:\n');
  result.rows.forEach(row => {
    console.log(`Scene ${row.scene_order}:`);
    console.log(`  ${row.image_url}\n`);
  });

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/show-scene-paths.ts <jobId>');
  process.exit(1);
}

showPaths(jobId);
