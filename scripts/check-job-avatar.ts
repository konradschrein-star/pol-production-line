import 'dotenv/config';
import { db } from '../src/lib/db';
import { existsSync } from 'fs';
import { join } from 'path';

async function checkAvatar(jobId: string) {
  const result = await db.query(
    'SELECT id, avatar_mp4_url FROM news_jobs WHERE id = $1',
    [jobId]
  );

  if (result.rows.length === 0) {
    console.log('❌ Job not found');
    process.exit(1);
  }

  const job = result.rows[0];
  console.log(`Job ID: ${job.id}`);
  console.log(`Avatar URL: ${job.avatar_mp4_url || 'NOT SET'}`);

  if (job.avatar_mp4_url) {
    const avatarPath = job.avatar_mp4_url.startsWith('avatars/')
      ? join(process.cwd(), 'public', job.avatar_mp4_url)
      : job.avatar_mp4_url;

    console.log(`Avatar path: ${avatarPath}`);
    console.log(`File exists: ${existsSync(avatarPath) ? '✅ YES' : '❌ NO'}`);
  }

  process.exit(0);
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx scripts/check-job-avatar.ts <jobId>');
  process.exit(1);
}

checkAvatar(jobId);
