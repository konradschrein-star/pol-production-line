#!/usr/bin/env tsx
/**
 * Disk Space Checker
 * Checks available disk space in storage directory
 */

import 'dotenv/config';
import { checkDiskSpace } from '../src/lib/storage/local';

async function main() {
  console.log('💾 Checking disk space...\n');

  const result = checkDiskSpace(500); // Require 500MB for render

  console.log(`Storage Path: ${result.path}`);
  console.log(`Available: ${result.availableMB} MB`);
  console.log(`Required: ${result.requiredMB} MB`);

  if (result.available) {
    console.log(`\n✅ Sufficient disk space available`);
    console.log(`   ${result.availableMB - result.requiredMB} MB free after render`);
    process.exit(0);
  } else {
    console.log(`\n❌ Insufficient disk space`);
    console.log(`   Need ${result.requiredMB - result.availableMB} MB more`);
    console.log('\nFix:');
    console.log('  1. Delete old videos: npm run clean-old-videos');
    console.log('  2. Or manually delete files in:');
    console.log(`     ${result.path}`);
    process.exit(1);
  }
}

main();
