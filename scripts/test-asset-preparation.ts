/**
 * Test script for asset preparation module
 *
 * This validates that the asset preparation module correctly:
 * 1. Validates image files exist
 * 2. Copies them to public folder
 * 3. Detects missing/invalid files
 * 4. Validates avatar file
 *
 * Run with: npx tsx scripts/test-asset-preparation.ts
 */

import { prepareRenderAssets } from '../src/lib/remotion/asset-preparation';
import { existsSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_JOB_ID = 'test-asset-prep-' + Date.now();

// Create test directory structure
const testStorageDir = join(process.cwd(), '..', '..', 'ObsidianNewsDesk', 'images');
const testAvatarDir = join(process.cwd(), '..', '..', 'ObsidianNewsDesk', 'avatars');

async function runTests() {
  console.log('🧪 Asset Preparation Module Test Suite\n');

  // Ensure test directories exist
  if (!existsSync(testStorageDir)) {
    console.log(`⚠️  Storage directory not found: ${testStorageDir}`);
    console.log('   Creating test directory...');
    mkdirSync(testStorageDir, { recursive: true });
  }

  if (!existsSync(testAvatarDir)) {
    console.log(`⚠️  Avatar directory not found: ${testAvatarDir}`);
    console.log('   Creating test directory...');
    mkdirSync(testAvatarDir, { recursive: true });
  }

  // Test Case 1: Valid scene images
  console.log('\n📸 Test 1: Valid Scene Images');
  console.log('─'.repeat(50));

  const validImagePath = join(testStorageDir, 'test-valid-scene.jpg');
  writeFileSync(validImagePath, Buffer.from('fake-image-data-' + Date.now()));

  const validScenes = [
    {
      id: 'scene-1',
      image_url: validImagePath,
      ticker_headline: 'Test Headline',
      scene_order: 0,
    },
  ];

  const validAvatar = join(testAvatarDir, 'test-avatar.mp4');
  writeFileSync(validAvatar, Buffer.from('fake-video-data-' + Date.now()));

  try {
    const result = await prepareRenderAssets(TEST_JOB_ID, validScenes, validAvatar);

    if (result.valid) {
      console.log('✅ Test 1 PASSED: Valid assets accepted');
    } else {
      console.log('❌ Test 1 FAILED: Valid assets rejected');
      console.log('   Details:', result.details);
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED with exception:', error);
  }

  // Test Case 2: Missing image file
  console.log('\n📸 Test 2: Missing Image File');
  console.log('─'.repeat(50));

  const missingScenes = [
    {
      id: 'scene-missing',
      image_url: 'C:\\NonExistent\\missing.jpg',
      ticker_headline: 'Test Headline',
      scene_order: 0,
    },
  ];

  try {
    const result = await prepareRenderAssets(TEST_JOB_ID, missingScenes, validAvatar);

    if (!result.valid && result.invalidPaths.length > 0) {
      console.log('✅ Test 2 PASSED: Missing file detected');
    } else {
      console.log('❌ Test 2 FAILED: Missing file not detected');
      console.log('   Result:', result);
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED with exception:', error);
  }

  // Test Case 3: NULL image_url
  console.log('\n📸 Test 3: NULL Image URL');
  console.log('─'.repeat(50));

  const nullScenes = [
    {
      id: 'scene-null',
      image_url: '',
      ticker_headline: 'Test Headline',
      scene_order: 0,
    },
  ];

  try {
    const result = await prepareRenderAssets(TEST_JOB_ID, nullScenes, validAvatar);

    if (!result.valid && result.missingImages.length > 0) {
      console.log('✅ Test 3 PASSED: NULL image_url detected');
    } else {
      console.log('❌ Test 3 FAILED: NULL image_url not detected');
      console.log('   Result:', result);
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED with exception:', error);
  }

  // Test Case 4: Invalid avatar
  console.log('\n🎭 Test 4: Invalid Avatar File');
  console.log('─'.repeat(50));

  try {
    const result = await prepareRenderAssets(
      TEST_JOB_ID,
      validScenes,
      'C:\\NonExistent\\avatar.mp4'
    );

    if (!result.valid && result.avatarError) {
      console.log('✅ Test 4 PASSED: Invalid avatar detected');
    } else {
      console.log('❌ Test 4 FAILED: Invalid avatar not detected');
      console.log('   Result:', result);
    }
  } catch (error) {
    console.log('❌ Test 4 FAILED with exception:', error);
  }

  // Test Case 5: Empty file (0 bytes)
  console.log('\n📸 Test 5: Empty File (0 bytes)');
  console.log('─'.repeat(50));

  const emptyImagePath = join(testStorageDir, 'test-empty.jpg');
  writeFileSync(emptyImagePath, '');

  const emptyScenes = [
    {
      id: 'scene-empty',
      image_url: emptyImagePath,
      ticker_headline: 'Test Headline',
      scene_order: 0,
    },
  ];

  try {
    const result = await prepareRenderAssets(TEST_JOB_ID, emptyScenes, validAvatar);

    if (!result.valid && result.invalidPaths.length > 0) {
      console.log('✅ Test 5 PASSED: Empty file detected');
    } else {
      console.log('❌ Test 5 FAILED: Empty file not detected');
      console.log('   Result:', result);
    }
  } catch (error) {
    console.log('❌ Test 5 FAILED with exception:', error);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  try {
    if (existsSync(validImagePath)) unlinkSync(validImagePath);
    if (existsSync(validAvatar)) unlinkSync(validAvatar);
    if (existsSync(emptyImagePath)) unlinkSync(emptyImagePath);
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error);
  }

  console.log('\n🎉 Test suite complete!\n');
}

runTests().catch(console.error);
