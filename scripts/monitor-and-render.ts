/**
 * Monitor scene generation and automatically trigger render
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

async function queryDB(sql: string) {
  const { stdout } = await execAsync(
    `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "${sql}"`
  );
  return stdout.trim();
}

async function getSceneStatus() {
  const result = await queryDB(
    `SELECT generation_status, COUNT(*) FROM news_scenes WHERE job_id = '${JOB_ID}' GROUP BY generation_status ORDER BY generation_status;`
  );
  const lines = result.split('\n').filter(l => l.trim());

  const stats: Record<string, number> = {};
  for (const line of lines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length === 2) {
      stats[parts[0]] = parseInt(parts[1]);
    }
  }

  return stats;
}

async function monitor() {
  console.log('🎬 Monitoring image generation...');
  console.log(`Job ID: ${JOB_ID}\n`);

  let iteration = 0;
  const startTime = Date.now();

  while (true) {
    iteration++;
    const stats = await getSceneStatus();

    const completed = stats['completed'] || 0;
    const pending = stats['pending'] || 0;
    const generating = stats['generating'] || 0;
    const failed = stats['failed'] || 0;
    const total = completed + pending + generating + failed;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[${elapsed}s] Completed: ${completed}/${total} | Pending: ${pending} | Generating: ${generating} | Failed: ${failed}`);

    // Check if all done
    if (pending === 0 && generating === 0 && total > 0) {
      console.log('\n✅ All scenes processed!');
      console.log(`   Completed: ${completed}`);
      console.log(`   Failed: ${failed}`);

      if (failed > 0) {
        console.log(`\n⚠️  Warning: ${failed} scene(s) failed`);
        console.log('   You can manually replace these images before rendering\n');
      }

      // Update job status to review_assets
      await queryDB(
        `UPDATE news_jobs SET status = 'review_assets' WHERE id = '${JOB_ID}'`
      );
      console.log('📊 Job status updated to: review_assets');
      console.log('   Next: Upload avatar and trigger render\n');

      break;
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  process.exit(0);
}

monitor().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
