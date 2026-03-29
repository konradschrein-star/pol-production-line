#!/usr/bin/env tsx
/**
 * Clean Old Videos
 * Deletes video files older than specified days
 */

import 'dotenv/config';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { resolveStoragePath } from '../src/lib/storage/path-resolver';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function cleanOldVideos(daysOld = 7, dryRun = false) {
  console.log(`🗑️  Searching for videos older than ${daysOld} days...\n`);

  const videosPath = resolveStoragePath('videos');

  if (!existsSync(videosPath)) {
    console.log('✅ No videos directory found (nothing to clean)');
    process.exit(0);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const files = readdirSync(videosPath).filter((f) => f.endsWith('.mp4'));

  const oldFiles: Array<{ name: string; size: number; mtime: Date }> = [];
  let totalSize = 0;

  for (const file of files) {
    const filePath = join(videosPath, file);
    const stats = statSync(filePath);

    if (stats.mtime < cutoffDate) {
      oldFiles.push({
        name: file,
        size: stats.size,
        mtime: stats.mtime,
      });
      totalSize += stats.size;
    }
  }

  if (oldFiles.length === 0) {
    console.log('✅ No old videos found');
    process.exit(0);
  }

  console.log(`Found ${oldFiles.length} old video(s):`);
  console.log('─'.repeat(80));

  oldFiles.forEach((f) => {
    const sizeMB = (f.size / (1024 * 1024)).toFixed(2);
    const age = Math.floor((Date.now() - f.mtime.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  ${f.name}`);
    console.log(`    Size: ${sizeMB} MB  |  Age: ${age} days  |  Modified: ${f.mtime.toLocaleDateString()}`);
  });

  console.log('─'.repeat(80));
  console.log(`Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB\n`);

  if (dryRun) {
    console.log('🔍 Dry run mode - no files deleted');
    process.exit(0);
  }

  const answer = await question('Delete these files? (yes/no): ');

  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('\n🗑️  Deleting files...');

    let deleted = 0;
    for (const file of oldFiles) {
      try {
        unlinkSync(join(videosPath, file.name));
        console.log(`  ✅ Deleted: ${file.name}`);
        deleted++;
      } catch (error: any) {
        console.error(`  ❌ Failed to delete ${file.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Deleted ${deleted}/${oldFiles.length} files`);
    console.log(`   Freed: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
  } else {
    console.log('\n❌ Cancelled - no files deleted');
  }

  rl.close();
  process.exit(0);
}

// Parse command line args
const args = process.argv.slice(2);
const daysOld = args[0] ? parseInt(args[0]) : 7;
const dryRun = args.includes('--dry-run');

cleanOldVideos(daysOld, dryRun);
