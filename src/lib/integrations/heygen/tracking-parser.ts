/**
 * Parser for HeyGen automation tracking.json
 * Reads and validates status/progress from Python automation script
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Tracking status values from Python automation
 */
export type TrackingStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Structure of tracking.json from Python automation
 */
export interface TrackingData {
  status: TrackingStatus;
  progress: number; // 0-100
  video_path: string | null; // Local path to downloaded MP4
  error: string | null; // Error message if failed
  timestamp: string; // ISO 8601 timestamp
}

/**
 * Structure of ui_queue.json for Python automation input
 */
export interface QueueData {
  text: string; // Avatar script text
  avatar: string; // Avatar name (e.g., "Angela_public")
  quality: '720p' | '1080p';
  fps: '25' | '30' | '60';
}

/**
 * Read and parse tracking.json
 */
export async function readTracking(trackingPath: string): Promise<TrackingData | null> {
  try {
    const content = await fs.readFile(trackingPath, 'utf-8');
    const data = JSON.parse(content) as TrackingData;

    // Validate required fields
    if (!data.status || typeof data.progress !== 'number') {
      console.warn('⚠️  Invalid tracking.json structure:', data);
      return null;
    }

    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist yet - normal during initial submission
      return null;
    }

    console.error('❌ Error reading tracking.json:', error);
    return null;
  }
}

/**
 * Write ui_queue.json to trigger Python automation
 */
export async function writeQueue(queuePath: string, data: QueueData): Promise<void> {
  try {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(queuePath, content, 'utf-8');
    console.log(`✅ Queue file written: ${queuePath}`);
  } catch (error) {
    console.error('❌ Error writing ui_queue.json:', error);
    throw new Error(`Failed to write queue file: ${error}`);
  }
}

/**
 * Check if automation is currently running (based on tracking status)
 */
export function isRunning(tracking: TrackingData | null): boolean {
  if (!tracking) return false;
  return tracking.status === 'queued' || tracking.status === 'processing';
}

/**
 * Check if automation completed successfully
 */
export function isCompleted(tracking: TrackingData | null): boolean {
  return tracking?.status === 'completed' && tracking.video_path !== null;
}

/**
 * Check if automation failed
 */
export function isFailed(tracking: TrackingData | null): boolean {
  return tracking?.status === 'failed';
}

/**
 * Get default queue data with sensible defaults
 */
export function getDefaultQueueData(scriptText: string): QueueData {
  return {
    text: scriptText,
    avatar: process.env.HEYGEN_DEFAULT_AVATAR || 'Angela_public',
    quality: '720p', // Balance speed vs quality
    fps: '30' // Standard frame rate
  };
}

/**
 * Get automation directory path
 */
export function getAutomationDir(): string {
  return path.join(process.cwd(), 'integrations', 'heygen-automation');
}

/**
 * Get tracking.json path
 */
export function getTrackingPath(): string {
  return path.join(getAutomationDir(), 'tracking.json');
}

/**
 * Get ui_queue.json path
 */
export function getQueuePath(): string {
  return path.join(getAutomationDir(), 'ui_queue.json');
}

/**
 * Clean up tracking/queue files (optional - use between jobs)
 */
export async function cleanupFiles(): Promise<void> {
  const trackingPath = getTrackingPath();
  const queuePath = getQueuePath();

  try {
    await fs.unlink(trackingPath).catch(() => {}); // Ignore if doesn't exist
    await fs.unlink(queuePath).catch(() => {});
    console.log('✅ Cleaned up automation files');
  } catch (error) {
    console.warn('⚠️  Error cleaning up files:', error);
  }
}
