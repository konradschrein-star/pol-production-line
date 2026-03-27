import 'dotenv/config';
import { db } from '../src/lib/db';

const jobId = 'e2d3cc06-1cfe-49cd-961e-5c0f4f572036';

async function run() {
  // Fix avatar path - remove /public/ prefix
  await db.query(
    "UPDATE news_jobs SET avatar_mp4_url = REPLACE(avatar_mp4_url, '/public/', '') WHERE id = $1",
    [jobId]
  );

  console.log('✅ Avatar path fixed');

  const result = await db.query('SELECT avatar_mp4_url FROM news_jobs WHERE id = $1', [jobId]);
  console.log('New avatar path:', result.rows[0].avatar_mp4_url);

  process.exit(0);
}

run();
