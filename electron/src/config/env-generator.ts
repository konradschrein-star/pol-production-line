// Generate .env file from wizard configuration

import * as fs from 'fs';
import * as path from 'path';

export interface WizardConfig {
  storagePath: string;
  aiProvider: 'openai' | 'claude' | 'google' | 'groq';
  openaiKey?: string;
  claudeKey?: string;
  googleKey?: string;
  groqKey?: string;
  whiskToken?: string;
}

/**
 * Generate .env file content from wizard configuration
 */
export function generateEnvContent(config: WizardConfig): string {
  const lines: string[] = [];

  // Application settings
  lines.push('# Application');
  lines.push('NODE_ENV=production');
  lines.push('NEXT_PUBLIC_APP_URL=http://localhost:8347');
  lines.push('');

  // Database (Local Postgres via Docker)
  lines.push('# Database (Local Postgres via Docker)');
  lines.push('DATABASE_URL=postgresql://obsidian:obsidian_password@localhost:5432/obsidian_news');
  lines.push('');

  // Redis (Local via Docker)
  lines.push('# Redis (Local via Docker)');
  lines.push('REDIS_HOST=localhost');
  lines.push('REDIS_PORT=6379');
  lines.push('REDIS_PASSWORD=obsidian_redis_password');
  lines.push('');

  // AI Provider
  lines.push('# AI Providers');
  lines.push(`AI_PROVIDER=${config.aiProvider}`);

  if (config.openaiKey) {
    lines.push(`OPENAI_API_KEY=${config.openaiKey}`);
  }

  if (config.claudeKey) {
    lines.push(`ANTHROPIC_API_KEY=${config.claudeKey}`);
  }

  if (config.googleKey) {
    lines.push(`GOOGLE_AI_API_KEY=${config.googleKey}`);
  }

  if (config.groqKey) {
    lines.push(`GROQ_API_KEY=${config.groqKey}`);
  }

  lines.push('');

  // Google Whisk
  lines.push('# Google Whisk Image Generation');
  if (config.whiskToken) {
    lines.push(`WHISK_API_TOKEN=${config.whiskToken}`);
  } else {
    lines.push('WHISK_API_TOKEN=');
  }
  lines.push('WHISK_IMAGE_MODEL=IMAGEN_3_5');
  lines.push('WHISK_CONCURRENCY=2');
  lines.push('WHISK_MIN_CONCURRENCY=2');
  lines.push('WHISK_MAX_CONCURRENCY=5');
  lines.push('');

  // Avatar Mode
  lines.push('# Avatar Generation Mode');
  lines.push('AVATAR_MODE=manual');
  lines.push('HEYGEN_AUDIO_SAMPLE_RATE=48000');
  lines.push('');

  // Remotion
  lines.push('# Remotion Rendering');
  lines.push('REMOTION_TIMEOUT_MS=300000');
  lines.push('REMOTION_CONCURRENCY=4');
  lines.push('REMOTION_BUNDLE_CACHE_DIR=./tmp/remotion-cache');
  lines.push('');

  // Browser automation (optional)
  lines.push('# Playwright Browser Automation');
  lines.push('DEFAULT_BROWSER=edge');
  lines.push('PLAYWRIGHT_USER_DATA_DIR=./playwright-data');
  lines.push('');

  return lines.join('\n');
}

/**
 * Write .env file to application directory
 */
export async function writeEnvFile(
  appDir: string,
  config: WizardConfig
): Promise<void> {
  const envPath = path.join(appDir, '.env');
  const content = generateEnvContent(config);

  return new Promise((resolve, reject) => {
    fs.writeFile(envPath, content, 'utf8', (err) => {
      if (err) {
        reject(new Error(`Failed to write .env file: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Create storage directories
 */
export async function createStorageDirectories(storagePath: string): Promise<void> {
  const directories = [
    storagePath,
    path.join(storagePath, 'images'),
    path.join(storagePath, 'avatars'),
    path.join(storagePath, 'videos'),
  ];

  for (const dir of directories) {
    await createDirectoryIfNotExists(dir);
  }
}

/**
 * Helper to create directory if it doesn't exist
 */
function createDirectoryIfNotExists(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, { recursive: true }, (err) => {
      if (err) {
        reject(new Error(`Failed to create directory ${dir}: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Validate storage path is writable
 */
export async function validateStoragePath(storagePath: string): Promise<boolean> {
  try {
    // Try to create the directory
    await createDirectoryIfNotExists(storagePath);

    // Try to write a test file
    const testFile = path.join(storagePath, '.write-test');
    await new Promise<void>((resolve, reject) => {
      fs.writeFile(testFile, 'test', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Clean up test file
    await new Promise<void>((resolve, reject) => {
      fs.unlink(testFile, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get disk space for a path
 */
export async function getDiskSpace(storagePath: string): Promise<{
  available: number;
  total: number;
}> {
  // This is a Windows-specific implementation using WMIC
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Get the drive letter (e.g., "C:")
    const drive = path.parse(storagePath).root.replace('\\', '');

    // Use WMIC to get disk space
    const { stdout } = await execAsync(
      `wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace,Size /format:list`
    );

    const freeMatch = stdout.match(/FreeSpace=(\d+)/);
    const totalMatch = stdout.match(/Size=(\d+)/);

    const available = freeMatch ? parseInt(freeMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;

    return { available, total };
  } catch (error) {
    return { available: 0, total: 0 };
  }
}
