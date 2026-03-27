import 'dotenv/config';
import { queueRender } from '../src/lib/queue/queues';

async function queueRenderJob(jobId: string) {
  console.log(`🎬 Queuing render for job ${jobId}...`);

  await queueRender.add('render-video', { jobId });

  console.log(`✅ Render queued`);

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/queue-render-job.ts <jobId>');
  process.exit(1);
}

queueRenderJob(jobId).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
