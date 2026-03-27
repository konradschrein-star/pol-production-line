import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { saveBuffer, getDirectory } from '../storage/local';

const execAsync = promisify(exec);

/**
 * Thumbnail Generation API
 * Uses ffmpeg to extract frames from video files
 */

export interface ThumbnailOptions {
  /** Timestamp in seconds to extract frame from (default: 5) */
  timestamp?: number;
  /** Width of thumbnail in pixels (default: 640) */
  width?: number;
  /** Quality of JPEG (1-31, lower is better, default: 2) */
  quality?: number;
}

export interface ThumbnailResult {
  /** Absolute path to saved thumbnail */
  thumbnailPath: string;
  /** File size in bytes */
  sizeInBytes: number;
  /** Timestamp used for extraction */
  timestamp: number;
}

/**
 * Generate thumbnail from video file
 * @param videoPath - Absolute path to video file
 * @param jobId - Job ID for filename
 * @param options - Thumbnail generation options
 * @returns Result with thumbnail path and metadata
 */
export async function generateThumbnail(
  videoPath: string,
  jobId: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const {
    timestamp = 5,
    width = 640,
    quality = 2,
  } = options;

  console.log(`🖼️ [Thumbnail] Generating thumbnail for job ${jobId}`);
  console.log(`   Video: ${videoPath}`);
  console.log(`   Timestamp: ${timestamp}s`);

  try {
    // Validate video file exists
    if (!existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Check ffmpeg availability
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      throw new Error('ffmpeg is not installed or not in PATH');
    }

    // Create temp output path
    const tempDir = getDirectory('temp');
    const tempFilename = `thumbnail-${jobId}-${Date.now()}.jpg`;
    const tempPath = path.join(tempDir, tempFilename);

    // Build ffmpeg command
    // -ss: seek to timestamp
    // -i: input file
    // -vframes 1: extract 1 frame
    // -vf scale: resize maintaining aspect ratio
    // -q:v: quality (1-31, lower is better)
    const ffmpegCmd = [
      'ffmpeg',
      '-y', // Overwrite output file
      `-ss ${timestamp}`, // Seek to timestamp
      `-i "${videoPath}"`, // Input file
      '-vframes 1', // Extract 1 frame
      `-vf scale=${width}:-1`, // Scale width, maintain aspect ratio
      `-q:v ${quality}`, // JPEG quality
      `"${tempPath}"`, // Output file
    ].join(' ');

    console.log(`🎬 [Thumbnail] Running ffmpeg...`);

    // Execute ffmpeg
    const { stdout, stderr } = await execAsync(ffmpegCmd, {
      timeout: 30000, // 30 second timeout
    });

    // Check if file was created
    if (!existsSync(tempPath)) {
      console.error('ffmpeg stderr:', stderr);
      throw new Error('Thumbnail file was not created');
    }

    // Get file size
    const stats = await fs.stat(tempPath);
    const sizeInBytes = stats.size;

    console.log(`✅ [Thumbnail] Frame extracted: ${tempPath}`);
    console.log(`   Size: ${(sizeInBytes / 1024).toFixed(2)} KB`);

    // Move to permanent storage (images directory)
    const buffer = await fs.readFile(tempPath);
    const filename = `${jobId}-thumbnail.jpg`;
    const permanentPath = await saveBuffer(buffer, 'images', filename);

    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch (error) {
      console.warn(`⚠️ [Thumbnail] Could not delete temp file: ${tempPath}`);
    }

    console.log(`✅ [Thumbnail] Thumbnail saved: ${permanentPath}`);

    return {
      thumbnailPath: permanentPath,
      sizeInBytes,
      timestamp,
    };

  } catch (error) {
    console.error(`❌ [Thumbnail] Generation failed:`, error);

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        throw new Error('ffmpeg not found. Please install ffmpeg.');
      }
      if (error.message.includes('timeout')) {
        throw new Error('Thumbnail generation timed out after 30 seconds');
      }
    }

    throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate thumbnail with retry logic
 * Attempts generation up to 3 times with different timestamps if failed
 * @param videoPath - Absolute path to video file
 * @param jobId - Job ID for filename
 * @param options - Thumbnail generation options
 * @returns Result with thumbnail path and metadata
 */
export async function generateThumbnailWithRetry(
  videoPath: string,
  jobId: string,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const maxRetries = 3;
  const timestamps = [
    options.timestamp || 5, // User-specified or default
    3, // Try 3 seconds
    1, // Try 1 second
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await generateThumbnail(videoPath, jobId, {
        ...options,
        timestamp: timestamps[i],
      });

      if (i > 0) {
        console.log(`✅ [Thumbnail] Successfully generated on retry ${i + 1}`);
      }

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️ [Thumbnail] Attempt ${i + 1}/${maxRetries} failed:`, lastError.message);

      if (i < maxRetries - 1) {
        console.log(`   Retrying with timestamp ${timestamps[i + 1]}s...`);
      }
    }
  }

  throw new Error(`Thumbnail generation failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Validate video file for thumbnail generation
 * Checks if video exists and has sufficient duration
 * @param videoPath - Absolute path to video file
 * @param requiredDuration - Minimum duration in seconds (default: 5)
 * @returns true if valid, false otherwise
 */
export async function validateVideoForThumbnail(
  videoPath: string,
  requiredDuration: number = 5
): Promise<boolean> {
  try {
    // Check file exists
    if (!existsSync(videoPath)) {
      return false;
    }

    // Get video duration using ffprobe
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const { stdout } = await execAsync(cmd, { timeout: 10000 });

    const duration = parseFloat(stdout.trim());

    if (isNaN(duration) || duration < requiredDuration) {
      console.warn(`⚠️ [Thumbnail] Video too short: ${duration}s (required: ${requiredDuration}s)`);
      return false;
    }

    return true;

  } catch (error) {
    console.error(`❌ [Thumbnail] Validation failed:`, error);
    return false;
  }
}
