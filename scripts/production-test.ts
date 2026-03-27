/**
 * PRODUCTION TEST - Full Pipeline with Real AI & Whisk
 *
 * This test runs the COMPLETE production pipeline:
 * 1. AI analyzes script and generates scene prompts
 * 2. Whisk API generates images from those prompts
 * 3. Quality checks validate everything
 * 4. Video renders
 *
 * Usage: npm run test:prod
 */

import 'dotenv/config';
import { db } from '../src/lib/db';
import { saveFile } from '../src/lib/storage/local';
import { analyzeScript } from '../src/lib/ai';
import { generateImageWithRetry } from '../src/lib/whisk/generate-with-retry';
import { validateSceneQuality } from '../src/lib/video/quality-check';
import { validateSceneCount, formatSceneCountValidation } from '../src/lib/video/scene-count-validator';
import { calculateScenePacing } from '../src/lib/remotion/pacing';
import { getVideoDuration } from '../src/lib/remotion/video-utils';
import { renderNewsVideo } from '../src/lib/remotion/render';
import { prepareRenderAssets } from '../src/lib/remotion/asset-preparation';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';

// Test inputs from user
const TEST_AVATAR_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';
const TEST_SCRIPT = `Breaking tonight: The Senate passed sweeping climate legislation in a narrow 51-50 vote, marking the largest environmental investment in US history. The $369 billion package includes tax credits for electric vehicles, solar panel installations, and heat pump upgrades for American households. Republicans unanimously opposed the bill, calling it government overreach and warning of inflation risks. Senate Minority Leader criticized the spending levels, arguing the funds would be better spent on reducing the national debt. Climate activists celebrated outside the Capitol, with some calling it a generational victory after decades of failed attempts. Environmental groups estimate the legislation will reduce carbon emissions by 40 percent by 2030, putting the US back on track with Paris Agreement targets. However, economists remain divided on the bill's economic impact. Goldman Sachs projects the tax incentives will create 1.5 million green jobs over the next decade, while the Heritage Foundation warns of potential energy cost increases for middle-class families. The legislation now heads to the House, where Speaker Pelosi has pledged a vote within the week. With midterm elections approaching, both parties see this as a defining moment that could reshape the political landscape. Industry reactions have been mixed. Tesla and Rivian stock surged 8 percent on the news, while traditional oil companies saw modest declines. Energy analysts predict a major shift in consumer behavior as electric vehicle tax credits of up to $7,500 make EVs competitive with gasoline cars for the first time.`;

async function runProductionTest() {
  console.log('🚀 PRODUCTION TEST - Full AI + Whisk Pipeline');
  console.log('==============================================\n');

  let jobId: string | undefined;

  try {
    // 1. Create job in database
    console.log('📝 Step 1: Creating job...');

    const jobResult = await db.query(
      `INSERT INTO news_jobs (raw_script, status)
       VALUES ($1, $2)
       RETURNING id`,
      [TEST_SCRIPT, 'pending']
    );

    jobId = jobResult.rows[0].id;
    console.log(`✅ Job ID: ${jobId}\n`);

    // Initialize metrics
    await db.query(
      `INSERT INTO job_metrics (job_id)
       VALUES ($1)`,
      [jobId]
    );

    // 2. Copy avatar to storage
    console.log('📁 Step 2: Copying avatar...');

    const avatarFilename = `${jobId}-avatar.mp4`;
    let avatarStoragePath = await saveFile(TEST_AVATAR_PATH, 'avatars', avatarFilename);

    await db.query(
      'UPDATE news_jobs SET avatar_mp4_url = $1 WHERE id = $2',
      [avatarStoragePath, jobId]
    );

    console.log(`✅ Avatar: ${avatarStoragePath}\n`);

    // 2.5 OPTIMIZE AVATAR (if > 10MB)
    console.log('🔧 Step 2.5: Optimizing avatar for web playback...');

    const { execSync } = require('child_process');
    const fs = require('fs');
    const stats = fs.statSync(avatarStoragePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    console.log(`   Original size: ${fileSizeMB.toFixed(1)}MB`);

    if (fileSizeMB > 10) {
      console.log('   ⚠️  File > 10MB, optimizing...');

      const optimizedFilename = `${jobId}-avatar-optimized.mp4`;
      const optimizedPath = join(process.cwd(), 'public', 'avatars', optimizedFilename);

      // Run FFmpeg optimization
      const ffmpegCmd = `ffmpeg -y -i "${avatarStoragePath}" -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -crf 28 -maxrate 1M -bufsize 2M -c:a aac -b:a 96k -ar 48000 -movflags +faststart "${optimizedPath}"`;

      execSync(ffmpegCmd, { stdio: 'inherit' });

      const optimizedStats = fs.statSync(optimizedPath);
      const optimizedSizeMB = optimizedStats.size / (1024 * 1024);

      console.log(`   ✅ Optimized: ${optimizedSizeMB.toFixed(1)}MB`);
      console.log(`   ✅ Saved to: ${optimizedPath}`);

      // Update database to use optimized version
      await db.query(
        'UPDATE news_jobs SET avatar_mp4_url = $1 WHERE id = $2',
        [optimizedPath, jobId]
      );

      avatarStoragePath = optimizedPath;
    } else {
      console.log('   ✅ File size OK, no optimization needed');
    }

    console.log('');

    // 3. AI ANALYSIS - Generate scene prompts
    console.log('🧠 Step 3: AI analyzing script...');
    console.log('   Generating image prompts automatically\n');

    const analysisStart = Date.now();
    const analysisResult = await analyzeScript(TEST_SCRIPT);
    const analysisTime = Date.now() - analysisStart;

    console.log(`✅ AI analysis complete (${(analysisTime / 1000).toFixed(1)}s)`);
    console.log(`   Scenes generated: ${analysisResult.scenes.length}`);
    console.log(`   Using original script for avatar\n`);

    // VALIDATE SCENE COUNT before proceeding
    const avatarDurationSeconds = await getVideoDuration(avatarStoragePath);
    const sceneCountValidation = validateSceneCount(avatarDurationSeconds, analysisResult.scenes.length);

    console.log(formatSceneCountValidation(sceneCountValidation));

    if (!sceneCountValidation.valid) {
      console.warn(`\n⚠️  [WARNING] Scene count not optimal, but proceeding anyway`);
      console.warn(`   ${sceneCountValidation.adjustmentSuggestion}\n`);
    }

    // Log the prompts for review
    console.log('📋 Generated scene prompts:');
    analysisResult.scenes.forEach((scene, i) => {
      console.log(`   ${i + 1}. ${scene.ticker_headline}`);
      console.log(`      Prompt: ${scene.image_prompt.substring(0, 80)}...`);
    });
    console.log('');

    // Save analysis to database (avatar_script = original script)
    await db.query(
      'UPDATE news_jobs SET avatar_script = $1, status = $2 WHERE id = $3',
      [TEST_SCRIPT, 'analyzing', jobId]
    );

    // 4. Create scenes in database
    console.log('💾 Step 4: Saving scenes to database...');

    for (let i = 0; i < analysisResult.scenes.length; i++) {
      const scene = analysisResult.scenes[i];
      await db.query(
        `INSERT INTO news_scenes (id, job_id, scene_order, ticker_headline, image_prompt)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), jobId, i, scene.ticker_headline, scene.image_prompt]
      );
    }

    console.log(`✅ ${analysisResult.scenes.length} scenes saved\n`);

    // 5. WHISK API - Generate images
    console.log('🎨 Step 5: Generating images via Whisk API...');
    console.log('   With intelligent retry system (auto-adjusts prompts on failure)');
    console.log('   This will take 2-5 minutes\n');

    const imageGenStart = Date.now();

    // Fetch scenes from database
    const scenesResult = await db.query(
      `SELECT id, image_prompt, scene_order, ticker_headline
       FROM news_scenes
       WHERE job_id = $1
       ORDER BY scene_order`,
      [jobId]
    );

    const scenes = scenesResult.rows;

    // Generate images with AUTOMATIC RETRY and PROMPT ADJUSTMENT
    let completedCount = 0;

    for (const scene of scenes) {
      console.log(`\n   [${completedCount + 1}/${scenes.length}] Generating: ${scene.ticker_headline}`);
      console.log(`   Original prompt: ${scene.image_prompt.substring(0, 100)}...`);

      // Use retry system - will automatically adjust prompt and retry on failure
      const retryResult = await generateImageWithRetry(scene.image_prompt, {
        maxAttempts: 6,
        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        onAttempt: async (attempt) => {
          // Record each attempt in database
          await db.query(
            `INSERT INTO generation_history
             (id, job_id, scene_id, attempt_number, generation_params, success, error_message, generation_time_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              jobId,
              scene.id,
              attempt.attemptNumber,
              JSON.stringify({ prompt: attempt.prompt, strategy: attempt.strategy }),
              attempt.success,
              attempt.error || null,
              attempt.generationTimeMs || 0,
            ]
          );
        },
      });

      if (retryResult.success && (retryResult.finalImageUrl || retryResult.finalImageBase64)) {
        // Success! Download and save image
        const imageFilename = `${scene.id}.jpg`;
        const imagePath = join(
          process.env.LOCAL_STORAGE_ROOT || 'C:\\Users\\konra\\ObsidianNewsDesk',
          'images',
          imageFilename
        );

        try {
          let buffer: Buffer;

          if (retryResult.finalImageUrl) {
            // Download from URL
            const response = await fetch(retryResult.finalImageUrl);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          } else if (retryResult.finalImageBase64) {
            // Decode base64
            buffer = Buffer.from(retryResult.finalImageBase64, 'base64');
          } else {
            throw new Error('No image URL or base64 data');
          }

          await require('fs').promises.writeFile(imagePath, buffer);

          // Update database
          await db.query('UPDATE news_scenes SET image_url = $1 WHERE id = $2', [imagePath, scene.id]);

          completedCount++;
          console.log(`   ✅ SUCCESS after ${retryResult.totalAttempts} attempt(s)`);
          console.log(`   Saved to: ${imagePath}`);
        } catch (saveError) {
          console.error(`   ❌ Failed to save image: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
        }
      } else {
        // All retries failed
        console.error(`   ❌ FAILED after ${retryResult.totalAttempts} attempts`);
        console.error(`   All retry strategies exhausted - skipping this scene`);
      }
    }

    const totalImageGenTime = Date.now() - imageGenStart;

    console.log(`\n✅ Image generation complete!`);
    console.log(`   Total time: ${(totalImageGenTime / 1000 / 60).toFixed(1)} minutes`);
    console.log(`   Success: ${completedCount}/${scenes.length}\n`);

    if (completedCount === 0) {
      throw new Error('No images were generated successfully!');
    }

    // Update job status
    await db.query(
      'UPDATE news_jobs SET status = $1 WHERE id = $2',
      ['review_assets', jobId]
    );

    // 6. Quality checks
    console.log('🔍 Step 6: Running quality checks...\n');

    // Fetch updated scenes with images
    const updatedScenesResult = await db.query(
      `SELECT id, image_url, ticker_headline, scene_order
       FROM news_scenes
       WHERE job_id = $1
       ORDER BY scene_order`,
      [jobId]
    );

    const scenesWithImages = updatedScenesResult.rows;

    console.log(`📏 Avatar duration: ${avatarDurationSeconds.toFixed(2)}s\n`);

    // Calculate pacing
    const pacing = calculateScenePacing(avatarDurationSeconds, scenesWithImages.length, 30);

    // Run quality checks
    const qualityCheck = validateSceneQuality(
      scenesWithImages,
      pacing.sceneTiming,
      pacing.totalDurationInFrames,
      30
    );

    if (!qualityCheck.passed) {
      console.error('\n❌ QUALITY CHECK FAILED - Render blocked:');
      qualityCheck.errors.forEach(err => console.error(`   ${err}`));
      throw new Error('Quality check failed - issues must be fixed before render');
    }

    console.log('\n✅ Quality checks PASSED!\n');

    // 7. Prepare assets
    console.log('📦 Step 7: Preparing assets for render...\n');

    const assetValidation = await prepareRenderAssets(jobId!, scenesWithImages, avatarStoragePath);

    if (!assetValidation.valid) {
      console.error('❌ Asset preparation failed:');
      assetValidation.details.forEach(detail => console.error(`   ${detail}`));
      throw new Error('Asset validation failed');
    }

    console.log('✅ Assets prepared and validated\n');

    // 8. RENDER
    console.log('🎥 Step 8: Rendering video...');
    console.log('   This will take 2-3 minutes\n');

    const renderStart = Date.now();

    const renderResult = await renderNewsVideo({
      jobId: jobId!,
      avatarMp4Url: avatarStoragePath,
      scenes: scenesWithImages,
    });

    const renderTime = Date.now() - renderStart;

    // Move to permanent storage
    const finalFilename = `${jobId}.mp4`;
    const finalVideoPath = await saveFile(renderResult.outputPath, 'videos', finalFilename);

    // Update database
    await db.query(
      `UPDATE news_jobs
       SET final_video_url = $1, status = $2
       WHERE id = $3`,
      [finalVideoPath, 'completed', jobId]
    );

    await db.query(
      `UPDATE job_metrics
       SET render_time_ms = $1,
           final_video_size_bytes = $2,
           final_video_duration_seconds = $3,
           total_image_gen_time_ms = $4
       WHERE job_id = $5`,
      [
        renderTime,
        renderResult.sizeInBytes,
        renderResult.durationInSeconds,
        totalImageGenTime,
        jobId,
      ]
    );

    console.log('✅ Render complete!\n');

    // 9. SUCCESS SUMMARY
    console.log('🎉 PRODUCTION TEST COMPLETE!');
    console.log('============================\n');
    console.log(`Job ID: ${jobId}`);
    console.log(`Video: ${finalVideoPath}`);
    console.log(`\n📊 Performance:`);
    console.log(`   AI Analysis: ${(analysisTime / 1000).toFixed(1)}s`);
    console.log(`   Image Generation: ${(totalImageGenTime / 1000 / 60).toFixed(1)} min`);
    console.log(`   Render: ${(renderTime / 1000).toFixed(1)}s`);
    console.log(`   Total: ${((Date.now() - imageGenStart) / 1000 / 60).toFixed(1)} min`);
    console.log(`\n📹 Video:`);
    console.log(`   Duration: ${renderResult.durationInSeconds.toFixed(1)}s`);
    console.log(`   Size: ${(renderResult.sizeInBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Scenes: ${scenesWithImages.length}`);
    console.log(`\n✅ All quality checks passed - No black screens!`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ PRODUCTION TEST FAILED:');
    console.error(error instanceof Error ? error.message : String(error));

    // Mark job as failed if we have a jobId
    if (jobId) {
      await db.query(
        'UPDATE news_jobs SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error instanceof Error ? error.message : String(error), jobId]
      );
    }

    process.exit(1);
  }
}

runProductionTest();
