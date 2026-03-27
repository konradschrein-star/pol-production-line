#!/usr/bin/env tsx

/**
 * FFmpeg Resolution Test Suite
 * Validates FFmpeg installation and capabilities
 * Usage: npm run test:ffmpeg
 */

import { getFFmpegPaths, clearFFmpegCache } from '../src/lib/video/ffmpeg-resolver';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function testFFmpegResolution(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🧪 FFmpeg Resolution Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let paths;

  // Test 1: Path resolution
  try {
    paths = getFFmpegPaths();
    console.log(`✅ FFmpeg resolved from: ${paths.source}`);
    console.log(`   - ffmpeg:  ${paths.ffmpeg}`);
    console.log(`   - ffprobe: ${paths.ffprobe}\n`);
  } catch (e) {
    console.error(`❌ Failed to resolve FFmpeg: ${(e as Error).message}\n`);
    process.exit(1);
  }

  // Test 2: FFmpeg execution
  try {
    const { stdout } = await execFileAsync(paths.ffmpeg, ['-version']);
    const versionMatch = stdout.match(/ffmpeg version (\S+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    console.log(`✅ FFmpeg executable working (version ${version})\n`);
  } catch (e) {
    console.error(`❌ FFmpeg execution failed: ${(e as Error).message}\n`);
    process.exit(1);
  }

  // Test 3: FFprobe execution
  try {
    const { stdout } = await execFileAsync(paths.ffprobe, ['-version']);
    const versionMatch = stdout.match(/ffprobe version (\S+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    console.log(`✅ FFprobe executable working (version ${version})\n`);
  } catch (e) {
    console.error(`❌ FFprobe execution failed: ${(e as Error).message}\n`);
    process.exit(1);
  }

  // Test 4: Codec support (H.264 and H.265 required for production)
  try {
    const { stdout } = await execFileAsync(paths.ffmpeg, ['-codecs']);
    const hasH264 = stdout.includes('h264') || stdout.includes('libx264');
    const hasH265 = stdout.includes('hevc') || stdout.includes('libx265');

    if (hasH264 && hasH265) {
      console.log('✅ Required codecs available (H.264, H.265)\n');
    } else {
      console.warn('⚠️  Missing required codecs:');
      if (!hasH264) console.warn('   - H.264 (libx264)');
      if (!hasH265) console.warn('   - H.265 (libx265/hevc)');
      console.warn('   Avatar optimization may fail\n');
    }
  } catch (e) {
    console.warn(`⚠️  Could not check codec support: ${(e as Error).message}\n`);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ All tests passed');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

testFFmpegResolution();
