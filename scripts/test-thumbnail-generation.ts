/**
 * Test script for thumbnail generation feature
 *
 * Usage:
 *   tsx scripts/test-thumbnail-generation.ts [jobId]
 *
 * If no jobId is provided, finds the most recent completed job
 */

import { db } from '../src/lib/db';
import { generateThumbnailWithRetry, validateVideoForThumbnail } from '../src/lib/integrations/thumbnail-api';
import { existsSync } from 'fs';

async function testThumbnailGeneration() {
  console.log('\n🧪 THUMBNAIL GENERATION TEST\n');

  try {
    // Get jobId from args or find most recent completed job
    let jobId = process.argv[2];

    if (!jobId) {
      console.log('📋 No job ID provided. Finding most recent completed job...\n');

      const result = await db.query(
        `SELECT id, final_video_url, thumbnail_url
         FROM news_jobs
         WHERE status = 'completed' AND final_video_url IS NOT NULL
         ORDER BY created_at DESC
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        console.error('❌ No completed jobs found. Please render a video first.');
        process.exit(1);
      }

      jobId = result.rows[0].id;
      console.log(`✅ Found job: ${jobId}\n`);
    }

    // Fetch job details
    const jobResult = await db.query(
      `SELECT id, status, final_video_url, thumbnail_url, thumbnail_generated_at
       FROM news_jobs
       WHERE id = $1`,
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      console.error(`❌ Job ${jobId} not found`);
      process.exit(1);
    }

    const job = jobResult.rows[0];

    console.log('📦 Job Details:');
    console.log(`   ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Video: ${job.final_video_url || 'Not set'}`);
    console.log(`   Current Thumbnail: ${job.thumbnail_url || 'None'}`);
    console.log(`   Generated At: ${job.thumbnail_generated_at || 'Never'}\n`);

    // Validate status
    if (job.status !== 'completed') {
      console.error(`❌ Job is not completed (status: ${job.status})`);
      process.exit(1);
    }

    // Validate video exists
    if (!job.final_video_url) {
      console.error('❌ Job has no video file');
      process.exit(1);
    }

    if (!existsSync(job.final_video_url)) {
      console.error(`❌ Video file not found: ${job.final_video_url}`);
      process.exit(1);
    }

    console.log('✅ Job is valid for thumbnail generation\n');

    // Test 1: Validate video for thumbnail
    console.log('🧪 TEST 1: Validate video file\n');

    const isValid = await validateVideoForThumbnail(job.final_video_url, 5);

    if (isValid) {
      console.log('✅ Video is valid for thumbnail generation (duration >= 5s)\n');
    } else {
      console.warn('⚠️ Video may be too short or invalid\n');
    }

    // Test 2: Generate thumbnail at default timestamp (5s)
    console.log('🧪 TEST 2: Generate thumbnail at 5s\n');

    const result1 = await generateThumbnailWithRetry(job.final_video_url, jobId, {
      timestamp: 5,
      width: 640,
      quality: 2,
    });

    console.log('✅ Thumbnail generated:');
    console.log(`   Path: ${result1.thumbnailPath}`);
    console.log(`   Size: ${(result1.sizeInBytes / 1024).toFixed(2)} KB`);
    console.log(`   Timestamp: ${result1.timestamp}s\n`);

    // Test 3: Generate thumbnail at different timestamp (3s)
    console.log('🧪 TEST 3: Generate thumbnail at 3s\n');

    const result2 = await generateThumbnailWithRetry(job.final_video_url, jobId, {
      timestamp: 3,
      width: 640,
      quality: 2,
    });

    console.log('✅ Thumbnail generated:');
    console.log(`   Path: ${result2.thumbnailPath}`);
    console.log(`   Size: ${(result2.sizeInBytes / 1024).toFixed(2)} KB`);
    console.log(`   Timestamp: ${result2.timestamp}s\n`);

    // Test 4: Update database
    console.log('🧪 TEST 4: Update database with thumbnail\n');

    await db.query(
      `UPDATE news_jobs
       SET thumbnail_url = $1, thumbnail_generated_at = NOW()
       WHERE id = $2`,
      [result1.thumbnailPath, jobId]
    );

    const updatedJob = await db.query(
      `SELECT thumbnail_url, thumbnail_generated_at
       FROM news_jobs
       WHERE id = $1`,
      [jobId]
    );

    console.log('✅ Database updated:');
    console.log(`   Thumbnail URL: ${updatedJob.rows[0].thumbnail_url}`);
    console.log(`   Generated At: ${updatedJob.rows[0].thumbnail_generated_at}\n`);

    // Test 5: Verify file exists
    console.log('🧪 TEST 5: Verify thumbnail file exists\n');

    if (existsSync(result1.thumbnailPath)) {
      console.log(`✅ Thumbnail file exists: ${result1.thumbnailPath}\n`);
    } else {
      console.error(`❌ Thumbnail file not found: ${result1.thumbnailPath}\n`);
    }

    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📋 Summary:');
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Video: ${job.final_video_url}`);
    console.log(`   Thumbnail: ${result1.thumbnailPath}`);
    console.log(`   Size: ${(result1.sizeInBytes / 1024).toFixed(2)} KB\n`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run tests
testThumbnailGeneration();
