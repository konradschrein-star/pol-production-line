import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * Local file storage manager
 * Replaces R2 cloud storage with local filesystem
 *
 * Base directory: C:\Users\konra\ObsidianNewsDesk\
 * - images/ - Scene background images
 * - avatars/ - HeyGen avatar MP4 files
 * - videos/ - Final rendered videos
 * - temp/ - Temporary processing files
 */

// Base directory for all stored files
const BASE_DIR = path.join('C:', 'Users', 'konra', 'ObsidianNewsDesk');

const DIRS = {
  images: path.join(BASE_DIR, 'images'),
  avatars: path.join(BASE_DIR, 'avatars'),
  videos: path.join(BASE_DIR, 'videos'),
  temp: path.join(BASE_DIR, 'temp'),
};

/**
 * Initialize storage directories
 * Call on app startup to ensure all directories exist
 */
export async function initStorage(): Promise<void> {
  try {
    for (const [category, dir] of Object.entries(DIRS)) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ [Storage] ${category} directory ready: ${dir}`);
    }
    console.log(`✅ [Storage] Local storage initialized: ${BASE_DIR}`);
  } catch (error) {
    console.error('❌ [Storage] Initialization failed:', error);
    throw new Error(`Storage initialization failed: ${error.message}`);
  }
}

/**
 * Save file from source path to local storage
 * @param sourcePath - Path to source file
 * @param category - Storage category ('images' | 'avatars' | 'videos')
 * @param filename - Destination filename
 * @returns Absolute path to saved file
 */
export async function saveFile(
  sourcePath: string,
  category: 'images' | 'avatars' | 'videos',
  filename: string
): Promise<string> {
  try {
    const destPath = path.join(DIRS[category], filename);

    // Ensure source file exists
    if (!existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    // Copy file
    await fs.copyFile(sourcePath, destPath);

    console.log(`✅ [Storage] File saved: ${category}/${filename}`);
    console.log(`   Source: ${sourcePath}`);
    console.log(`   Destination: ${destPath}`);

    return destPath;
  } catch (error) {
    console.error(`❌ [Storage] Failed to save file ${filename}:`, error);
    throw new Error(`Failed to save file: ${error.message}`);
  }
}

/**
 * Save file from buffer to local storage
 * @param buffer - File buffer
 * @param category - Storage category ('images' | 'avatars' | 'videos')
 * @param filename - Destination filename
 * @returns Absolute path to saved file
 */
export async function saveBuffer(
  buffer: Buffer,
  category: 'images' | 'avatars' | 'videos',
  filename: string
): Promise<string> {
  try {
    const destPath = path.join(DIRS[category], filename);

    // Write buffer to file
    await fs.writeFile(destPath, buffer);

    console.log(`✅ [Storage] Buffer saved: ${category}/${filename}`);
    console.log(`   Destination: ${destPath}`);
    console.log(`   Size: ${buffer.length} bytes`);

    return destPath;
  } catch (error) {
    console.error(`❌ [Storage] Failed to save buffer ${filename}:`, error);
    throw new Error(`Failed to save buffer: ${error.message}`);
  }
}

/**
 * Delete file from local storage
 * @param filePath - Absolute path to file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (!existsSync(filePath)) {
      console.warn(`⚠️ [Storage] File does not exist: ${filePath}`);
      return;
    }

    await fs.unlink(filePath);
    console.log(`✅ [Storage] File deleted: ${filePath}`);
  } catch (error) {
    // Ignore ENOENT errors (file already gone)
    if (error.code !== 'ENOENT') {
      console.error(`❌ [Storage] Failed to delete file:`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

/**
 * Check if file exists in local storage
 * @param filePath - Absolute path to file
 * @returns true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get directory path for a category
 * @param category - Storage category
 * @returns Absolute directory path
 */
export function getDirectory(category: 'images' | 'avatars' | 'videos' | 'temp'): string {
  return DIRS[category];
}

/**
 * Get base storage directory
 * @returns Base directory path
 */
export function getBaseDirectory(): string {
  return BASE_DIR;
}

/**
 * Check if storage is initialized
 * @returns true if all directories exist
 */
export function isStorageInitialized(): boolean {
  return Object.values(DIRS).every(dir => existsSync(dir));
}
