import 'dotenv/config';
import { db } from '../src/lib/db';

async function resetStatus(jobId: string) {
  await db.query(
    'UPDATE news_jobs SET status = $1, error_message = NULL WHERE id = $2',
    ['review_assets', jobId]
  );

  console.log('✅ Status reset to review_assets');
  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/reset-job-status.ts <jobId>');
  process.exit(1);
}

resetStatus(jobId);
