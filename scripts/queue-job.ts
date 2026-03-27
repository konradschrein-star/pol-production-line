/**
 * Queue existing job for processing
 */

import dotenv from 'dotenv';
import { join } from 'path';

// Load environment first
dotenv.config({ path: join(__dirname, '..', '.env') });

import { queueAnalyze } from '../src/lib/queue/queues';
import { db } from '../src/lib/db';

const jobId = process.argv[2];

if (!jobId) {
  console.error('Usage: npx tsx scripts/queue-job.ts <job-id>');
  process.exit(1);
}

async function queueJob() {
  console.log('📋 Queuing job for processing...');
  console.log('   Job ID:', jobId);

  try {
    // Get job data
    const result = await db.query('SELECT raw_script FROM news_jobs WHERE id = $1', [jobId]);

    if (result.rows.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    const rawScript = result.rows[0].raw_script;

    // Queue for analysis
    await queueAnalyze.add('analyze-script', { jobId, rawScript });

    console.log('✅ Job queued successfully!');
    console.log('\n📊 Monitor progress:');
    console.log(`   docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "SELECT status FROM news_jobs WHERE id = '${jobId}';"`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to queue job:', error);
    process.exit(1);
  }
}

queueJob();
