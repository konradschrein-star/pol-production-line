/**
 * Test Path Resolver
 * Verifies that the path resolver correctly handles both relative and absolute paths
 */

import 'dotenv/config';
import { getBaseStoragePath, resolveStoragePath, makeRelativePath } from '../src/lib/storage/path-resolver';
import { existsSync } from 'fs';
import path from 'path';

async function testPathResolver() {
  console.log('🧪 Testing Path Resolver...\n');

  // Test 1: Get base storage path
  console.log('Test 1: Get base storage path');
  const basePath = getBaseStoragePath();
  console.log(`   Base path: ${basePath}`);
  console.log(`   Exists: ${existsSync(basePath) ? '✅' : '❌'}`);

  // Test 2: Resolve relative path
  console.log('\nTest 2: Resolve relative path');
  const relativePath = 'images/test.jpg';
  const resolvedRelative = resolveStoragePath(relativePath);
  console.log(`   Input: ${relativePath}`);
  console.log(`   Resolved: ${resolvedRelative}`);
  console.log(`   Is absolute: ${path.isAbsolute(resolvedRelative) ? '✅' : '❌'}`);
  console.log(`   Starts with base: ${resolvedRelative.startsWith(basePath) ? '✅' : '❌'}`);

  // Test 3: Resolve absolute path (legacy format)
  console.log('\nTest 3: Resolve absolute path (legacy)');
  const absolutePath = path.join(basePath, 'avatars', 'test.mp4');
  const resolvedAbsolute = resolveStoragePath(absolutePath);
  console.log(`   Input: ${absolutePath}`);
  console.log(`   Resolved: ${resolvedAbsolute}`);
  console.log(`   Same as input: ${resolvedAbsolute === absolutePath ? '✅' : '❌'}`);

  // Test 4: Convert absolute to relative
  console.log('\nTest 4: Convert absolute to relative');
  const absPath = path.join(basePath, 'videos', 'job-123.mp4');
  const relPath = makeRelativePath(absPath);
  console.log(`   Input: ${absPath}`);
  console.log(`   Output: ${relPath}`);
  console.log(`   Expected format: ${relPath === 'videos/job-123.mp4' ? '✅' : '❌'}`);

  // Test 5: Convert already relative path
  console.log('\nTest 5: Convert already relative path');
  const alreadyRelative = 'images/scene-456.jpg';
  const stillRelative = makeRelativePath(alreadyRelative);
  console.log(`   Input: ${alreadyRelative}`);
  console.log(`   Output: ${stillRelative}`);
  console.log(`   Unchanged: ${stillRelative === alreadyRelative ? '✅' : '❌'}`);

  // Test 6: Test with environment variable
  console.log('\nTest 6: Environment variable');
  console.log(`   LOCAL_STORAGE_ROOT: ${process.env.LOCAL_STORAGE_ROOT || '(not set)'}`);
  if (process.env.LOCAL_STORAGE_ROOT) {
    console.log(`   Matches base path: ${process.env.LOCAL_STORAGE_ROOT === basePath ? '✅' : '❌'}`);
  }

  console.log('\n✅ All path resolver tests completed!');
}

testPathResolver().catch(console.error);
