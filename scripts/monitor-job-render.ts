import 'dotenv/config';
import { db } from '../src/lib/db';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function monitor(jobId: string) {
  console.log(`🔍 Monitoring render for job ${jobId}...\n`);

  let lastStatus = '';

  while (true) {
    const result = await db.query(
      'SELECT status, error_message, final_video_url FROM news_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      console.log('❌ Job not found');
      process.exit(1);
    }

    const job = result.rows[0];

    if (job.status !== lastStatus) {
      console.log(`[${new Date().toLocaleTimeString()}] Status: ${job.status}`);
      lastStatus = job.status;
    }

    if (job.status === 'completed') {
      console.log(`\n✅ Render complete!`);
      console.log(`📹 Video: ${job.final_video_url}`);
      process.exit(0);
    }

    if (job.status === 'failed') {
      console.log(`\n❌ Render failed:`);
      console.log(job.error_message);
      process.exit(1);
    }

    await sleep(5000);
  }
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/monitor-job-render.ts <jobId>');
  process.exit(1);
}

monitor(jobId);
