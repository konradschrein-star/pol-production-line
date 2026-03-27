/**
 * Queue pending scenes to images worker
 */

import 'dotenv/config';
import { queueImages } from '../src/lib/queue/queues';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function queueScenes() {
  console.log('📋 Fetching pending scenes...');

  // Get scenes from database
  const { stdout } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -A -F"|" -c "SELECT id, image_prompt FROM news_scenes WHERE job_id = '${JOB_ID}' AND generation_status = 'pending' ORDER BY scene_order;"`
  );

  const lines = stdout.trim().split('\n').filter(l => l.trim());
  console.log(`   Found ${lines.length} pending scenes\n`);

  if (lines.length === 0) {
    console.log('ℹ️  No pending scenes to queue');
    process.exit(0);
  }

  // Queue each scene
  let queued = 0;
  for (const line of lines) {
    const [sceneId, imagePrompt] = line.split('|');

    await queueImages.add('generate-image', {
      sceneId,
      imagePrompt,
      jobId: JOB_ID,
    });

    queued++;
  }

  console.log(`✅ Queued ${queued} scenes to queue_images`);
  console.log('   Workers should start processing immediately\n');

  await queueImages.close();
  process.exit(0);
}

queueScenes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
