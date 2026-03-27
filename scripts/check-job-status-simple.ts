import 'dotenv/config';
import { db } from '../src/lib/db';

async function checkStatus(jobId: string) {
  const result = await db.query(
    'SELECT id, status, error_message, final_video_url, created_at FROM news_jobs WHERE id = $1',
    [jobId]
  );

  if (result.rows.length === 0) {
    console.log('❌ Job not found');
    process.exit(1);
  }

  const job = result.rows[0];
  console.log(`Job ID: ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Error: ${job.error_message || 'None'}`);
  console.log(`Video: ${job.final_video_url || 'Not yet'}`);
  console.log(`Created: ${job.created_at}`);

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/check-job-status-simple.ts <jobId>');
  process.exit(1);
}

checkStatus(jobId);
