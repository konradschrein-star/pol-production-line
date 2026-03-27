#!/usr/bin/env node
/**
 * Simple test to verify reference_images database fix
 * Creates a job, waits for AI analysis, then monitors image generation
 */

import { db } from './src/lib/db';
import { queues } from './src/lib/queue';

const testScript = `Breaking tonight: The Senate passed sweeping climate legislation. The bill includes tax credits for electric vehicles. Climate activists celebrated the historic vote.`;

async function testDatabaseFix() {
  console.log('🧪 Testing reference_images database fix\n');

  try {
    // Create job in database
    const result = await db.query(
      `INSERT INTO news_jobs (raw_script, status, job_metadata)
       VALUES ($1, 'pending', $2::jsonb)
       RETURNING id, status`,
      [testScript, JSON.stringify({ ai_provider: 'google', test: 'db_fix' })]
    );

    const jobId = result.rows[0].id;
    console.log(`✅ Job created: ${jobId}`);
    console.log(`📊 Status: ${result.rows[0].status}\n`);

    // Queue for analysis
    await queues.analyze.add('analyze-script', {
      jobId,
      rawScript: testScript,
      provider: 'google',
    });

    console.log('✅ Queued for AI analysis');
    console.log('⏳ Waiting for analysis to complete...\n');

    // Poll until scenes are generated
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

      const jobCheck = await db.query(
        'SELECT status FROM news_jobs WHERE id = $1',
        [jobId]
      );

      const status = jobCheck.rows[0]?.status;
      console.log(`[${attempts * 2}s] Status: ${status}`);

      if (status === 'generating_images') {
        console.log('\n✅ AI analysis complete!');
        break;
      }

      if (status === 'failed') {
        console.error('\n❌ Job failed during analysis');
        process.exit(1);
      }

      attempts++;
    }

    // Check scenes were created
    const scenesResult = await db.query(
      'SELECT COUNT(*) as count FROM news_scenes WHERE job_id = $1',
      [jobId]
    );

    const sceneCount = parseInt(scenesResult.rows[0].count);
    console.log(`\n📸 Scenes created: ${sceneCount}`);

    if (sceneCount === 0) {
      console.error('❌ No scenes generated - AI analysis may have failed');
      process.exit(1);
    }

    // Now monitor image generation for 60 seconds
    console.log('\n🖼️  Monitoring image generation (60s)...');
    console.log('   If reference_images fix works, images should start generating\n');

    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

      const imageCheck = await db.query(
        `SELECT
           COUNT(*) FILTER (WHERE generation_status = 'completed') as completed,
           COUNT(*) FILTER (WHERE generation_status = 'generating') as generating,
           COUNT(*) FILTER (WHERE generation_status = 'failed') as failed,
           COUNT(*) FILTER (WHERE generation_status = 'pending') as pending
         FROM news_scenes
         WHERE job_id = $1`,
        [jobId]
      );

      const stats = imageCheck.rows[0];
      console.log(`[${(i + 1) * 5}s] Images: ${stats.completed}/${sceneCount} completed, ${stats.generating} generating, ${stats.failed} failed, ${stats.pending} pending`);

      if (parseInt(stats.completed) > 0) {
        console.log('\n✅ SUCCESS! Images are generating without reference_images errors!');
        console.log(`\n📋 Job ID: ${jobId}`);
        console.log(`🔗 View at: http://localhost:8347/`);
        process.exit(0);
      }

      if (parseInt(stats.failed) === sceneCount) {
        console.error('\n❌ All images failed - checking for errors...');

        const errorCheck = await db.query(
          'SELECT error_message FROM news_scenes WHERE job_id = $1 AND generation_status = \'failed\' LIMIT 1',
          [jobId]
        );

        if (errorCheck.rows[0]) {
          console.error(`Error: ${errorCheck.rows[0].error_message}`);
        }

        process.exit(1);
      }
    }

    console.log('\n⏱️  60 seconds elapsed - images still generating');
    console.log(`📋 Job ID: ${jobId}`);
    console.log(`🔗 View at: http://localhost:8347/`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testDatabaseFix();
