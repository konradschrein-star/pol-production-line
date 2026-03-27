/**
 * Video Processing Type Definitions
 * For FFmpeg probe and metadata extraction
 */

export interface VideoMetadata {
  duration: number; // seconds
  resolution: string; // "1920x1080"
  width: number;
  height: number;
  codec: string; // "h264", "vp9", etc.
  fps: number;
  bitrate: number; // kbps
  fileSize: number; // bytes
  audioCodec?: string;
  audioSampleRate?: number;
}

export class FFmpegNotFoundError extends Error {
  constructor(message: string = 'FFmpeg not found. Please install FFmpeg or ensure ffmpeg-static is installed.') {
    super(message);
    this.name = 'FFmpegNotFoundError';
  }
}

export class FFmpegProbeError extends Error {
  public stderr: string;

  constructor(message: string, stderr: string = '') {
    super(message);
    this.name = 'FFmpegProbeError';
    this.stderr = stderr;
  }
}
