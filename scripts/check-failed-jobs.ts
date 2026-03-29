#!/usr/bin/env tsx
/**
 * Check failed jobs and their error messages
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkErrors() {
  const client = await pool.connect();
  try {
    // Get failed jobs with metadata
    const jobsResult = await client.query(`
      SELECT
        id,
        status,
        created_at,
        job_metadata
      FROM news_jobs
      WHERE status = 'failed'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 Found ${jobsResult.rows.length} failed jobs:\n`);
    console.log('='.repeat(80));

    for (const job of jobsResult.rows) {
      console.log(`\nJob ID: ${job.id.substring(0, 8)}...`);
      console.log(`Status: ${job.status}`);
      console.log(`Created: ${job.created_at.toISOString()}`);

      if (job.job_metadata) {
        console.log(`Metadata:`);
        console.log(JSON.stringify(job.job_metadata, null, 2));
      }

      // Get scenes for this job
      const scenesResult = await client.query(`
        SELECT
          id,
          scene_order,
          image_url,
          created_at
        FROM news_scenes
        WHERE job_id = $1
        ORDER BY scene_order
      `, [job.id]);

      console.log(`\nScenes: ${scenesResult.rows.length} total`);
      const withImages = scenesResult.rows.filter(s => s.image_url).length;
      const withoutImages = scenesResult.rows.length - withImages;
      console.log(`  ✅ With images: ${withImages}`);
      console.log(`  ❌ Without images: ${withoutImages}`);

      console.log('\n' + '-'.repeat(80));
    }

    // Check Redis queue for errors
    console.log('\n\n🔍 Checking for common error patterns...\n');

    const errorPatterns = jobsResult.rows
      .filter(j => j.job_metadata && j.job_metadata.error)
      .map(j => j.job_metadata.error);

    if (errorPatterns.length > 0) {
      console.log('Found errors in job metadata:');
      errorPatterns.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err}`);
      });
    } else {
      console.log('No error messages found in job_metadata.');
      console.log('Errors may be in worker logs or Redis queue.');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkErrors().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
