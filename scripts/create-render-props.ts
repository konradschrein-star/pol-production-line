#!/usr/bin/env tsx
/**
 * Create render props with word timestamps and avatar aspect ratio detection
 */

import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { getVideoMetadata } from '../src/lib/remotion/video-utils';

async function main() {
  const timestampsFile = join(tmpdir(), 'word-timestamps.json');
  const outputFile = join(tmpdir(), 'render-props-final.json');

  // Load word timestamps
  const timestampsData = JSON.parse(readFileSync(timestampsFile, 'utf-8'));
  const wordTimestamps = timestampsData.words;

  // Get avatar video metadata (aspect ratio detection)
  const avatarPath = 'C:\\Users\\konra\\ObsidianNewsDesk\\avatars\\avatar_1774148522174.mp4';
  const avatarMetadata = await getVideoMetadata(avatarPath);

  // Validate aspect ratio is reasonable
  if (avatarMetadata.aspectRatio < 0.1 || avatarMetadata.aspectRatio > 10) {
    console.error(`❌ Invalid aspect ratio detected: ${avatarMetadata.aspectRatio}`);
    console.error(`   Video dimensions: ${avatarMetadata.width}x${avatarMetadata.height}`);
    process.exit(1);
  }

  // Create render props with aspect ratio
  const renderProps = {
    avatarMp4Url: '/avatars/avatar_1774148522174.mp4',
    avatarDurationSeconds: avatarMetadata.duration,
    avatarAspectRatio: avatarMetadata.aspectRatio,
    avatarWidth: avatarMetadata.width,
    avatarHeight: avatarMetadata.height,
    wordTimestamps: wordTimestamps,
    scenes: [
      { id: '1', image_url: '/images/60ccd0a3-fa94-4ea4-9c8c-2d0dbdbea4fa.jpg', ticker_headline: 'SENATE PASSES HISTORIC CLIMATE LEGISLATION', scene_order: 1 },
      { id: '2', image_url: '/images/3691f99b-ddc7-460e-a654-bf66c5e829eb.jpg', ticker_headline: '$69 BILLION FOR GREEN TECH', scene_order: 2 },
      { id: '3', image_url: '/images/e532b10d-a8cf-4471-90d1-d212edb9636f.jpg', ticker_headline: 'NARROW VOTE: 51-50 IN SENATE', scene_order: 3 },
      { id: '4', image_url: '/images/1ce05f95-2da0-416f-a360-109e7716a80f.jpg', ticker_headline: 'ACTIVISTS CELEBRATE', scene_order: 4 },
      { id: '5', image_url: '/images/066b83a8-db90-441f-9d5d-35feeff85247.jpg', ticker_headline: '40% CARBON REDUCTION BY 2030', scene_order: 5 },
      { id: '6', image_url: '/images/image-generation-failed.jpg', ticker_headline: 'MARKETS REACT', scene_order: 6 },
      { id: '7', image_url: '/images/ced0b8fe-8eee-46d8-a124-f40b620fdcd7.jpg', ticker_headline: 'HOUSE TO VOTE', scene_order: 7 },
      { id: '8', image_url: '/images/5d7c9ec3-2aa4-4643-b912-2afb2a167d5c.jpg', ticker_headline: 'EV CREDITS SHAPING FUTURE', scene_order: 8 }
    ]
  };

  writeFileSync(outputFile, JSON.stringify(renderProps, null, 2));

  console.log('✅ Render props created with:');
  console.log(`   - Duration: ${renderProps.avatarDurationSeconds}s`);
  console.log(`   - Avatar dimensions: ${renderProps.avatarWidth}x${renderProps.avatarHeight}`);
  console.log(`   - Avatar aspect ratio: ${renderProps.avatarAspectRatio.toFixed(4)}`);
  console.log(`   - Word timestamps: ${wordTimestamps.length} words`);
  console.log(`   - Scenes: ${renderProps.scenes.length}`);
  console.log(`   - Output: ${outputFile}`);
}

main().catch(error => {
  console.error('❌ Failed to create render props:', error);
  process.exit(1);
});
