/**
 * Create Test Job - Standalone Script
 * Creates a new test job with all the latest fixes applied
 */

import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

import { db } from '../src/lib/db';
import { queueAnalyze } from '../src/lib/queue/queues';
import { randomUUID } from 'crypto';

const TEST_SCRIPT = `Breaking tonight: The Senate passed sweeping climate legislation in a narrow 51-50 vote, marking the largest environmental investment in US history. The $369 billion package includes tax credits for electric vehicles, solar panel installations, and heat pump upgrades for American households. Republicans unanimously opposed the bill, calling it government overreach and warning of inflation risks. Senate Minority Leader criticized the spending levels, arguing the funds would be better spent on reducing the national debt. Climate activists celebrated outside the Capitol, with some calling it a generational victory after decades of failed attempts. Environmental groups estimate the legislation will reduce carbon emissions by 40 percent by 2030, putting the US back on track with Paris Agreement targets. However, economists remain divided on the bill's economic impact. Goldman Sachs projects the tax incentives will create 1.5 million green jobs over the next decade, while the Heritage Foundation warns of potential energy cost increases for middle-class families. The legislation now heads to the House, where Speaker Pelosi has pledged a vote within the week. With midterm elections approaching, both parties see this as a defining moment that could reshape the political landscape. Industry reactions have been mixed. Tesla and Rivian stock surged 8 percent on the news, while traditional oil companies saw modest declines. Energy analysts predict a major shift in consumer behavior as electric vehicle tax credits of up to $7,500 make EVs competitive with gasoline cars for the first time.`;

async function createTestJob() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  CREATE NEW TEST JOB - WITH ALL FIXES                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Generate new job ID
    const jobId = randomUUID();

    console.log('📝 Creating new test job...');
    console.log('   Job ID:', jobId);
    console.log('   Script length:', TEST_SCRIPT.length, 'characters\n');

    // 1. Insert job into database
    await db.query(
      `INSERT INTO news_jobs (id, raw_script, status)
       VALUES ($1, $2, $3)`,
      [jobId, TEST_SCRIPT, 'pending']
    );

    console.log('✅ Job created in database');

    // 2. Queue for analysis
    await queueAnalyze.add('analyze-script', { jobId, rawScript: TEST_SCRIPT });

    console.log('✅ Job queued for analysis');
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  JOB STARTED - MONITOR PROGRESS                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('📊 Job ID:', jobId);
    console.log('🌐 View in UI: http://localhost:8347');
    console.log('\n📝 Expected workflow:');
    console.log('   1. ⏳ analyzing (30-60s) - AI analyzes script → generates 15-25 scenes');
    console.log('   2. ⏳ generating_images (15-20 min) - Whisk API generates scene images');
    console.log('   3. ⏸️  review_assets - MANUAL: Upload avatar via UI');
    console.log('   4. ⏳ rendering (2-3 min) - Remotion renders final video');
    console.log('   5. ✅ completed - Video ready in tmp/ folder\n');

    console.log('💡 New features in this test:');
    console.log('   ✅ 15-25 scenes (improved pacing)');
    console.log('   ✅ Whisper word timestamps (if avatar <25MB)');
    console.log('   ✅ Fixed avatar cropping (objectFit: contain)');
    console.log('   ✅ Professional CNN-style ticker');
    console.log('   ✅ Automatic content policy error handling\n');

    console.log('⏱️  Estimated total time: 25-40 minutes');
    console.log('📂 Final video location: obsidian-news-desk/tmp/' + jobId + '.mp4\n');

    return jobId;

  } catch (error) {
    console.error('\n❌ Failed to create test job:', error);
    process.exit(1);
  }
}

// Run script
createTestJob()
  .then((jobId) => {
    console.log('✅ Test job created successfully!\n');
    console.log('Monitor progress with:');
    console.log(`   docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "SELECT id, status FROM news_jobs WHERE id = '${jobId}';"`);
    console.log('\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
