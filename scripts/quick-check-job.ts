import 'dotenv/config';
import { db } from '../src/lib/db';

async function checkJob(jobId: string) {
  const scenesResult = await db.query(
    `SELECT
      COUNT(*) as total_scenes,
      COUNT(image_url) as images_ready
     FROM news_scenes
     WHERE job_id = $1`,
    [jobId]
  );

  const row = scenesResult.rows[0];
  console.log(`Job: ${jobId}`);
  console.log(`Total scenes: ${row.total_scenes}`);
  console.log(`Images ready: ${row.images_ready}`);
  console.log(`Missing: ${row.total_scenes - row.images_ready}`);

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/quick-check-job.ts <jobId>');
  process.exit(1);
}

checkJob(jobId);
