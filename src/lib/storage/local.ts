import fs from 'fs/promises';
import path from 'path';
import { existsSync, statfsSync } from 'fs';
import { getBaseStoragePath, makeRelativePath, resolveStoragePath } from './path-resolver';

/**
 * Local file storage manager
 * Replaces R2 cloud storage with local filesystem
 *
 * Base directory: Configured via LOCAL_STORAGE_ROOT env var or Electron config
 * Default: %USERPROFILE%\ObsidianNewsDesk (portable across user accounts)
 *
 * Subdirectories:
 * - images/ - Scene background images
 * - avatars/ - HeyGen avatar MP4 files
 * - videos/ - Final rendered videos
 * - footage/ - Stock video footage (Pexels)
 * - temp/ - Temporary processing files
 */

// Get base directory dynamically from path resolver
function getBaseDIR(): string {
  return getBaseStoragePath();
}

// Dynamic directory paths (resolved at runtime)
function getDIRS() {
  const BASE_DIR = getBaseDIR();
  return {
    images: path.join(BASE_DIR, 'images'),
    avatars: path.join(BASE_DIR, 'avatars'),
    videos: path.join(BASE_DIR, 'videos'),
    footage: path.join(BASE_DIR, 'footage'),
    temp: path.join(BASE_DIR, 'temp'),
  };
}

/**
 * Initialize storage directories
 * Call on app startup to ensure all directories exist
 */
export async function initStorage(): Promise<void> {
  try {
    const BASE_DIR = getBaseDIR();
    const DIRS = getDIRS();

    for (const [category, dir] of Object.entries(DIRS)) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ [Storage] ${category} directory ready: ${dir}`);
    }
    console.log(`✅ [Storage] Local storage initialized: ${BASE_DIR}`);
  } catch (error) {
    console.error('❌ [Storage] Initialization failed:', error);
    throw new Error(`Storage initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save file from source path to local storage
 * @param sourcePath - Path to source file
 * @param category - Storage category ('images' | 'avatars' | 'videos')
 * @param filename - Destination filename
 * @returns Relative path for database storage (e.g., "images/filename.jpg")
 */
export async function saveFile(
  sourcePath: string,
  category: 'images' | 'avatars' | 'videos' | 'footage',
  filename: string
): Promise<string> {
  try {
    const DIRS = getDIRS();
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

    // Return relative path for database storage
    return `${category}/${filename}`;
  } catch (error) {
    console.error(`❌ [Storage] Failed to save file ${filename}:`, error);
    throw new Error(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save file from buffer to local storage
 * @param buffer - File buffer
 * @param category - Storage category ('images' | 'avatars' | 'videos')
 * @param filename - Destination filename
 * @returns Relative path for database storage (e.g., "images/filename.jpg")
 */
export async function saveBuffer(
  buffer: Buffer,
  filename: string,
  category: 'images' | 'avatars' | 'videos' | 'footage'
): Promise<string> {
  try {
    const DIRS = getDIRS();
    const destPath = path.join(DIRS[category], filename);

    // Write buffer to file
    await fs.writeFile(destPath, buffer);

    console.log(`✅ [Storage] Buffer saved: ${category}/${filename}`);
    console.log(`   Destination: ${destPath}`);
    console.log(`   Size: ${buffer.length} bytes`);

    // Return relative path for database storage
    return `${category}/${filename}`;
  } catch (error) {
    console.error(`❌ [Storage] Failed to save buffer ${filename}:`, error);
    throw new Error(`Failed to save buffer: ${error instanceof Error ? error.message : String(error)}`);
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
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
      console.error(`❌ [Storage] Failed to delete file:`, error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`);
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
export function getDirectory(category: 'images' | 'avatars' | 'videos' | 'footage' | 'temp'): string {
  const DIRS = getDIRS();
  return DIRS[category];
}

/**
 * Get base storage directory
 * @returns Base directory path
 */
export function getBaseDirectory(): string {
  return getBaseDIR();
}

/**
 * Check if storage is initialized
 * @returns true if all directories exist
 */
export function isStorageInitialized(): boolean {
  const DIRS = getDIRS();
  return Object.values(DIRS).every(dir => existsSync(dir));
}

/**
 * Resolve a relative path to absolute file system path
 * Handles both relative and absolute paths for backward compatibility
 * @param relativePath - Path relative to storage root (e.g., "images/uuid.jpg")
 * @returns Absolute file system path
 */
export function resolveFilePath(relativePath: string): string {
  return resolveStoragePath(relativePath);
}

/**
 * Convert absolute path to relative path for database storage
 * @param absolutePath - Absolute file system path
 * @returns Relative path (e.g., "images/uuid.jpg")
 */
export function toRelativePath(absolutePath: string): string {
  return makeRelativePath(absolutePath);
}

/**
 * CRITICAL FIX #25: Check available disk space before render
 * @param minRequiredMB - Minimum required space in megabytes (default 500MB)
 * @returns Object with available space info and whether sufficient space exists
 */
export function checkDiskSpace(minRequiredMB: number = 500): {
  available: boolean;
  availableMB: number;
  requiredMB: number;
  path: string;
} {
  try {
    const BASE_DIR = getBaseDIR();

    // Use statfsSync to get filesystem stats (Node 19+)
    const stats = statfsSync(BASE_DIR);

    // Calculate available space in MB
    const availableBytes = stats.bavail * stats.bsize;
    const availableMB = Math.floor(availableBytes / (1024 * 1024));

    const available = availableMB >= minRequiredMB;

    if (!available) {
      console.warn(
        `⚠️  [Storage] Low disk space: ${availableMB}MB available, ${minRequiredMB}MB required at ${BASE_DIR}`
      );
    }

    return {
      available,
      availableMB,
      requiredMB: minRequiredMB,
      path: BASE_DIR,
    };
  } catch (error) {
    console.error(`❌ [Storage] Failed to check disk space:`, error);
    // If we can't check, assume there's space (fail open, not closed)
    return {
      available: true,
      availableMB: -1,
      requiredMB: minRequiredMB,
      path: getBaseDIR(),
    };
  }
}
