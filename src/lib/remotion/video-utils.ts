import { execSync } from 'child_process';
import { join } from 'path';
import * as path from 'path';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
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
    const durationOutput = execSync(durationCmd, { encoding: 'utf-8' });
    const duration = parseFloat(durationOutput.trim());

    // Get width and height
    const dimensionsCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filePath}"`;
    const dimensionsOutput = execSync(dimensionsCmd, { encoding: 'utf-8' });
    const [width, height] = dimensionsOutput.trim().split(',').map(Number);

    const aspectRatio = width / height;

    console.log(`🎥 [Video Utils] Video metadata:`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Dimensions: ${width}x${height}`);
    console.log(`   Aspect Ratio: ${aspectRatio.toFixed(4)} (${getAspectRatioName(aspectRatio)})`);
    console.log(`   Path: ${videoUrl}`);

    return { duration, width, height, aspectRatio };
  } catch (error) {
    console.error(`❌ [Video Utils] Failed to get video metadata:`, error);
    console.warn(`⚠️  [Video Utils] Using fallback metadata (60s, 1080x1920, 9:16)`);
    return { duration: 60, width: 1080, height: 1920, aspectRatio: 0.5625 };
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
    const output = execSync(command, { encoding: 'utf-8' });
    const duration = parseFloat(output.trim());

    console.log(`🎥 [Video Utils] Video metadata:`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Path: ${videoUrl}`);

    return duration;
  } catch (error) {
    console.error(`❌ [Video Utils] Failed to get video duration:`, error);
    // Fallback to reasonable default if ffprobe fails
    console.warn(`⚠️  [Video Utils] Using fallback duration of 60 seconds`);
    return 60;
  }
}
