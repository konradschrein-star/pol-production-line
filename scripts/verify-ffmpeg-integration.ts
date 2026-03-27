#!/usr/bin/env tsx

/**
 * Quick verification script to ensure FFmpeg integration is working
 * Tests:
 * 1. Config loads without errors
 * 2. FFmpeg paths are resolved
 * 3. FFmpeg utilities work correctly
 */

import { config } from '../src/lib/config';
import { isFFmpegAvailable, getFFmpegVersion, probeVideo } from '../src/lib/video/ffmpeg';
import { existsSync } from 'fs';

async function verifyIntegration(): Promise<void> {
  console.log('🔍 Verifying FFmpeg Integration\n');

  // Test 1: Config loads
  console.log('1️⃣  Config Loading:');
  console.log(`   ✅ Config loaded successfully`);
  console.log(`   - FFmpeg path: ${config.video.ffmpegPath}`);
  console.log(`   - FFprobe path: ${config.video.ffprobePath}`);
  console.log(`   - Source: ${config.video.ffmpegSource}\n`);

  // Test 2: FFmpeg availability
  console.log('2️⃣  FFmpeg Availability:');
  const isAvailable = isFFmpegAvailable();
  if (isAvailable) {
    console.log(`   ✅ FFmpeg is available\n`);
  } else {
    console.log(`   ❌ FFmpeg is NOT available\n`);
    process.exit(1);
  }

  // Test 3: FFmpeg version
  console.log('3️⃣  FFmpeg Version:');
  try {
    const version = await getFFmpegVersion();
    console.log(`   ✅ Version: ${version}\n`);
  } catch (error) {
    console.log(`   ❌ Failed to get version: ${error}\n`);
    process.exit(1);
  }

  // Test 4: File existence
  console.log('4️⃣  Binary Files:');
  const ffmpegExists = existsSync(config.video.ffmpegPath);
  const ffprobeExists = existsSync(config.video.ffprobePath);
  console.log(`   FFmpeg: ${ffmpegExists ? '✅' : '❌'} ${config.video.ffmpegPath}`);
  console.log(`   FFprobe: ${ffprobeExists ? '✅' : '❌'} ${config.video.ffprobePath}\n`);

  if (!ffmpegExists || !ffprobeExists) {
    console.log('❌ Binary files not found at expected paths\n');
    process.exit(1);
  }

  console.log('✅ All integration tests passed!\n');
}

verifyIntegration().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
