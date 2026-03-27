/**
 * FFmpeg Path Resolution Module
 *
 * Intelligent fallback chain for locating FFmpeg binaries:
 * 1. Environment variable override (FFMPEG_PATH/FFPROBE_PATH)
 * 2. Bundled binaries (resources/bin/{platform}/)
 * 3. System PATH (global installation)
 * 4. npm packages (ffmpeg-static/ffprobe-static)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export interface ResolvedFFmpegPaths {
  ffmpeg: string;
  ffprobe: string;
  source: 'env-override' | 'bundled' | 'system' | 'npm-package';
}

const isWindows = process.platform === 'win32';
const ffmpegBinary = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
const ffprobeBinary = isWindows ? 'ffprobe.exe' : 'ffprobe';

/**
 * Resolves FFmpeg and FFprobe paths using fallback chain
 * @throws {Error} if no valid FFmpeg installation found
 */
function resolveFFmpegPaths(): ResolvedFFmpegPaths {
  // 1. ENV OVERRIDE (highest priority - for manual debugging)
  if (process.env.FFMPEG_PATH && process.env.FFPROBE_PATH) {
    if (fs.existsSync(process.env.FFMPEG_PATH) && fs.existsSync(process.env.FFPROBE_PATH)) {
      return {
        ffmpeg: process.env.FFMPEG_PATH,
        ffprobe: process.env.FFPROBE_PATH,
        source: 'env-override',
      };
    }
  }

  // 2. BUNDLED BINARIES (production default)
  const platformDir = isWindows ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  const bundledBase = path.join(process.cwd(), 'resources', 'bin', platformDir);
  const bundledFFmpeg = path.join(bundledBase, ffmpegBinary);
  const bundledFFprobe = path.join(bundledBase, ffprobeBinary);

  if (fs.existsSync(bundledFFmpeg) && fs.existsSync(bundledFFprobe)) {
    return {
      ffmpeg: bundledFFmpeg,
      ffprobe: bundledFFprobe,
      source: 'bundled',
    };
  }

  // 3. SYSTEM PATH (user has FFmpeg installed globally)
  try {
    const cmd = isWindows ? 'where' : 'which';
    const systemFFmpeg = execSync(`${cmd} ffmpeg`, { encoding: 'utf8' }).trim().split('\n')[0];
    const systemFFprobe = execSync(`${cmd} ffprobe`, { encoding: 'utf8' }).trim().split('\n')[0];

    if (systemFFmpeg && systemFFprobe) {
      return {
        ffmpeg: systemFFmpeg,
        ffprobe: systemFFprobe,
        source: 'system',
      };
    }
  } catch (e) {
    // Not in PATH, continue to fallback
  }

  // 4. NPM PACKAGE (development fallback)
  if (ffmpegStatic && ffprobeStatic.path) {
    return {
      ffmpeg: ffmpegStatic,
      ffprobe: ffprobeStatic.path,
      source: 'npm-package',
    };
  }

  // 5. NO FFMPEG FOUND - fail with actionable error
  throw new Error(
    'FFmpeg not found. Please:\n' +
    '  1. Run: npm run download-ffmpeg (automated)\n' +
    '  2. Install system FFmpeg:\n' +
    '     - Windows: choco install ffmpeg\n' +
    '     - macOS:   brew install ffmpeg\n' +
    '     - Linux:   sudo apt install ffmpeg\n' +
    '  3. Or set FFMPEG_PATH and FFPROBE_PATH in .env'
  );
}

// Cache result to avoid repeated filesystem checks
let cachedPaths: ResolvedFFmpegPaths | null = null;

/**
 * Gets FFmpeg paths (cached)
 * @returns Resolved FFmpeg and FFprobe paths with source
 * @throws {Error} if no valid FFmpeg installation found
 */
export function getFFmpegPaths(): ResolvedFFmpegPaths {
  if (!cachedPaths) {
    cachedPaths = resolveFFmpegPaths();

    // Log resolution in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FFmpeg Resolver] Using ${cachedPaths.source}`);
      console.log(`  - ffmpeg:  ${cachedPaths.ffmpeg}`);
      console.log(`  - ffprobe: ${cachedPaths.ffprobe}`);
    }
  }
  return cachedPaths;
}

/**
 * Force re-resolution (for testing)
 * Clears cached paths and forces next call to re-resolve
 */
export function clearFFmpegCache(): void {
  cachedPaths = null;
}

/**
 * Checks if FFmpeg is available without throwing error
 * @returns true if FFmpeg can be resolved
 */
export function isFFmpegAvailable(): boolean {
  try {
    getFFmpegPaths();
    return true;
  } catch {
    return false;
  }
}
