/**
 * Monitor Job Progress Through Complete Pipeline
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

async function getJobStatus() {
  const status = await queryDB(
    `SELECT status, error_message FROM news_jobs WHERE id = '${JOB_ID}'`
  );
  return status.split('|').map(s => s.trim());
}

async function getSceneProgress() {
  const result = await queryDB(
    `SELECT generation_status, COUNT(*) FROM news_scenes WHERE job_id = '${JOB_ID}' GROUP BY generation_status`
  );
  return result;
}

async function queueForAnalysis() {
  console.log('📤 Queueing job for analysis...');

  // Use BullMQ to add job to analyze queue
  const { stdout } = await execAsync(
    `cd "C:\\Users\\konra\\OneDrive\\Projekte\\20260319 Political content automation\\obsidian-news-desk" && npx tsx -e "
    import { queueAnalyze } from './src/lib/queue/queues';
    queueAnalyze.add('analyze-script', {
      jobId: '${JOB_ID}',
      provider: 'google'
    }).then(() => {
      console.log('✅ Queued for analysis');
      process.exit(0);
    }).catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
    "`
  );

  console.log(stdout);
}

async function monitor() {
  console.log('\n🎬 MONITORING JOB: ' + JOB_ID);
  console.log('='.repeat(60) + '\n');

  let lastStatus = '';
  let iteration = 0;

  while (true) {
    iteration++;

    const [status, errorMsg] = await getJobStatus();

    if (status !== lastStatus) {
      console.log(`\n[${new Date().toLocaleTimeString()}] Status: ${status}`);
      lastStatus = status;
    }

    // Show progress for generating_images stage
    if (status === 'generating_images') {
      const progress = await getSceneProgress();
      console.log(`   ${progress}`);
    }

    // Check if done
    if (status === 'completed') {
      console.log('\n' + '='.repeat(60));
      console.log('✅ JOB COMPLETED SUCCESSFULLY!');
      console.log('='.repeat(60) + '\n');

      // Get final details
      const finalVideo = await queryDB(
        `SELECT final_video_url, thumbnail_url FROM news_jobs WHERE id = '${JOB_ID}'`
      );
      console.log('📹 Video:', finalVideo.split('|')[0].trim());
      console.log('🖼️  Thumbnail:', finalVideo.split('|')[1]?.trim() || 'Not generated');

      break;
    }

    if (status === 'failed') {
      console.log('\n' + '='.repeat(60));
      console.log('❌ JOB FAILED');
      console.log('='.repeat(60));
      console.log('Error:', errorMsg);
      break;
    }

    // Wait 5 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Show progress indicator
    if (iteration % 6 === 0) {
      process.stdout.write('.');
    }
  }
}

async function main() {
  try {
    await queueForAnalysis();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await monitor();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
