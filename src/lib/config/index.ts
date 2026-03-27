/**
 * Centralized Configuration System
 *
 * Auto-detects system resources and provides type-safe configuration.
 * Works on any machine without hardcoded paths.
 *
 * PHILOSOPHY: "Convention over configuration"
 * - Smart defaults that work out of the box
 * - Minimal required environment variables
 * - Clear error messages when something is missing
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { getFFmpegPaths } from '@/lib/video/ffmpeg-resolver';

/**
 * Get environment variable with helpful error message
 */
function requireEnv(key: string, description?: string): string {
  const value = process.env[key];
  if (!value) {
    const helpText = description ? `\n   ${description}` : '';
    throw new Error(
      `❌ Missing required environment variable: ${key}${helpText}\n\n` +
      `Please check your .env file or run: npm run setup`
    );
  }
  return value;
}

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get boolean environment variable
 */
function getBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get integer environment variable
 */
function getIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Auto-detect storage root directory
 * Priority:
 *   1. LOCAL_STORAGE_ROOT env var (explicit override)
 *   2. %USERPROFILE%\ObsidianNewsDesk (Windows standard)
 *   3. ~/ObsidianNewsDesk (Unix standard)
 */
function getStorageRoot(): string {
  // Check explicit override
  if (process.env.LOCAL_STORAGE_ROOT) {
    return process.env.LOCAL_STORAGE_ROOT;
  }

  // Auto-detect based on OS
  const homeDir = os.homedir();
  const storageDir = path.join(homeDir, 'ObsidianNewsDesk');

  return storageDir;
}

/**
 * Get machine identifier for logging/debugging
 */
function getMachineId(): string {
  return `${os.hostname()}-${os.platform()}-${os.arch()}`;
}

/**
 * Validate that a directory is writable
 */
function validateStorageAccess(dirPath: string): boolean {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Test write access
    const testFile = path.join(dirPath, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Resolve FFmpeg paths using intelligent fallback chain
 */
const ffmpegPaths = (() => {
  try {
    return getFFmpegPaths();
  } catch (error) {
    console.warn('⚠️  FFmpeg not found during initialization:', (error as Error).message);
    return { ffmpeg: '', ffprobe: '', source: 'none' as const };
  }
})();

/**
 * Main configuration object
 * Exported as singleton - validated on first import
 */
export const config = {
  // Environment
  env: {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
    isProduction: getEnv('NODE_ENV', 'development') === 'production',
  },

  // Machine Info
  machine: {
    id: getMachineId(),
    platform: os.platform(),
    arch: os.arch(),
    cpuCount: os.cpus().length,
    totalMemoryGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
    homeDir: os.homedir(),
    username: os.userInfo().username,
  },

  // Server Configuration
  server: {
    port: getIntEnv('PORT', 8347),
    host: getEnv('HOST', 'localhost'),
    baseUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:8347'),
    adminApiKey: getEnv('ADMIN_API_KEY', ''),
  },

  // Database Configuration
  database: {
    url: requireEnv('DATABASE_URL', 'Connection string for PostgreSQL database'),
    maxConnections: getIntEnv('DB_MAX_CONNECTIONS', 20),
    idleTimeoutMs: getIntEnv('DB_IDLE_TIMEOUT_MS', 30000),
  },

  // Redis Configuration
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getIntEnv('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    db: getIntEnv('REDIS_DB', 0),
    url: getEnv('REDIS_URL', 'redis://localhost:6379'),
  },

  // Storage Configuration
  storage: {
    root: getStorageRoot(),
    images: path.join(getStorageRoot(), 'images'),
    avatars: path.join(getStorageRoot(), 'avatars'),
    videos: path.join(getStorageRoot(), 'videos'),
    footage: path.join(getStorageRoot(), 'footage'),
    temp: path.join(getStorageRoot(), 'temp'),
  },

  // AI Provider Configuration
  ai: {
    provider: getEnv('AI_PROVIDER', 'openai') as 'openai' | 'anthropic' | 'google' | 'groq',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: getEnv('OPENAI_MODEL', 'gpt-4-turbo-preview'),
      maxTokens: getIntEnv('OPENAI_MAX_TOKENS', 4000),
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: getEnv('ANTHROPIC_MODEL', 'claude-3-opus-20240229'),
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
      model: getEnv('GOOGLE_MODEL', 'gemini-pro'),
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: getEnv('GROQ_MODEL', 'mixtral-8x7b-32768'),
    },
  },

  // Whisk API Configuration
  whisk: {
    apiToken: requireEnv('WHISK_API_TOKEN', 'Bearer token from Google Whisk API'),
    endpoint: 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage',
    concurrency: getIntEnv('WHISK_CONCURRENCY', 3),
    maxRetries: getIntEnv('WHISK_MAX_RETRIES', 3),
    retryDelayMs: getIntEnv('WHISK_RETRY_DELAY_MS', 5000),
    tokenRefreshEnabled: getBoolEnv('WHISK_TOKEN_REFRESH_ENABLED', false),
  },

  // Video Rendering Configuration
  video: {
    // Remotion settings
    fps: getIntEnv('VIDEO_FPS', 30),
    width: getIntEnv('VIDEO_WIDTH', 1920),
    height: getIntEnv('VIDEO_HEIGHT', 1080),
    codec: getEnv('VIDEO_CODEC', 'h264'),

    // Rendering performance
    concurrency: getIntEnv('RENDER_CONCURRENCY', 1), // Render one video at a time by default
    timeoutMs: getIntEnv('RENDER_TIMEOUT_MS', 1200000), // 20 minutes
    maxRetries: getIntEnv('RENDER_MAX_RETRIES', 2),

    // FFmpeg paths (resolved via intelligent fallback chain)
    // Resolution happens during config initialization
    // Priority: env override → bundled → system → npm packages
    ffmpegPath: ffmpegPaths.ffmpeg,
    ffprobePath: ffmpegPaths.ffprobe,
    ffmpegSource: ffmpegPaths.source, // Track which source was used for debugging
  },

  // Queue Configuration
  queue: {
    // Analyze queue
    analyzeConcurrency: getIntEnv('ANALYZE_CONCURRENCY', 1),

    // Images queue (Whisk API)
    imagesConcurrency: getIntEnv('IMAGES_CONCURRENCY', 3),
    imagesMaxRetries: getIntEnv('IMAGES_MAX_RETRIES', 3),

    // Render queue
    renderConcurrency: getIntEnv('RENDER_CONCURRENCY', 1),
    renderMaxRetries: getIntEnv('RENDER_MAX_RETRIES', 2),

    // Job retention
    retentionDays: getIntEnv('JOB_RETENTION_DAYS', 30),
    cleanupInterval: getIntEnv('CLEANUP_INTERVAL_HOURS', 24),
  },

  // Feature Flags
  features: {
    avatarAutomation: getBoolEnv('AVATAR_MODE', false), // Default: manual
    sceneBasedAnalysis: getBoolEnv('SCENE_BASED_ANALYSIS', false),
    transcriptionEnabled: getBoolEnv('TRANSCRIPTION_ENABLED', true),
    metricsEnabled: getBoolEnv('METRICS_ENABLED', true),
  },

  // Logging
  logging: {
    level: getEnv('LOG_LEVEL', 'info'), // debug, info, warn, error
    format: getEnv('LOG_FORMAT', 'pretty'), // pretty, json
    writeToFile: getBoolEnv('LOG_TO_FILE', false),
    logDir: path.join(getStorageRoot(), 'logs'),
  },
} as const;

/**
 * Validate configuration on startup
 * Throws descriptive errors if critical config is missing or invalid
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate AI provider is configured
  const provider = config.ai.provider;
  const providerKey = config.ai[provider]?.apiKey;

  if (!providerKey) {
    errors.push(
      `AI provider "${provider}" selected but ${provider.toUpperCase()}_API_KEY not set.\n` +
      `   Either set the API key or change AI_PROVIDER in .env`
    );
  }

  // Validate storage directories are accessible
  const storageRoot = config.storage.root;
  if (!validateStorageAccess(storageRoot)) {
    errors.push(
      `Cannot access storage directory: ${storageRoot}\n` +
      `   Check that the path exists and you have write permissions.\n` +
      `   Override with LOCAL_STORAGE_ROOT environment variable.`
    );
  }

  // Validate Whisk token format (should start with 'ya29.')
  const whiskToken = config.whisk.apiToken;
  if (!whiskToken.startsWith('ya29.') && !whiskToken.startsWith('Bearer ')) {
    errors.push(
      `WHISK_API_TOKEN appears invalid (should start with 'ya29.' or 'Bearer ').\n` +
      `   Get a fresh token from https://labs.google.com/whisk\n` +
      `   See docs/WHISK_TOKEN_REFRESH.md for instructions.`
    );
  }

  if (errors.length > 0) {
    throw new Error(
      '\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      '  ❌ Configuration Validation Failed\n' +
      '═══════════════════════════════════════════════════════════════\n\n' +
      errors.map(e => `  ${e}`).join('\n\n') +
      '\n\n' +
      '═══════════════════════════════════════════════════════════════\n' +
      '  Run "npm run setup" to fix configuration issues.\n' +
      '═══════════════════════════════════════════════════════════════\n'
    );
  }

  // Log successful validation in development
  if (config.env.isDevelopment) {
    console.log('✅ Configuration validated successfully');
    console.log(`   Machine: ${config.machine.id}`);
    console.log(`   Storage: ${config.storage.root}`);
    console.log(`   AI Provider: ${config.ai.provider}`);
    console.log(`   CPUs: ${config.machine.cpuCount}, RAM: ${config.machine.totalMemoryGB}GB`);
  }
}

/**
 * Create all required storage directories
 */
export function ensureStorageDirectories(): void {
  const dirs = [
    config.storage.root,
    config.storage.images,
    config.storage.avatars,
    config.storage.videos,
    config.storage.footage,
    config.storage.temp,
  ];

  if (config.logging.writeToFile) {
    dirs.push(config.logging.logDir);
  }

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
}

/**
 * Export helper to check if running in Docker
 */
export function isRunningInDocker(): boolean {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}
