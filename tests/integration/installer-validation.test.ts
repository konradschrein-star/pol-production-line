/**
 * Installer Validation Test Suite
 *
 * Comprehensive validation for Obsidian News Desk installer.
 * Tests bundled dependencies, configuration, E2E production, and performance.
 *
 * CRITICAL: This test suite validates the entire installer package before distribution.
 * All tests must pass on a clean Windows install.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// ============================================
// Section A: Bundled Dependencies
// ============================================

describe('Section A: Bundled Dependencies', () => {
  const projectRoot = path.resolve(process.cwd());

  it('should have FFmpeg binary in resources/bin', () => {
    const platform = process.platform;
    const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffmpegPath = path.join(projectRoot, 'resources', 'bin', platform, ffmpegName);

    // Check if file exists
    const exists = fs.existsSync(ffmpegPath);
    expect(exists).toBe(true);

    if (exists) {
      // Check if it's a regular file (not directory)
      const stats = fs.statSync(ffmpegPath);
      expect(stats.isFile()).toBe(true);
    }
  });

  it('should have FFprobe binary in resources/bin', () => {
    const platform = process.platform;
    const ffprobeName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
    const ffprobePath = path.join(projectRoot, 'resources', 'bin', platform, ffprobeName);

    // Check if file exists
    const exists = fs.existsSync(ffprobePath);
    expect(exists).toBe(true);

    if (exists) {
      // Check if it's a regular file (not directory)
      const stats = fs.statSync(ffprobePath);
      expect(stats.isFile()).toBe(true);
    }
  });

  it('should have Node.js runtime in resources/node', () => {
    const platform = process.platform;
    const nodeName = platform === 'win32' ? 'node.exe' : 'node';
    const nodePath = path.join(projectRoot, 'resources', 'node', nodeName);

    // Check if file exists
    const exists = fs.existsSync(nodePath);
    expect(exists).toBe(true);

    if (exists) {
      // Check if it's a regular file (not directory)
      const stats = fs.statSync(nodePath);
      expect(stats.isFile()).toBe(true);
    }
  });

  it('should have Chrome extension manifest', () => {
    const manifestPath = path.join(projectRoot, 'chrome-extension', 'manifest.json');

    // Check if file exists
    const exists = fs.existsSync(manifestPath);
    expect(exists).toBe(true);

    if (exists) {
      // Validate manifest structure
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('version');
      expect(manifest).toHaveProperty('manifest_version');
    }
  });

  it('should have working FFmpeg executable', () => {
    const platform = process.platform;
    const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffmpegPath = path.join(projectRoot, 'resources', 'bin', platform, ffmpegName);

    if (!fs.existsSync(ffmpegPath)) {
      // Skip if binary doesn't exist (already tested above)
      return;
    }

    try {
      const output = execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8', stdio: 'pipe' });
      expect(output).toContain('ffmpeg version');
    } catch (error) {
      throw new Error(`FFmpeg executable failed to run: ${error}`);
    }
  });

  it('should have working FFprobe executable', () => {
    const platform = process.platform;
    const ffprobeName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
    const ffprobePath = path.join(projectRoot, 'resources', 'bin', platform, ffprobeName);

    if (!fs.existsSync(ffprobePath)) {
      // Skip if binary doesn't exist (already tested above)
      return;
    }

    try {
      const output = execSync(`"${ffprobePath}" -version`, { encoding: 'utf8', stdio: 'pipe' });
      expect(output).toContain('ffprobe version');
    } catch (error) {
      throw new Error(`FFprobe executable failed to run: ${error}`);
    }
  });

  it('should have working Node.js bundled runtime', () => {
    const platform = process.platform;
    const nodeName = platform === 'win32' ? 'node.exe' : 'node';
    const nodePath = path.join(projectRoot, 'resources', 'node', nodeName);

    if (!fs.existsSync(nodePath)) {
      // Skip if binary doesn't exist (already tested above)
      return;
    }

    try {
      const output = execSync(`"${nodePath}" --version`, { encoding: 'utf8', stdio: 'pipe' });
      const version = output.trim();
      const major = parseInt(version.slice(1).split('.')[0], 10);

      expect(major).toBeGreaterThanOrEqual(20);
    } catch (error) {
      throw new Error(`Node.js bundled runtime failed to run: ${error}`);
    }
  });
});

// ============================================
// Section B: Configuration System
// ============================================

describe('Section B: Configuration System', () => {
  const projectRoot = path.resolve(process.cwd());
  let config: any;
  let storageRoot: string;

  it('should initialize config without errors', async () => {
    // Import config module
    const configModule = await import('@/lib/config/index');
    config = configModule.default;

    expect(config).toBeDefined();
    expect(config).toHaveProperty('storage');
    expect(config).toHaveProperty('database');
    expect(config).toHaveProperty('redis');
  });

  it('should auto-detect storage root', () => {
    expect(config.storage.root).toBeDefined();
    expect(typeof config.storage.root).toBe('string');
    expect(config.storage.root.length).toBeGreaterThan(0);

    storageRoot = config.storage.root;

    // Check if path is absolute
    expect(path.isAbsolute(storageRoot)).toBe(true);
  });

  it('should create all storage subdirectories', () => {
    const subdirs = ['images', 'avatars', 'videos', 'footage'];

    subdirs.forEach(subdir => {
      const dirPath = path.join(storageRoot, subdir);

      // Create if doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Verify it exists
      expect(fs.existsSync(dirPath)).toBe(true);

      // Verify it's a directory
      const stats = fs.statSync(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  it('should validate write permissions for all storage directories', () => {
    const subdirs = ['images', 'avatars', 'videos', 'footage'];

    subdirs.forEach(subdir => {
      const dirPath = path.join(storageRoot, subdir);
      const testFile = path.join(dirPath, `.write-test-${Date.now()}`);

      try {
        // Try to write a test file
        fs.writeFileSync(testFile, 'test', 'utf8');

        // Try to read it back
        const content = fs.readFileSync(testFile, 'utf8');
        expect(content).toBe('test');

        // Clean up
        fs.unlinkSync(testFile);
      } catch (error) {
        throw new Error(`No write permissions for ${dirPath}: ${error}`);
      }
    });
  });

  it('should connect to PostgreSQL database', async () => {
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'obsidian_news_desk',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

    try {
      const result = await pool.query('SELECT 1 as value');
      expect(result.rows[0].value).toBe(1);
    } finally {
      await pool.end();
    }
  });

  it('should connect to Redis', async () => {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const result = await redis.ping();
      expect(result).toBe('PONG');
    } finally {
      redis.disconnect();
    }
  });

  it('should have .env file with required variables', () => {
    const envPath = path.join(projectRoot, '.env');
    expect(fs.existsSync(envPath)).toBe(true);

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'DATABASE_URL',
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'REDIS_HOST',
      'REDIS_PORT',
    ];

    requiredVars.forEach(varName => {
      const regex = new RegExp(`^${varName}=`, 'm');
      expect(envContent).toMatch(regex);
    });
  });
});

// ============================================
// Section C: End-to-End Production
// ============================================

describe('Section C: End-to-End Production', () => {
  let testJobId: string;
  let pool: Pool;
  const apiBaseUrl = 'http://localhost:8347';

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'obsidian_news_desk',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

    // Ensure database connection
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    // Cleanup test job unless TEST_KEEP_ARTIFACTS is set
    if (testJobId && process.env.TEST_KEEP_ARTIFACTS !== 'true') {
      try {
        // Delete scenes first (foreign key constraint)
        await pool.query('DELETE FROM news_scenes WHERE job_id = $1', [testJobId]);
        // Delete job
        await pool.query('DELETE FROM news_jobs WHERE id = $1', [testJobId]);

        // Delete test images from storage
        const config = await import('@/lib/config/index');
        const storageRoot = config.default.storage.root;
        const imagesDir = path.join(storageRoot, 'images');

        if (fs.existsSync(imagesDir)) {
          const files = fs.readdirSync(imagesDir);
          files.forEach(file => {
            if (file.includes(testJobId)) {
              fs.unlinkSync(path.join(imagesDir, file));
            }
          });
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }

    await pool.end();
  });

  it('should create job via API', async () => {
    const testScriptPath = path.join(process.cwd(), 'tests', 'resources', 'test-script.txt');
    expect(fs.existsSync(testScriptPath)).toBe(true);

    const testScript = fs.readFileSync(testScriptPath, 'utf8');

    // Create job via API
    const response = await fetch(`${apiBaseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawScript: testScript }),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.status).toBe('pending');

    testJobId = data.id;
  });

  it('should complete script analysis', async () => {
    expect(testJobId).toBeDefined();

    // Poll for status change (max 2 minutes)
    const maxWaitTime = 120000; // 2 minutes
    const pollInterval = 2000; // 2 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      const status = result.rows[0]?.status;

      if (status === 'generating_images' || status === 'review_assets' || status === 'completed') {
        // Analysis complete
        expect(['generating_images', 'review_assets', 'completed']).toContain(status);
        return;
      }

      if (status === 'failed') {
        throw new Error('Job failed during analysis');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Script analysis timed out after 2 minutes');
  }, 130000); // 130s timeout for this test

  it('should generate scenes with valid schema', async () => {
    const result = await pool.query('SELECT avatar_script FROM news_jobs WHERE id = $1', [testJobId]);
    const avatarScript = result.rows[0]?.avatar_script;

    expect(avatarScript).toBeDefined();
    expect(typeof avatarScript).toBe('string');
    expect(avatarScript.length).toBeGreaterThan(0);

    // Check scenes
    const scenesResult = await pool.query(
      'SELECT id, image_prompt, ticker_headline, scene_order FROM news_scenes WHERE job_id = $1 ORDER BY scene_order',
      [testJobId]
    );

    expect(scenesResult.rows.length).toBeGreaterThan(0);

    scenesResult.rows.forEach((scene, index) => {
      expect(scene.id).toBeDefined();
      expect(scene.image_prompt).toBeDefined();
      expect(scene.ticker_headline).toBeDefined();
      expect(scene.scene_order).toBe(index);
    });
  });

  it('should process image generation for all scenes', async () => {
    expect(testJobId).toBeDefined();

    // Poll for status change (max 25 minutes for Whisk API)
    const maxWaitTime = 1500000; // 25 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
      const status = result.rows[0]?.status;

      if (status === 'review_assets' || status === 'completed') {
        // Image generation complete
        expect(['review_assets', 'completed']).toContain(status);
        return;
      }

      if (status === 'failed') {
        throw new Error('Job failed during image generation');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Image generation timed out after 25 minutes');
  }, 1600000); // 1600s timeout for this test

  it('should write all images to storage', async () => {
    const scenesResult = await pool.query(
      'SELECT id, image_url FROM news_scenes WHERE job_id = $1',
      [testJobId]
    );

    expect(scenesResult.rows.length).toBeGreaterThan(0);

    scenesResult.rows.forEach(scene => {
      expect(scene.image_url).toBeDefined();
      expect(typeof scene.image_url).toBe('string');

      // Check if file exists
      if (scene.image_url && !scene.image_url.startsWith('http')) {
        expect(fs.existsSync(scene.image_url)).toBe(true);

        // Check if it's a valid image file
        const stats = fs.statSync(scene.image_url);
        expect(stats.size).toBeGreaterThan(0);
      }
    });
  });

  it('should maintain correct database state transitions', async () => {
    const result = await pool.query(
      'SELECT status, created_at, updated_at FROM news_jobs WHERE id = $1',
      [testJobId]
    );

    const job = result.rows[0];
    expect(job).toBeDefined();
    expect(job.status).toBe('review_assets');

    // Verify updated_at > created_at
    expect(new Date(job.updated_at).getTime()).toBeGreaterThan(new Date(job.created_at).getTime());
  });

  it('should reach review_assets state successfully', async () => {
    const result = await pool.query('SELECT status FROM news_jobs WHERE id = $1', [testJobId]);
    expect(result.rows[0].status).toBe('review_assets');
  });
});

// ============================================
// Section D: Performance Benchmarks
// ============================================

describe('Section D: Performance Benchmarks', () => {
  it('should have at least 4 CPU cores', () => {
    const cores = os.cpus().length;
    expect(cores).toBeGreaterThanOrEqual(4);
  });

  it('should have at least 8GB RAM', () => {
    const totalMemoryGB = Math.round(os.totalmem() / (1024 ** 3));
    expect(totalMemoryGB).toBeGreaterThanOrEqual(8);
  });

  it('should have at least 10GB free disk space', () => {
    const config = require('@/lib/config/index').default;
    const storageRoot = config.storage.root;

    let freeSpaceGB: number;

    if (process.platform === 'win32') {
      const drive = path.parse(storageRoot).root;
      const output = execSync(`wmic logicaldisk where "DeviceID='${drive.replace('\\', '')}'" get FreeSpace`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const lines = output.trim().split('\n').filter(line => line.trim() && !line.includes('FreeSpace'));
      const freeSpaceBytes = parseInt(lines[0].trim(), 10);
      freeSpaceGB = Math.round(freeSpaceBytes / (1024 ** 3));
    } else {
      const output = execSync(`df -k "${storageRoot}" | tail -1 | awk '{print $4}'`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      const freeSpaceKB = parseInt(output.trim(), 10);
      freeSpaceGB = Math.round(freeSpaceKB / (1024 ** 2));
    }

    expect(freeSpaceGB).toBeGreaterThanOrEqual(10);
  });

  it('should have Node.js version >= 20.0.0', () => {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  it('should have Docker containers running', () => {
    try {
      const output = execSync('docker ps --format "{{.Names}}"', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const containers = output.trim().split('\n');
      const hasPostgres = containers.some(name => name.includes('postgres'));
      const hasRedis = containers.some(name => name.includes('redis'));

      expect(hasPostgres).toBe(true);
      expect(hasRedis).toBe(true);
    } catch (error) {
      throw new Error('Docker containers are not running');
    }
  });
});
