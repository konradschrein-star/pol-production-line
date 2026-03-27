import 'dotenv/config';
import { db } from '../src/lib/db';
import { queueRender } from '../src/lib/queue/queues';

const jobId = process.argv[2] || '51065529-2613-43e9-b36a-99c05247013d';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🎬 Queuing final render...\n');

  // Update job status
  await db.query(
    'UPDATE news_jobs SET status = $1, error_message = NULL WHERE id = $2',
    ['rendering', jobId]
  );

  // Queue render
  await queueRender.add('render-video', { jobId });

  console.log(`✅ Render queued for job: ${jobId}`);
  console.log(`⏳ Monitoring render progress...\n`);

  // Poll until complete
  while (true) {
    await sleep(10000);

    const result = await db.query(
      'SELECT status, final_video_url, error_message FROM news_jobs WHERE id = $1',
      [jobId]
    );
    const job = result.rows[0];

    console.log(`[${new Date().toLocaleTimeString()}] Status: ${job.status}`);

    if (job.status === 'completed') {
      console.log(`\n╔══════════════════════════════════════════════════════════╗`);
      console.log(`║   ✅ RENDER COMPLETE! 🎉                                ║`);
      console.log(`╚══════════════════════════════════════════════════════════╝\n`);

      const videoPath = `C:\\Users\\konra\\ObsidianNewsDesk\\videos\\${jobId}.mp4`;
      console.log(`📹 Final Video: ${videoPath}`);
      console.log(`🆔 Job ID: ${jobId}\n`);

      console.log(`🎯 VERIFICATION CHECKLIST:`);
      console.log(`   [ ] Avatar is larger (50% height, not 40%)`);
      console.log(`   [ ] Ticker overlay at BOTTOM`);
      console.log(`   [ ] Images match script content (AI, EVs, space, etc.)`);
      console.log(`   [ ] Pacing: ~2-3 seconds per scene in body`);
      console.log(`   [ ] 26 scenes across full video`);
      console.log(`   [ ] NO BLACK BARS\n`);

      process.exit(0);
    }

    if (job.status === 'failed') {
      console.log(`\n❌ RENDER FAILED:`);
      console.log(`   ${job.error_message}\n`);
      process.exit(1);
    }
  }
}

run().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
