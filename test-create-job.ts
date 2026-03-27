import { db } from './src/lib/db';
import { queues } from './src/lib/queue';

const testScript = `Breaking tonight: The Senate passed sweeping climate legislation in a narrow 51-50 vote. The $369 billion package includes tax credits for electric vehicles and solar panels. Republicans opposed the bill, calling it government overreach.`;

async function createTestJob() {
  try {
    // Create job in database
    const result = await db.query(
      `INSERT INTO news_jobs (raw_script, status, job_metadata)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, status, created_at`,
      [testScript, 'pending', JSON.stringify({ ai_provider: 'google', test: true })]
    );

    const job = result.rows[0];
    console.log('✅ Job created:', job.id);
    console.log('Status:', job.status);

    // Queue for analysis
    await queues.analyze.add('analyze-script', {
      jobId: job.id,
      rawScript: testScript,
      provider: 'google',
    });

    console.log('✅ Job queued for analysis');
    console.log('\n🔗 Monitor at: http://localhost:8347/');
    console.log('Job ID:', job.id);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestJob();
