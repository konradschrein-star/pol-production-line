#!/usr/bin/env tsx
/**
 * Quick script to update avatar_mp4_url for a job
 * Usage: tsx scripts/update-avatar-path.ts <job-id-prefix> <new-avatar-filename>
 */

import { Pool } from 'pg';
import * as path from 'path';

const jobIdPrefix = process.argv[2];
const newAvatarFilename = process.argv[3];

if (!jobIdPrefix || !newAvatarFilename) {
  console.error('Usage: tsx scripts/update-avatar-path.ts <job-id-prefix> <new-avatar-filename>');
  console.error('Example: tsx scripts/update-avatar-path.ts a591cc84 avatar_1774514203906_optimized.mp4');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAvatarPath() {
  try {
    // Find job by ID prefix
    const findResult = await pool.query(
      `SELECT id, status, avatar_mp4_url FROM news_jobs WHERE id::text LIKE $1`,
      [`${jobIdPrefix}%`]
    );

    if (findResult.rows.length === 0) {
      console.error(`❌ No job found with ID starting with: ${jobIdPrefix}`);
      process.exit(1);
    }

    if (findResult.rows.length > 1) {
      console.error(`❌ Multiple jobs found with ID starting with: ${jobIdPrefix}`);
      console.error('Please provide a more specific ID prefix.');
      findResult.rows.forEach(row => console.error(`  - ${row.id}`));
      process.exit(1);
    }

    const job = findResult.rows[0];
    console.log(`\n📋 Found job: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Current avatar: ${job.avatar_mp4_url || '(none)'}`);

    // Construct new avatar path
    const storageRoot = process.env.LOCAL_STORAGE_ROOT || 'C:\\Users\\konra\\ObsidianNewsDesk';
    const newAvatarPath = path.join(storageRoot, 'avatars', newAvatarFilename);

    console.log(`\n🔄 Updating avatar path to: ${newAvatarPath}`);

    // Update the job
    const updateResult = await pool.query(
      `UPDATE news_jobs
       SET avatar_mp4_url = $1,
           status = CASE
             WHEN status = 'failed' THEN 'review_assets'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, avatar_mp4_url`,
      [newAvatarPath, job.id]
    );

    const updated = updateResult.rows[0];
    console.log(`\n✅ Updated successfully!`);
    console.log(`   New status: ${updated.status}`);
    console.log(`   New avatar: ${updated.avatar_mp4_url}`);

    if (job.status === 'failed' && updated.status === 'review_assets') {
      console.log(`\n💡 Job status changed from 'failed' to 'review_assets'`);
      console.log(`   You can now retry rendering from the UI.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateAvatarPath();
