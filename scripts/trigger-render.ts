/**
 * Trigger final video render
 */

import 'dotenv/config';
import { queueRender } from '../src/lib/queue/queues';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function triggerRender() {
  console.log('🎬 Triggering final video render...');
  console.log(`Job ID: ${JOB_ID}\n`);

  // Update job status to rendering
  await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "UPDATE news_jobs SET status = 'rendering' WHERE id = '${JOB_ID}';"`
  );
  console.log('📊 Status updated to: rendering');

  // Queue render job
  const job = await queueRender.add('render-video', {
    jobId: JOB_ID,
  });

  console.log(`✅ Render job queued (BullMQ Job ID: ${job.id})`);
  console.log('   Workers should start rendering...\n');

  await queueRender.close();
  process.exit(0);
}

triggerRender().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
