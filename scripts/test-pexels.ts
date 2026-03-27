#!/usr/bin/env tsx

/**
 * Pexels API Integration Test
 *
 * Tests all Pexels components end-to-end:
 * - API key validation
 * - FFmpeg availability
 * - Video search
 * - Video selection
 * - Video download
 * - Storage saving
 * - Metadata extraction
 * - Rate limit tracking
 *
 * Usage: npm run test:pexels
 */

import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { PexelsAPIClient } from '../src/lib/pexels/api';
import { isFFmpegAvailable, getFFmpegVersion, probeVideo } from '../src/lib/video/ffmpeg';
import { saveBuffer } from '../src/lib/storage/local';

dotenv.config();

async function main() {
  console.log('\n🧪 PEXELS VIDEO API TEST\n');
  console.log('='.repeat(50));

  // TEST 1: API Key
  console.log('\n📋 TEST 1: Checking API key...');
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error('❌ PEXELS_API_KEY not found in .env');
    console.log('Get your free API key at: https://www.pexels.com/api/');
    process.exit(1);
  }
  console.log('✅ API key found');

  // TEST 2: FFmpeg
  console.log('\n🔧 TEST 2: Checking FFmpeg...');
  if (!isFFmpegAvailable()) {
    console.error('❌ FFmpeg not available');
    console.log('Install: npm install ffmpeg-static');
    process.exit(1);
  }
  const version = await getFFmpegVersion();
  console.log(`✅ FFmpeg ${version} available`);

  // Initialize client
  const client = new PexelsAPIClient(apiKey);

  // TEST 3: Search Videos
  console.log('\n🔍 TEST 3: Searching for videos...');
  const searchResults = await client.searchVideos({
    query: 'breaking news',
    orientation: 'landscape',
    per_page: 15,
    min_duration: 5,
    max_duration: 30
  });

  if (searchResults.videos.length === 0) {
    console.error('❌ No videos found');
    process.exit(1);
  }
  console.log(`✅ Found ${searchResults.total_results} results`);

  // TEST 4: Select Best Video
  console.log('\n🎯 TEST 4: Selecting best video...');
  const selected = client.selectBestVideo(searchResults.videos);

  if (!selected) {
    console.error('❌ Failed to select video');
    process.exit(1);
  }
  console.log(`✅ Selected video #${selected.videoId}`);
  console.log(`   Resolution: ${selected.resolution}`);
  console.log(`   Duration: ${selected.duration}s`);
  console.log(`   Quality: ${selected.quality}`);

  // TEST 5: Download Video
  console.log('\n⬇️  TEST 5: Downloading video...');
  const videoBuffer = await client.downloadVideo(selected.downloadUrl);

  if (videoBuffer.length === 0) {
    console.error('❌ Downloaded video is empty');
    process.exit(1);
  }
  const sizeInMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`✅ Downloaded ${sizeInMB} MB`);

  // TEST 6: Save to Storage
  console.log('\n💾 TEST 6: Saving to storage...');
  const filename = `test-pexels-${selected.videoId}.mp4`;
  const localPath = await saveBuffer(videoBuffer, filename, 'footage');

  if (!existsSync(localPath)) {
    console.error('❌ File not saved to storage');
    process.exit(1);
  }
  console.log(`✅ Saved to ${localPath}`);

  // TEST 7: Probe Metadata
  console.log('\n🔍 TEST 7: Extracting metadata...');
  const metadata = await probeVideo(localPath);

  console.log(`✅ Metadata extracted:`);
  console.log(`   Resolution: ${metadata.resolution}`);
  console.log(`   Codec: ${metadata.codec}`);
  console.log(`   Duration: ${metadata.duration}s`);
  console.log(`   FPS: ${metadata.fps}`);
  console.log(`   Bitrate: ${metadata.bitrate} kbps`);
  console.log(`   File Size: ${(metadata.fileSize / 1024 / 1024).toFixed(1)} MB`);

  // TEST 8: Rate Limit Status
  console.log('\n📊 TEST 8: Rate limit status...');
  const rateLimit = client.getRateLimitStatus();
  console.log(`✅ API Usage: ${rateLimit.used}/${rateLimit.limit} requests`);
  console.log(`   Resets in: ${rateLimit.resetInMinutes} minutes`);

  // Success
  console.log('\n' + '='.repeat(50));
  console.log('🎉 ALL TESTS PASSED!\n');
}

main().catch((error) => {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
});
