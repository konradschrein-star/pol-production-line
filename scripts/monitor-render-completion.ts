import 'dotenv/config';
import { db } from '../src/lib/db';
import { existsSync } from 'fs';
import { join } from 'path';

const jobId = 'e2d3cc06-1cfe-49cd-961e-5c0f4f572036';
const checkInterval = 15000; // Check every 15 seconds

async function checkStatus() {
  try {
    const result = await db.query(
      'SELECT status, final_video_url, error_message FROM news_jobs WHERE id = $1',
      [jobId]
    );
    const job = result.rows[0];

    console.log(`[${new Date().toLocaleTimeString()}] Status: ${job.status}`);

    if (job.status === 'completed') {
      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║   ✅ RENDER COMPLETE! TEST SUCCESSFUL! 🎉              ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      const videoPath = join(process.cwd(), 'tmp', `${jobId}.mp4`);
      const videoExists = existsSync(videoPath);

      console.log(`📹 Final Video: ${videoPath}`);
      console.log(`   File exists: ${videoExists ? '✅ YES' : '❌ NO'}`);
      console.log(`🆔 Job ID: ${jobId}\n`);

      console.log(`🎯 VERIFICATION CHECKLIST:`);
      console.log(`   [ ] Ticker overlay at BOTTOM`);
      console.log(`   [ ] Ticker stays FIXED`);
      console.log(`   [ ] Ticker text scrolls SMOOTHLY`);
      console.log(`   [ ] Images start at 100% scale`);
      console.log(`   [ ] Zoom rate is CONSTANT across scenes`);
      console.log(`   [ ] NO BLACK BARS anywhere`);
      console.log(`   [ ] Full video coverage (23 scenes across 99s)\n`);

      process.exit(0);
    }

    if (job.status === 'failed') {
      console.log(`\n❌ RENDER FAILED:`);
      console.log(`   ${job.error_message}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

console.log('🔍 Monitoring render completion for job:', jobId);
console.log(`⏱️  Checking every ${checkInterval / 1000} seconds...\n`);

// Check immediately
checkStatus();

// Then check at intervals
const interval = setInterval(checkStatus, checkInterval);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(interval);
  process.exit(0);
});
