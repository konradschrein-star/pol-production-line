import { execSync } from 'child_process';
import { join } from 'path';
import * as path from 'path';
import { readFileSync } from 'fs';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * CRITICAL FIX #23: Verify FFmpeg/FFprobe are installed and working
 * Should be called at worker/service startup to fail fast
 */
export function verifyFFmpegInstallation(): { success: boolean; version: string; error?: string } {
  try {
    const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf-8' });
    const ffprobeVersion = execSync('ffprobe -version', { encoding: 'utf-8' });

    const versionMatch = ffmpegVersion.match(/ffmpeg version ([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    console.log(`✅ [Video Utils] FFmpeg ${version} detected and operational`);
    return { success: true, version };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ [Video Utils] FFmpeg/FFprobe not found or not working:`, errorMsg);
    return {
      success: false,
      version: 'not found',
      error: `FFmpeg is not installed or not in PATH. Video processing will fail. Error: ${errorMsg}`
    };
  }
}

/**
 * Get comprehensive video metadata using ffprobe (server-side only)
 *
 * @param videoUrl - Path to video file
 * @returns Video metadata including dimensions and aspect ratio
 */
export async function getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  try {
    // Convert various URL formats to file paths that ffprobe can understand
    let filePath = videoUrl;

    if (videoUrl.startsWith('file:///')) {
      filePath = videoUrl.replace('file:///', '');
    } else if (videoUrl.startsWith('http://localhost:9000')) {
      // Convert HTTP asset server URL back to file path
      const ASSETS_ROOT = process.env.LOCAL_STORAGE_ROOT || 'C:\\Users\\konra\\ObsidianNewsDesk';
      const urlPath = videoUrl.substring('http://localhost:9000'.length);
      filePath = path.join(ASSETS_ROOT, urlPath);
    }

    // Get duration
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const durationOutput = execSync(durationCmd, {
      encoding: 'utf-8',
      timeout: 30000  // Bug #33 fix: 30s timeout to prevent hangs
    });
    const duration = parseFloat(durationOutput.trim());

    // Get width and height
    const dimensionsCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filePath}"`;
    const dimensionsOutput = execSync(dimensionsCmd, {
      encoding: 'utf-8',
      timeout: 30000  // Bug #33 fix: 30s timeout to prevent hangs
    });
    const [width, height] = dimensionsOutput.trim().split(',').map(Number);

    const aspectRatio = width / height;

    console.log(`🎥 [Video Utils] Video metadata:`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Dimensions: ${width}x${height}`);
    console.log(`   Aspect Ratio: ${aspectRatio.toFixed(4)} (${getAspectRatioName(aspectRatio)})`);
    console.log(`   Path: ${videoUrl}`);

    return { duration, width, height, aspectRatio };
  } catch (error) {
    // CRITICAL FIX #23: Fail loudly instead of silent fallback
    // Silent 60s fallback causes wrong pacing if actual duration differs
    console.error(`❌ [Video Utils] Failed to get video metadata:`, error);
    throw new Error(
      `FFprobe failed to read video metadata from "${videoUrl}". ` +
      `This is likely due to: (1) FFmpeg not installed, (2) corrupted video file, or (3) invalid file path. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get aspect ratio name for common ratios
 */
function getAspectRatioName(ratio: number): string {
  if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.01) return '9:16';
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 4/3) < 0.01) return '4:3';
  if (Math.abs(ratio - 21/9) < 0.01) return '21:9';
  return 'custom';
}

/**
 * Get audio/video duration from MP4 file using ffprobe (server-side only)
 *
 * @param videoUrl - Path to video file
 * @returns Duration in seconds
 */
export async function getVideoDuration(videoUrl: string): Promise<number> {
  try {
    // Convert various URL formats to file paths that ffprobe can understand
    let filePath = videoUrl;

    if (videoUrl.startsWith('file:///')) {
      filePath = videoUrl.replace('file:///', '');
    } else if (videoUrl.startsWith('http://localhost:9000')) {
      // Convert HTTP asset server URL back to file path
      const ASSETS_ROOT = process.env.LOCAL_STORAGE_ROOT || 'C:\\Users\\konra\\ObsidianNewsDesk';
      const urlPath = videoUrl.substring('http://localhost:9000'.length);
      filePath = path.join(ASSETS_ROOT, urlPath);
    } else if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://') && !path.isAbsolute(videoUrl)) {
      // Relative path - assume it's relative to public/ directory
      // __dirname is src/lib/remotion/, so go up 3 levels to project root
      const publicDir = join(__dirname, '../../../public');
      filePath = join(publicDir, videoUrl);
    }

    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout: 30000  // Bug #33 fix: 30s timeout to prevent hangs
    });
    const duration = parseFloat(output.trim());

    console.log(`🎥 [Video Utils] Video metadata:`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Path: ${videoUrl}`);

    return duration;
  } catch (error) {
    // CRITICAL FIX #23: Fail loudly instead of silent fallback
    // Silent 60s fallback causes wrong pacing if actual duration differs
    console.error(`❌ [Video Utils] Failed to get video duration:`, error);
    throw new Error(
      `FFprobe failed to read video duration from "${videoUrl}". ` +
      `This is likely due to: (1) FFmpeg not installed, (2) corrupted video file, or (3) invalid file path. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate MP4 file format and integrity (Bug #18 fix)
 * Checks:
 * - File has valid MP4 header (ftyp box)
 * - File is not corrupted or truncated
 * - FFprobe can successfully read metadata
 *
 * @param filePath - Path to MP4 file
 * @returns Validation result with error details if invalid
 */
export async function validateMP4Format(filePath: string): Promise<{
  valid: boolean;
  error?: string;
  sizeBytes?: number;
  durationSeconds?: number;
}> {
  try {
    // 1. Check file exists and has content
    const buffer = readFileSync(filePath);

    if (buffer.length === 0) {
      return {
        valid: false,
        error: 'File is empty (0 bytes)',
      };
    }

    // 2. Verify MP4 file signature (ftyp box)
    // MP4 files start with a ftyp (file type) box
    // Format: [size:4 bytes][type:4 bytes 'ftyp'][brand:4 bytes]
    if (buffer.length < 12) {
      return {
        valid: false,
        error: `File too small (${buffer.length} bytes) - likely corrupted`,
        sizeBytes: buffer.length,
      };
    }

    // Check for 'ftyp' signature at bytes 4-7
    const signature = buffer.toString('utf-8', 4, 8);
    if (signature !== 'ftyp') {
      return {
        valid: false,
        error: `Invalid MP4 header signature (expected 'ftyp', got '${signature}')`,
        sizeBytes: buffer.length,
      };
    }

    // 3. Verify FFprobe can read the file (comprehensive format validation)
    try {
      const command = `ffprobe -v error -show_entries format=duration,size -of json "${filePath}"`;
      const output = execSync(command, { encoding: 'utf-8', timeout: 30000 });
      const metadata = JSON.parse(output);

      if (!metadata.format || !metadata.format.duration) {
        return {
          valid: false,
          error: 'FFprobe could not extract video duration (file may be corrupted)',
          sizeBytes: buffer.length,
        };
      }

      const durationSeconds = parseFloat(metadata.format.duration);

      // Sanity check duration
      if (durationSeconds <= 0 || durationSeconds > 7200) { // Max 2 hours
        return {
          valid: false,
          error: `Invalid video duration: ${durationSeconds}s (expected 0-7200s)`,
          sizeBytes: buffer.length,
          durationSeconds,
        };
      }

      return {
        valid: true,
        sizeBytes: buffer.length,
        durationSeconds,
      };

    } catch (ffprobeError) {
      return {
        valid: false,
        error: `FFprobe validation failed: ${ffprobeError instanceof Error ? ffprobeError.message : String(ffprobeError)}`,
        sizeBytes: buffer.length,
      };
    }

  } catch (error) {
    return {
      valid: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
