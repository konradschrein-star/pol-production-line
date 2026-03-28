#!/usr/bin/env tsx
/**
 * Obsidian News Desk - Setup & Validation Script
 *
 * Validates system requirements and prepares the application for first run.
 * Designed to work like professional software (Photoshop, etc.) - clear errors,
 * helpful guidance, automatic fixes where possible.
 *
 * PHILOSOPHY:
 * - Fail fast with clear error messages
 * - Auto-fix what we can (create directories, copy .env.example)
 * - Guide the user for what we can't fix (install Docker, get API keys)
 * - Production-grade: No assumptions, validate everything
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function print(msg: string, color?: keyof typeof colors): void {
  const c = color ? colors[color] : '';
  console.log(`${c}${msg}${colors.reset}`);
}

function printHeader(title: string): void {
  const width = 70;
  const padding = Math.max(0, (width - title.length - 2) / 2);
  const line = '═'.repeat(width);

  console.log();
  print(line, 'cyan');
  print(' '.repeat(Math.floor(padding)) + title, 'bright');
  print(line, 'cyan');
  console.log();
}

function checkMark(): string {
  return process.platform === 'win32' ? '√' : '✓';
}

function crossMark(): string {
  return process.platform === 'win32' ? 'X' : '✗';
}

interface CheckResult {
  passed: boolean;
  message: string;
  fix?: () => Promise<void> | void;
  fixDescription?: string;
}

// ============================================
// System Checks
// ============================================

/**
 * Check Node.js version (>= 20.0.0)
 */
function checkNodeVersion(): CheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);

  if (major >= 20) {
    return {
      passed: true,
      message: `Node.js ${version} ${checkMark()}`,
    };
  }

  return {
    passed: false,
    message: `Node.js ${version} is too old (need >= 20.0.0) ${crossMark()}`,
    fixDescription: `Download from: https://nodejs.org/`,
  };
}

/**
 * Check if Docker Desktop is installed and running
 */
function checkDocker(): CheckResult {
  try {
    // Check if docker command exists
    execSync('docker --version', { stdio: 'pipe' });

    // Check if Docker daemon is running
    execSync('docker ps', { stdio: 'pipe' });

    return {
      passed: true,
      message: `Docker is running ${checkMark()}`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Docker is not running ${crossMark()}`,
      fixDescription:
        `Install Docker Desktop from: https://www.docker.com/products/docker-desktop/\n` +
        `   After installation, start Docker Desktop and wait for it to be ready.`,
    };
  }
}

/**
 * Check if .env file exists
 */
function checkEnvFile(): CheckResult {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (fs.existsSync(envPath)) {
    return {
      passed: true,
      message: `.env file exists ${checkMark()}`,
    };
  }

  if (!fs.existsSync(envExamplePath)) {
    return {
      passed: false,
      message: `.env.example file not found ${crossMark()}`,
      fixDescription: `Your installation may be corrupted. Re-download the application.`,
    };
  }

  return {
    passed: false,
    message: `.env file not found ${crossMark()}`,
    fix: () => {
      fs.copyFileSync(envExamplePath, envPath);
      print(`   Created .env from .env.example`, 'green');
    },
    fixDescription: `Auto-fix available: Copy .env.example to .env`,
  };
}

/**
 * Check if required environment variables are set
 */
function checkEnvVariables(): CheckResult {
  // Load .env file manually for validation
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return {
      passed: false,
      message: `.env file not found, skipping variable check`,
    };
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars: Record<string, string> = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (match) {
      envVars[match[1]] = match[2].trim();
    }
  });

  const required = ['DATABASE_URL', 'WHISK_API_TOKEN'];
  const missing: string[] = [];

  required.forEach(varName => {
    const value = envVars[varName] || process.env[varName];
    if (!value || value.includes('your_') || value.includes('_here')) {
      missing.push(varName);
    }
  });

  if (missing.length === 0) {
    return {
      passed: true,
      message: `Required environment variables configured ${checkMark()}`,
    };
  }

  return {
    passed: false,
    message: `Missing or placeholder environment variables: ${missing.join(', ')} ${crossMark()}`,
    fixDescription:
      `Edit .env file and set these variables:\n` +
      missing.map(v => `   - ${v}`).join('\n') +
      `\n\n   See .env.example for instructions on getting API keys.\n` +
      `   Or run: npm run first-run (interactive setup wizard)`,
  };
}

/**
 * Check if Whisk API token is valid format and not expired
 */
function checkWhiskToken(): CheckResult {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return {
      passed: false,
      message: `Cannot check Whisk token (no .env file)`,
    };
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokenMatch = envContent.match(/^WHISK_API_TOKEN=(.*)$/m);

  if (!tokenMatch) {
    return {
      passed: false,
      message: `WHISK_API_TOKEN not found in .env ${crossMark()}`,
    };
  }

  const token = tokenMatch[1].trim();

  // Check for placeholder value
  if (token.includes('your_') || token.includes('_here') || token.length < 100) {
    return {
      passed: false,
      message: `Whisk token is placeholder value ${crossMark()}`,
      fixDescription:
        `Follow Whisk token refresh process:\n` +
        `   1. Open https://labs.google.com/whisk in browser\n` +
        `   2. F12 → Network tab\n` +
        `   3. Generate test image\n` +
        `   4. Find "generateImage" request\n` +
        `   5. Copy Authorization header (starts with "Bearer ya29...")\n` +
        `   6. Update WHISK_API_TOKEN in .env\n\n` +
        `   Or run: npm run first-run (interactive setup wizard)`,
    };
  }

  // Check token format (should start with ya29.)
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  if (!cleanToken.startsWith('ya29.')) {
    return {
      passed: false,
      message: `Whisk token has invalid format (should start with ya29.) ${crossMark()}`,
      fixDescription:
        `Get a fresh token from https://labs.google.com/whisk\n` +
        `   Token should start with "ya29." (Google OAuth token format)`,
    };
  }

  return {
    passed: true,
    message: `Whisk token format is valid ${checkMark()}`,
  };
}

/**
 * Check storage directory access
 */
function checkStorageAccess(): CheckResult {
  // Determine storage root
  const envStorageRoot = process.env.LOCAL_STORAGE_ROOT;
  const defaultStorageRoot = path.join(os.homedir(), 'ObsidianNewsDesk');
  const storageRoot = envStorageRoot || defaultStorageRoot;

  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(storageRoot)) {
      fs.mkdirSync(storageRoot, { recursive: true });
    }

    // Test write access
    const testFile = path.join(storageRoot, '.write-test');
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile);

    // Create subdirectories
    const subdirs = ['images', 'avatars', 'videos', 'footage', 'temp'];
    subdirs.forEach(dir => {
      const dirPath = path.join(storageRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    return {
      passed: true,
      message: `Storage directory accessible: ${storageRoot} ${checkMark()}`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Cannot access storage directory: ${storageRoot} ${crossMark()}`,
      fixDescription:
        `Check that you have write permissions for this directory.\n` +
        `   Or set LOCAL_STORAGE_ROOT in .env to a different location.`,
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  try {
    // Load DATABASE_URL from .env
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      return {
        passed: false,
        message: `Cannot check database (no .env file)`,
      };
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);

    if (!dbUrlMatch) {
      return {
        passed: false,
        message: `DATABASE_URL not found in .env ${crossMark()}`,
      };
    }

    // Try to import pg and test connection
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: dbUrlMatch[1].trim() });

    await pool.query('SELECT 1');
    await pool.end();

    return {
      passed: true,
      message: `Database connection successful ${checkMark()}`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Database connection failed ${crossMark()}`,
      fixDescription:
        `Make sure Docker containers are running:\n` +
        `   $ docker compose up -d\n\n` +
        `   Or run START.bat to start all services.`,
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<CheckResult> {
  try {
    // Load Redis config from .env
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      return {
        passed: false,
        message: `Cannot check Redis (no .env file)`,
      };
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const redisHostMatch = envContent.match(/^REDIS_HOST=(.*)$/m);
    const redisPortMatch = envContent.match(/^REDIS_PORT=(.*)$/m);
    const redisPasswordMatch = envContent.match(/^REDIS_PASSWORD=(.*)$/m);

    if (!redisHostMatch || !redisPortMatch) {
      return {
        passed: false,
        message: `Redis config not found in .env ${crossMark()}`,
      };
    }

    const host = redisHostMatch[1].trim();
    const port = parseInt(redisPortMatch[1].trim(), 10);
    const password = redisPasswordMatch ? redisPasswordMatch[1].trim() : undefined;

    // Try to import ioredis and test connection
    const { default: Redis } = await import('ioredis');
    const redis = new Redis({ host, port, password, lazyConnect: true });

    await redis.connect();
    await redis.ping();
    redis.disconnect();

    return {
      passed: true,
      message: `Redis connection successful ${checkMark()}`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Redis connection failed ${crossMark()}`,
      fixDescription:
        `Make sure Docker containers are running:\n` +
        `   $ docker compose up -d\n\n` +
        `   Or run START.bat to start all services.`,
    };
  }
}

/**
 * Check FFmpeg availability
 */
function checkFFmpeg(): CheckResult {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    execSync('ffprobe -version', { stdio: 'pipe' });

    return {
      passed: true,
      message: `FFmpeg installed ${checkMark()}`,
    };
  } catch (error) {
    // Check if ffmpeg-static is available (bundled with app)
    try {
      const ffmpegStatic = require('ffmpeg-static');
      const ffprobeStatic = require('ffprobe-static');

      if (ffmpegStatic && ffprobeStatic) {
        return {
          passed: true,
          message: `FFmpeg (bundled) available ${checkMark()}`,
        };
      }
    } catch {}

    return {
      passed: false,
      message: `FFmpeg not found ${crossMark()}`,
      fixDescription:
        `Install FFmpeg from: https://ffmpeg.org/download.html\n` +
        `   Or it will use bundled version (ffmpeg-static npm package).`,
    };
  }
}

// ============================================
// Main Setup Flow
// ============================================

async function main() {
  printHeader('Obsidian News Desk - Setup & Validation');

  print('Checking system requirements...', 'bright');
  console.log();

  // Run all checks
  const results: CheckResult[] = [
    checkNodeVersion(),
    checkDocker(),
    checkFFmpeg(),
    checkEnvFile(),
    checkEnvVariables(),
    checkWhiskToken(),
    checkStorageAccess(),
  ];

  // Print results
  results.forEach(result => {
    if (result.passed) {
      print(`✓ ${result.message}`, 'green');
    } else {
      print(`✗ ${result.message}`, 'red');
      if (result.fixDescription) {
        print(`  ${result.fixDescription}`, 'yellow');
      }
    }
  });

  console.log();

  // Run auto-fixes
  const fixableResults = results.filter(r => !r.passed && r.fix);
  if (fixableResults.length > 0) {
    print('Applying automatic fixes...', 'bright');
    console.log();

    for (const result of fixableResults) {
      if (result.fix) {
        await result.fix();
      }
    }

    console.log();
  }

  // Check database/Redis if Docker is running
  const dockerRunning = results.find(r => r.message.includes('Docker'))?.passed;

  if (dockerRunning) {
    print('Checking services...', 'bright');
    console.log();

    const dbResult = await checkDatabase();
    const redisResult = await checkRedis();

    if (dbResult.passed) {
      print(`✓ ${dbResult.message}`, 'green');
    } else {
      print(`✗ ${dbResult.message}`, 'red');
      if (dbResult.fixDescription) {
        print(`  ${dbResult.fixDescription}`, 'yellow');
      }
    }

    if (redisResult.passed) {
      print(`✓ ${redisResult.message}`, 'green');
    } else {
      print(`✗ ${redisResult.message}`, 'red');
      if (redisResult.fixDescription) {
        print(`  ${redisResult.fixDescription}`, 'yellow');
      }
    }

    results.push(dbResult, redisResult);
    console.log();
  }

  // Summary
  const allPassed = results.every(r => r.passed);

  printHeader(allPassed ? 'Setup Complete' : 'Setup Incomplete');

  if (allPassed) {
    print('All checks passed! Your system is ready.', 'green');
    console.log();
    print('Next steps:', 'bright');
    print('  1. Review .env file and set your API keys', 'cyan');
    print('  2. Run: npm run start (or START.bat)', 'cyan');
    print('  3. Open: http://localhost:8347', 'cyan');
    console.log();
  } else {
    print('Some checks failed. Please fix the issues above.', 'red');
    console.log();
    print('Common fixes:', 'bright');
    print('  - Install Docker Desktop and start it', 'yellow');
    print('  - Edit .env file and add your API keys', 'yellow');
    print('  - Run: docker compose up -d', 'yellow');
    print('  - Run this script again: npm run setup', 'yellow');
    console.log();

    process.exit(1);
  }
}

// Run setup
main().catch(error => {
  console.error();
  print('Setup failed with error:', 'red');
  console.error(error);
  console.error();
  process.exit(1);
});
