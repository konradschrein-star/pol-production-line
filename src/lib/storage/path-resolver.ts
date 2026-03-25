/**
 * Unified Path Resolver
 *
 * Provides portable path resolution for the Obsidian News Desk storage system.
 * Eliminates hardcoded paths and enables cross-machine compatibility.
 *
 * Priority order:
 * 1. LOCAL_STORAGE_ROOT environment variable (highest - for Next.js standalone)
 * 2. Electron config getStoragePath() (for Electron app mode)
 * 3. Default: os.homedir()/ObsidianNewsDesk (portable fallback)
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

let cachedBasePath: string | null = null;

/**
 * Get the base storage directory for all Obsidian News Desk files.
 *
 * @returns Absolute path to storage root (e.g., C:\Users\konra\ObsidianNewsDesk)
 */
export function getBaseStoragePath(): string {
  // Return cached value if already resolved
  if (cachedBasePath) {
    return cachedBasePath;
  }

  let basePath: string;

  // Priority 1: Environment variable (for Next.js standalone mode)
  if (process.env.LOCAL_STORAGE_ROOT) {
    basePath = path.resolve(process.env.LOCAL_STORAGE_ROOT);
  }
  // Priority 2: Electron config (for Electron app mode)
  else if (typeof window !== 'undefined' && (window as any).electronAPI?.getStoragePath) {
    basePath = (window as any).electronAPI.getStoragePath();
  }
  // Priority 3: Portable default (user's home directory)
  else {
    basePath = path.join(os.homedir(), 'ObsidianNewsDesk');
  }

  // Ensure base directory exists
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  // Cache the resolved path
  cachedBasePath = basePath;

  return basePath;
}

/**
 * Resolve a relative or absolute path to an absolute storage path.
 *
 * Handles both formats for backward compatibility:
 * - Relative: "images/uuid-123.jpg" → "C:\...\ObsidianNewsDesk\images\uuid-123.jpg"
 * - Absolute: "C:\Users\konra\ObsidianNewsDesk\images\uuid-123.jpg" → returns as-is
 *
 * @param relativePath - Path relative to storage root or absolute path
 * @returns Absolute path to the file
 */
export function resolveStoragePath(relativePath: string): string {
  if (!relativePath) {
    return getBaseStoragePath();
  }

  // Check if path is already absolute
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }

  // Resolve relative path against base storage directory
  return path.join(getBaseStoragePath(), relativePath);
}

/**
 * Convert an absolute path to a relative path (for database storage).
 *
 * Examples:
 * - "C:\Users\konra\ObsidianNewsDesk\images\uuid.jpg" → "images/uuid.jpg"
 * - "images/uuid.jpg" → "images/uuid.jpg" (already relative, returns as-is)
 *
 * @param absolutePath - Absolute file system path
 * @returns Relative path from storage root
 */
export function makeRelativePath(absolutePath: string): string {
  if (!absolutePath) {
    return '';
  }

  // If already relative, return as-is
  if (!path.isAbsolute(absolutePath)) {
    return absolutePath;
  }

  const basePath = getBaseStoragePath();

  // Check if path is within storage directory
  if (absolutePath.startsWith(basePath)) {
    // Extract relative portion
    const relativePath = path.relative(basePath, absolutePath);
    // Normalize to forward slashes for cross-platform compatibility
    return relativePath.replace(/\\/g, '/');
  }

  // If path is outside storage directory, try to extract the subdirectory pattern
  // This handles legacy paths like "C:\Users\konra\ObsidianNewsDesk\images\uuid.jpg"
  const match = absolutePath.match(/[/\\](images|avatars|videos)[/\\](.+)$/);
  if (match) {
    return `${match[1]}/${match[2]}`.replace(/\\/g, '/');
  }

  // Fallback: return the basename only (not ideal, but safe)
  console.warn(`[path-resolver] Could not convert absolute path to relative: ${absolutePath}`);
  return path.basename(absolutePath);
}

/**
 * Ensure a subdirectory exists within the storage root.
 *
 * @param subdirectory - Subdirectory name (e.g., "images", "avatars", "videos")
 */
export function ensureStorageSubdirectory(subdirectory: string): void {
  const fullPath = path.join(getBaseStoragePath(), subdirectory);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

/**
 * Clear the cached base path (for testing purposes).
 */
export function clearPathCache(): void {
  cachedBasePath = null;
}
