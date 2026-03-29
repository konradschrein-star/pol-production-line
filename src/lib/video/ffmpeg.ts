import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { config } from '@/lib/config';
import { VideoMetadata, FFmpegNotFoundError, FFmpegProbeError } from './types';

/**
 * FFmpeg Utilities for Video Processing
 * Uses resolved FFmpeg paths from config (bundled → system → npm packages)
 */

/**
 * Safely parse FFmpeg frame rate fraction (e.g., "30/1" → 30, "24000/1001" → 23.976)
 * @param fractionString Frame rate as fraction string
 * @returns Numeric frame rate
 */
function parseFraction(fractionString: string): number {
  const parts = fractionString.split('/');
  const numerator = Number(parts[0]);
  const denominator = parts.length > 1 ? Number(parts[1]) : 1;

  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
    throw new Error(`Invalid fraction format: ${fractionString}`);
  }

  return numerator / denominator;
}

/**
 * Check if FFmpeg is available
 */
export function isFFmpegAvailable(): boolean {
  if (!config.video.ffmpegPath) return false;
  return existsSync(config.video.ffmpegPath);
}

/**
 * Get FFmpeg version string
 */
export async function getFFmpegVersion(): Promise<string> {
  if (!config.video.ffmpegPath) throw new FFmpegNotFoundError();

  return new Promise((resolve, reject) => {
    const process = spawn(config.video.ffmpegPath, ['-version']);

    let stdout = '';
    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get FFmpeg version'));
        return;
      }

      // Extract version from first line (e.g., "ffmpeg version 6.1.1")
      const match = stdout.match(/ffmpeg version (\S+)/);
      resolve(match ? match[1] : 'unknown');
    });
  });
}

/**
 * Probe video file and extract metadata
 * @param videoPath Absolute path to video file
 * @returns VideoMetadata object with duration, resolution, codec, etc.
 */
export async function probeVideo(videoPath: string): Promise<VideoMetadata> {
  if (!config.video.ffprobePath) throw new FFmpegNotFoundError();

  if (!existsSync(videoPath)) {
    throw new FFmpegProbeError(`Video file not found: ${videoPath}`);
  }

  // Use resolved ffprobe path from config
  const ffprobePath = config.video.ffprobePath;

  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_format',
      '-show_streams',
      '-of', 'json',
      videoPath
    ];

    const process = spawn(ffprobePath, args);

    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new FFmpegProbeError(`FFmpeg probe failed with code ${code}`, stderr));
        return;
      }

      try {
        const data = JSON.parse(stdout);

        // Find video stream
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        if (!videoStream) {
          reject(new FFmpegProbeError('No video stream found', stderr));
          return;
        }

        // Find audio stream (optional)
        const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

        // Extract metadata
        const metadata: VideoMetadata = {
          duration: parseFloat(data.format.duration),
          width: videoStream.width,
          height: videoStream.height,
          resolution: `${videoStream.width}x${videoStream.height}`,
          codec: videoStream.codec_name,
          fps: parseFraction(videoStream.r_frame_rate), // e.g., "30/1" → 30, "24000/1001" → 23.976
          bitrate: parseInt(data.format.bit_rate) / 1000, // bps → kbps
          fileSize: parseInt(data.format.size),
          audioCodec: audioStream?.codec_name,
          audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined
        };

        resolve(metadata);
      } catch (error) {
        reject(new FFmpegProbeError(`Failed to parse FFmpeg output: ${error}`, stderr));
      }
    });
  });
}
