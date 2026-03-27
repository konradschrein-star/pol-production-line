import 'dotenv/config';
import { db } from '../src/lib/db';

const jobId = process.argv[2] || '51065529-2613-43e9-b36a-99c05247013d';

async function run() {
  const result = await db.query(
    'SELECT status, error_message, avatar_script FROM news_jobs WHERE id = $1',
    [jobId]
  );

  const job = result.rows[0];
  console.log('Job Status:');
  console.log('  Status:', job.status);
  console.log('  Error:', job.error_message || 'none');
  console.log('  Avatar Script Length:', job.avatar_script?.length || 0);

  if (job.avatar_script) {
    console.log('\nAvatar Script Preview:');
    console.log(job.avatar_script.substring(0, 200) + '...');
  }

  // Check scenes
  const scenesResult = await db.query(
    'SELECT COUNT(*) as count FROM news_scenes WHERE job_id = $1',
    [jobId]
  );
  console.log('\nScenes:', scenesResult.rows[0].count);

  process.exit(0);
}

run();
