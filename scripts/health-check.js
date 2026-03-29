#!/usr/bin/env node
/**
 * System Health Check Script
 * Validates all critical components before video production
 */

import { existsSync, statSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';

const execAsync = promisify(exec);
const require = createRequire(import.meta.url);

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const { red, green, yellow, blue, reset, bold } = colors;

// Health check results
const results = {
  passed: [],
  warnings: [],
  failed: [],
};

function logCheck(name, status, message = '') {
  const emoji = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  const color = status === 'pass' ? green : status === 'warn' ? yellow : red;

  console.log(`${emoji} ${color}${name}${reset}${message ? `: ${message}` : ''}`);

  if (status === 'pass') results.passed.push(name);
  else if (status === 'warn') results.warnings.push(name);
  else results.failed.push(name);
}

async function checkDocker() {
  console.log(`\n${bold}${blue}=== Docker Containers ===${reset}`);

  try {
    const { stdout } = await execAsync('docker ps --format "{{.Names}}: {{.Status}}"');
    const containers = stdout.trim().split('\n');

    const hasPostgres = containers.some(c => c.includes('postgres') && c.includes('Up'));
    const hasRedis = containers.some(c => c.includes('redis') && c.includes('Up'));

    if (hasPostgres) {
      logCheck('PostgreSQL', 'pass');
    } else {
      logCheck('PostgreSQL', 'fail', 'Container not running');
    }

    if (hasRedis) {
      logCheck('Redis', 'pass');
    } else {
      logCheck('Redis', 'fail', 'Container not running');
    }

    if (!hasPostgres || !hasRedis) {
      console.log(`   ${yellow}Fix: Run START.bat to start Docker containers${reset}`);
    }
  } catch (error) {
    logCheck('Docker', 'fail', 'Docker not running or not installed');
    console.log(`   ${yellow}Fix: Start Docker Desktop${reset}`);
  }
}

async function checkDevServer() {
  console.log(`\n${bold}${blue}=== Development Server ===${reset}`);

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:8347', { timeout: 5000 });

    if (response.ok) {
      logCheck('Next.js Dev Server', 'pass', 'Port 8347 responding');
    } else {
      logCheck('Next.js Dev Server', 'warn', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logCheck('Next.js Dev Server', 'fail', 'Not responding on port 8347');
    console.log(`   ${yellow}Fix: Run 'npm run dev' in obsidian-news-desk/${reset}`);
  }
}

async function checkDiskSpace() {
  console.log(`\n${bold}${blue}=== Disk Space ===${reset}`);

  const storagePath = process.env.LOCAL_STORAGE_ROOT || `${process.env.USERPROFILE}\\ObsidianNewsDesk`;

  if (!existsSync(storagePath)) {
    logCheck('Storage Directory', 'warn', `Does not exist: ${storagePath}`);
    console.log(`   ${yellow}Will be auto-created on first use${reset}`);
    return;
  }

  try {
    const { stdout } = await execAsync(`fsutil volume diskfree "${storagePath.substring(0, 2)}"`);
    const lines = stdout.trim().split('\n');

    // Parse bytes (format: "Total # of free bytes : 123456789")
    const freeBytes = parseInt(lines.find(l => l.includes('free bytes'))?.split(':')[1] || '0');
    const freeMB = Math.floor(freeBytes / (1024 * 1024));

    const requiredMB = 500; // Minimum for render

    if (freeMB >= requiredMB) {
      logCheck('Disk Space', 'pass', `${freeMB} MB available`);
    } else if (freeMB >= 200) {
      logCheck('Disk Space', 'warn', `${freeMB} MB available (${requiredMB} MB recommended)`);
    } else {
      logCheck('Disk Space', 'fail', `Only ${freeMB} MB available (${requiredMB} MB required)`);
      console.log(`   ${yellow}Fix: Run 'npm run clean-old-videos' or delete files manually${reset}`);
    }
  } catch (error) {
    logCheck('Disk Space', 'warn', 'Could not determine free space');
  }
}

async function checkWhiskToken() {
  console.log(`\n${bold}${blue}=== Whisk API Token ===${reset}`);

  try {
    // Load .env file
    const dotenv = require('dotenv');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env');

    if (!existsSync(envPath)) {
      logCheck('Whisk Token', 'fail', '.env file not found');
      return;
    }

    const config = dotenv.parse(require('fs').readFileSync(envPath));
    const token = config.WHISK_API_TOKEN;

    if (!token) {
      logCheck('Whisk Token', 'fail', 'WHISK_API_TOKEN not set in .env');
      console.log(`   ${yellow}Fix: See TROUBLESHOOTING.md - Issue #1${reset}`);
      return;
    }

    if (!token.startsWith('ya29.')) {
      logCheck('Whisk Token', 'fail', 'Invalid token format (should start with ya29.)');
      return;
    }

    // Basic validation passed
    logCheck('Whisk Token', 'pass', 'Format valid (expires after ~1 hour)');
    console.log(`   ${yellow}Note: Token may be expired. Test with 'npm run test:whisk-token'${reset}`);

  } catch (error) {
    logCheck('Whisk Token', 'warn', `Could not validate: ${error.message}`);
  }
}

async function checkStorageDirectories() {
  console.log(`\n${bold}${blue}=== Storage Directories ===${reset}`);

  const storagePath = process.env.LOCAL_STORAGE_ROOT || `${process.env.USERPROFILE}\\ObsidianNewsDesk`;

  const dirs = ['images', 'avatars', 'videos', 'temp'];

  for (const dir of dirs) {
    const fullPath = `${storagePath}\\${dir}`;

    if (existsSync(fullPath)) {
      try {
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          // Count files
          const { stdout } = await execAsync(`dir /b "${fullPath}" | find /c /v ""`);
          const fileCount = parseInt(stdout.trim());

          logCheck(`${dir}/`, 'pass', `${fileCount} files`);
        } else {
          logCheck(`${dir}/`, 'fail', 'Exists but is not a directory');
        }
      } catch (error) {
        logCheck(`${dir}/`, 'warn', 'Cannot read directory');
      }
    } else {
      logCheck(`${dir}/`, 'warn', 'Does not exist (will be auto-created)');
    }
  }
}

async function checkFFmpeg() {
  console.log(`\n${bold}${blue}=== FFmpeg ===${reset}`);

  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const versionLine = stdout.split('\n')[0];
    const version = versionLine.match(/ffmpeg version ([\w\.\-]+)/)?.[1];

    if (version) {
      logCheck('FFmpeg', 'pass', `Version ${version}`);
    } else {
      logCheck('FFmpeg', 'warn', 'Installed but version unknown');
    }
  } catch (error) {
    logCheck('FFmpeg', 'fail', 'Not found in PATH');
    console.log(`   ${yellow}Fix: FFmpeg is bundled via ffmpeg-static, should work anyway${reset}`);
  }
}

async function checkPublicFolders() {
  console.log(`\n${bold}${blue}=== Public Asset Folders ===${reset}`);

  const publicPath = process.cwd();

  const dirs = ['public/images', 'public/avatars'];

  for (const dir of dirs) {
    const fullPath = `${publicPath}\\${dir.replace('/', '\\')}`;

    if (existsSync(fullPath)) {
      try {
        const { stdout } = await execAsync(`dir /b "${fullPath}" | find /c /v ""`);
        const fileCount = parseInt(stdout.trim());

        if (fileCount > 0) {
          logCheck(dir, 'warn', `${fileCount} files (should be empty before render)`);
        } else {
          logCheck(dir, 'pass', 'Empty (ready for render)');
        }
      } catch (error) {
        logCheck(dir, 'pass', 'Exists');
      }
    } else {
      logCheck(dir, 'warn', 'Does not exist (will be auto-created)');
    }
  }
}

async function checkNodeVersion() {
  console.log(`\n${bold}${blue}=== Node.js Environment ===${reset}`);

  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);

  if (majorVersion >= 20) {
    logCheck('Node.js', 'pass', `Version ${version}`);
  } else if (majorVersion >= 18) {
    logCheck('Node.js', 'warn', `Version ${version} (20+ recommended)`);
  } else {
    logCheck('Node.js', 'fail', `Version ${version} (20+ required)`);
  }
}

// Run all checks
async function runHealthCheck() {
  console.log(`${bold}${blue}╔═══════════════════════════════════════╗${reset}`);
  console.log(`${bold}${blue}║  Obsidian News Desk - Health Check   ║${reset}`);
  console.log(`${bold}${blue}╚═══════════════════════════════════════╝${reset}`);

  await checkNodeVersion();
  await checkDocker();
  await checkDevServer();
  await checkDiskSpace();
  await checkWhiskToken();
  await checkStorageDirectories();
  await checkFFmpeg();
  await checkPublicFolders();

  // Summary
  console.log(`\n${bold}${blue}=== Summary ===${reset}`);
  console.log(`${green}✅ Passed: ${results.passed.length}${reset}`);
  console.log(`${yellow}⚠️  Warnings: ${results.warnings.length}${reset}`);
  console.log(`${red}❌ Failed: ${results.failed.length}${reset}`);

  if (results.failed.length === 0) {
    console.log(`\n${green}${bold}🎉 System is ready for video production!${reset}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Create new broadcast at http://localhost:8347`);
    console.log(`  2. Paste news script`);
    console.log(`  3. Click "Submit"`);
    process.exit(0);
  } else if (results.failed.length === 1 && results.failed[0] === 'Next.js Dev Server') {
    console.log(`\n${yellow}${bold}⚠️  System is mostly ready, but dev server is not running${reset}`);
    console.log(`\nFix:`);
    console.log(`  cd obsidian-news-desk`);
    console.log(`  npm run dev`);
    process.exit(1);
  } else {
    console.log(`\n${red}${bold}❌ System has ${results.failed.length} critical issue(s)${reset}`);
    console.log(`\nSee messages above for fixes, or check TROUBLESHOOTING.md`);
    process.exit(1);
  }
}

// Run
runHealthCheck().catch((error) => {
  console.error(`${red}Health check failed:${reset}`, error);
  process.exit(1);
});
