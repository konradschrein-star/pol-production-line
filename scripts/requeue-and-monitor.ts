import 'dotenv/config';
import { db } from '../src/lib/db';
import { queueRender } from '../src/lib/queue/queues';

const jobId = 'e2d3cc06-1cfe-49cd-961e-5c0f4f572036';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🔄 Requeuing render with Scene.tsx fix applied...\n');

  // Reset job to rendering status
  await db.query('UPDATE news_jobs SET status = $1, error_message = NULL WHERE id = $2', ['rendering', jobId]);

  // Requeue render
  await queueRender.add('render-video', { jobId });

  console.log('✅ Render requeued for job:', jobId);
  console.log('⏳ Monitoring render progress (checking every 10s)...\n');

  // Poll until complete
  while (true) {
    await sleep(10000);

    const result = await db.query('SELECT status, final_video_url, error_message FROM news_jobs WHERE id = $1', [jobId]);
    const job = result.rows[0];

    console.log(`[${new Date().toLocaleTimeString()}] Status: ${job.status}`);

    if (job.status === 'completed') {
      console.log(`\n╔══════════════════════════════════════════════════════════╗`);
      console.log(`║   ✅ RENDER COMPLETE! TEST SUCCESSFUL! 🎉              ║`);
      console.log(`╚══════════════════════════════════════════════════════════╝\n`);

      console.log(`📹 Final Video: ${job.final_video_url || 'tmp/' + jobId + '.mp4'}`);
      console.log(`🆔 Job ID: ${jobId}\n`);

      console.log(`🎯 VERIFICATION CHECKLIST:`);
      console.log(`   [ ] Ticker overlay at BOTTOM`);
      console.log(`   [ ] Ticker stays FIXED`);
      console.log(`   [ ] Ticker text scrolls SMOOTHLY`);
      console.log(`   [ ] Images start at 100% scale`);
      console.log(`   [ ] Zoom rate is CONSTANT across scenes`);
      console.log(`   [ ] NO BLACK BARS anywhere\n`);

      process.exit(0);
    }

    if (job.status === 'failed') {
      console.log(`\n❌ RENDER FAILED:`);
      console.log(`   ${job.error_message}\n`);
      process.exit(1);
    }
  }
}

run();
