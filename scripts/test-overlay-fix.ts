/**
 * Quick Test: Verify Ticker Overlay and Rendering Fixes
 * Tests the improved ticker overlay positioning, animation, and aspect ratio handling
 */

import 'dotenv/config';
import { renderMedia } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import path from 'path';

const AVATAR_VIDEO_PATH = 'C:\\Users\\konra\\Downloads\\Avatar_Video.mp4';

async function runTest() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   QUICK TEST: Overlay & Rendering Fixes                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Check prerequisites
    console.log('📋 Checking prerequisites...');

    if (!existsSync(AVATAR_VIDEO_PATH)) {
      console.error(`❌ Avatar video not found at: ${AVATAR_VIDEO_PATH}`);
      console.log('   Please ensure Avatar_Video.mp4 is in your Downloads folder');
      process.exit(1);
    }

    console.log('✅ Avatar video found');

    // Create test render props
    console.log('\n🎬 Preparing test render...');

    const testScenes = [
      {
        id: 'test-1',
        image_url: 'https://storage.googleapis.com/imagen-research/placeholder.jpg',
        ticker_headline: 'BREAKING: Senate Passes Historic Climate Bill',
        scene_order: 1,
      },
      {
        id: 'test-2',
        image_url: 'https://storage.googleapis.com/imagen-research/placeholder.jpg',
        ticker_headline: 'Tensions Rise in South China Sea',
        scene_order: 2,
      },
      {
        id: 'test-3',
        image_url: 'https://storage.googleapis.com/imagen-research/placeholder.jpg',
        ticker_headline: 'European Markets Rally on Strong Data',
        scene_order: 3,
      },
      {
        id: 'test-4',
        image_url: 'https://storage.googleapis.com/imagen-research/placeholder.jpg',
        ticker_headline: 'MIT Achieves Quantum Computing Breakthrough',
        scene_order: 4,
      },
    ];

    const renderProps = {
      avatarMp4Url: path.basename(AVATAR_VIDEO_PATH),
      avatarDurationSeconds: 30, // Assume 30 second video
      avatarAspectRatio: 0.5625, // 9:16 vertical
      avatarWidth: 720,
      avatarHeight: 1280,
      scenes: testScenes,
      wordTimestamps: [], // Empty array for time-based pacing fallback
    };

    console.log('✅ Test props prepared');
    console.log(`   Scenes: ${testScenes.length}`);
    console.log(`   Avatar: ${renderProps.avatarAspectRatio.toFixed(4)} (${renderProps.avatarWidth}x${renderProps.avatarHeight})`);

    // Copy avatar to public folder for testing
    const publicDir = join(process.cwd(), 'public');
    const publicAvatarPath = join(publicDir, path.basename(AVATAR_VIDEO_PATH));

    if (!existsSync(publicAvatarPath)) {
      console.log(`\n📦 Copying avatar to public folder...`);
      const fs = require('fs');
      fs.copyFileSync(AVATAR_VIDEO_PATH, publicAvatarPath);
      console.log('✅ Avatar copied to public folder');
    }

    // Bundle Remotion project
    console.log('\n📦 Bundling Remotion project...');
    const bundleStartTime = Date.now();

    const bundleLocation = await bundle({
      entryPoint: join(process.cwd(), 'src/lib/remotion/index.ts'),
      webpackOverride: (config) => config,
    });

    const bundleTime = Date.now() - bundleStartTime;
    console.log(`✅ Bundle complete (${(bundleTime / 1000).toFixed(1)}s)`);

    // Render video
    console.log('\n🎬 Rendering test video...');
    console.log('   This will test:');
    console.log('   ✓ Ticker overlay at bottom (not top)');
    console.log('   ✓ Ticker stays fixed (no vertical movement)');
    console.log('   ✓ Ticker text scrolls smoothly');
    console.log('   ✓ No black bars (proper aspect ratio)');
    console.log('   ✓ Clean professional styling');

    const renderStartTime = Date.now();
    const outputPath = join(process.cwd(), 'test-overlay-output.mp4');

    await renderMedia({
      composition: {
        id: 'NewsVideo',
        width: 1920,
        height: 1080,
        fps: 30,
        durationInFrames: 30 * 30, // 30 seconds at 30fps
      },
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: renderProps,
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const progressPercent = (progress * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${progressPercent}% (${renderedFrames} frames rendered, ${encodedFrames} encoded)`);
      },
    });

    const renderTime = Date.now() - renderStartTime;
    console.log(`\n\n✅ Render complete! (${(renderTime / 1000).toFixed(1)}s)`);
    console.log(`\n📹 Output video: ${outputPath}`);
    console.log('\n🎯 VERIFICATION CHECKLIST:');
    console.log('   [ ] Ticker overlay is at the BOTTOM of the video');
    console.log('   [ ] Ticker does NOT move vertically');
    console.log('   [ ] Ticker text scrolls smoothly from right to left');
    console.log('   [ ] Text appears continuously (no gaps)');
    console.log('   [ ] No black bars at top/bottom of images');
    console.log('   [ ] Avatar is properly sized and positioned');
    console.log('   [ ] Overall styling looks professional');

    console.log('\n✅ Test complete! Please review the video.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
