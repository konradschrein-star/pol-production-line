import { existsSync, statSync, copyFileSync, mkdirSync, createReadStream, createWriteStream, renameSync } from 'fs';
import { join, basename, normalize, isAbsolute } from 'path';
import { resolveStoragePath } from '../storage/path-resolver';

export interface AssetValidationResult {
  valid: boolean;
  missingImages: string[];
  invalidPaths: string[];
  copyErrors: { sceneId: string; error: string }[];
  avatarError?: string;
  details: string[];
}

interface Scene {
  id: string;
  image_url: string;
  ticker_headline: string;
  scene_order: number;
}

/**
 * Prepare and validate all assets before rendering
 *
 * Handles both relative and absolute paths for backward compatibility:
 * - Relative: "images/scene123.jpg" → resolves via path-resolver
 * - Absolute: "C:\Users\konra\ObsidianNewsDesk\images\scene123.jpg" → uses directly
 *
 * This function:
 * 1. Validates all scene images exist at their storage paths
 * 2. Copies them to the public folder where Remotion can access them
 * 3. Validates the avatar file
 * 4. Returns detailed validation report
 */
export async function prepareRenderAssets(
  jobId: string,
  scenes: Scene[],
  avatarMp4Url: string
): Promise<AssetValidationResult> {
  console.log(`\n🔍 [ASSET-PREP] Starting validation for job ${jobId}`);
  console.log(`   Scenes to validate: ${scenes.length}`);
  console.log(`   Avatar: ${avatarMp4Url}`);

  const result: AssetValidationResult = {
    valid: true,
    missingImages: [],
    invalidPaths: [],
    copyErrors: [],
    details: [],
  };

  // Ensure public/images and public/avatars directories exist
  // Use try-catch to handle race conditions when multiple jobs run concurrently
  const publicImagesDir = join(process.cwd(), 'public', 'images');
  const publicAvatarsDir = join(process.cwd(), 'public', 'avatars');

  try {
    mkdirSync(publicImagesDir, { recursive: true });
    console.log(`📁 [ASSET-PREP] Ensured public images directory exists: ${publicImagesDir}`);
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw new Error(`Failed to create public images directory: ${error.message}`);
    }
  }

  try {
    mkdirSync(publicAvatarsDir, { recursive: true });
    console.log(`📁 [ASSET-PREP] Ensured public avatars directory exists: ${publicAvatarsDir}`);
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw new Error(`Failed to create public avatars directory: ${error.message}`);
    }
  }

  // 1. Validate and copy scene images
  console.log(`\n📸 [ASSET-PREP] Validating ${scenes.length} scene images...`);

  for (const scene of scenes) {
    const sceneId = scene.id;
    const imageUrl = scene.image_url;

    console.log(`\n   Scene ${scene.scene_order + 1}/${scenes.length} (ID: ${sceneId}):`);
    console.log(`   Source: ${imageUrl}`);

    // Check if image_url exists
    if (!imageUrl) {
      result.valid = false;
      result.missingImages.push(sceneId);
      result.details.push(`Scene ${sceneId}: image_url is NULL`);
      console.log(`   ❌ NULL image_url`);
      continue;
    }

    // Validate the source file exists
    const validationResult = await validateImageFile(imageUrl);
    if (!validationResult.valid) {
      result.valid = false;
      result.invalidPaths.push(imageUrl);
      result.details.push(`Scene ${sceneId}: ${validationResult.error}`);
      console.log(`   ❌ ${validationResult.error}`);
      continue;
    }

    console.log(`   ✅ File exists (${validationResult.sizeKB?.toFixed(2) || 'N/A'} KB)`);

    // Skip copying for data URLs (they're embedded, not files)
    if (imageUrl.startsWith('data:')) {
      console.log(`   ℹ️  Data URL - no copy needed`);
      result.details.push(`Scene ${sceneId}: Data URL (embedded)`);
      continue;
    }

    // Extract filename and copy to public folder
    try {
      const filename = extractFilename(imageUrl);

      if (!filename) {
        throw new Error('Could not extract filename from path');
      }

      const destPath = join(publicImagesDir, filename);

      // Copy file (overwrite if exists)
      await copyImageToPublic(imageUrl, destPath);

      console.log(`   ✅ Copied to: public/images/${filename}`);
      result.details.push(`Scene ${sceneId}: Prepared successfully (${validationResult.sizeKB?.toFixed(2)} KB)`);

    } catch (error) {
      result.valid = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.copyErrors.push({ sceneId, error: errorMsg });
      result.details.push(`Scene ${sceneId}: Copy failed - ${errorMsg}`);
      console.log(`   ❌ Copy failed: ${errorMsg}`);
    }
  }

  // 2. Validate and copy avatar file
  console.log(`\n🎭 [ASSET-PREP] Validating avatar file...`);
  console.log(`   Source: ${avatarMp4Url}`);

  const avatarValidation = await validateImageFile(avatarMp4Url, true);
  if (!avatarValidation.valid) {
    result.valid = false;
    result.avatarError = avatarValidation.error;
    result.details.push(`Avatar: ${avatarValidation.error}`);
    console.log(`   ❌ ${avatarValidation.error}`);
  } else {
    console.log(`   ✅ File exists (${avatarValidation.sizeKB?.toFixed(2)} KB)`);

    // Copy avatar to public folder
    try {
      const avatarFilename = extractFilename(avatarMp4Url);

      if (!avatarFilename) {
        throw new Error('Could not extract filename from avatar path');
      }

      const destPath = join(publicAvatarsDir, avatarFilename);

      await copyImageToPublic(avatarMp4Url, destPath);

      console.log(`   ✅ Copied to: public/avatars/${avatarFilename}`);

      // PRELOAD VERIFICATION: Ensure avatar is fully readable before rendering
      // This prevents Remotion timeouts during render by catching file access issues early
      console.log(`   🔍 Preloading avatar to verify accessibility...`);
      await preloadAvatarFile(destPath);
      console.log(`   ✅ Avatar preload successful - file is fully accessible`);

      result.details.push(`Avatar: Prepared and preloaded successfully`);
    } catch (error) {
      result.valid = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.avatarError = errorMsg;
      result.details.push(`Avatar: Copy failed - ${errorMsg}`);
      console.log(`   ❌ Copy failed: ${errorMsg}`);
    }
  }

  // Summary
  console.log(`\n📊 [ASSET-PREP] Validation Summary:`);
  console.log(`   Valid: ${result.valid ? '✅ YES' : '❌ NO'}`);
  console.log(`   Missing images: ${result.missingImages.length}`);
  console.log(`   Invalid paths: ${result.invalidPaths.length}`);
  console.log(`   Copy errors: ${result.copyErrors.length}`);

  if (result.avatarError) {
    console.log(`   Avatar error: ${result.avatarError}`);
  }

  return result;
}

/**
 * Copy image from storage location to public folder
 * Uses streaming for large files (>10MB) to prevent OOM errors (Bug #9 fix)
 * Uses atomic operations (write-to-temp-then-rename) to prevent corruption (Bug #11 fix)
 */
async function copyImageToPublic(sourcePath: string, destPath: string): Promise<void> {
  try {
    // Resolve source path (handles both relative and absolute)
    const resolvedSource = isAbsolute(sourcePath)
      ? sourcePath
      : resolveStoragePath(sourcePath);

    // ATOMIC OPERATION (Bug #11 fix): Write to temp file, then rename
    // This prevents corruption if multiple workers copy the same file concurrently
    const tempPath = `${destPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(7)}`;

    // Check file size to determine copy method
    const stats = statSync(resolvedSource);
    const fileSizeMB = stats.size / (1024 * 1024);
    const STREAMING_THRESHOLD_MB = 10;

    if (fileSizeMB > STREAMING_THRESHOLD_MB) {
      // Large file: Use streaming copy to avoid loading entire file into memory
      console.log(`   Using streaming copy for large file (${fileSizeMB.toFixed(2)} MB)...`);
      await streamCopyFile(resolvedSource, tempPath);
    } else {
      // Small file: Use synchronous copy (faster for small files)
      copyFileSync(resolvedSource, tempPath);
    }

    // Atomic rename: If destination already exists, this will overwrite it atomically
    // This is safe because rename is an atomic filesystem operation
    renameSync(tempPath, destPath);

  } catch (error) {
    throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Stream copy a file (for large files)
 * Prevents out-of-memory errors by using streams instead of loading entire file
 */
async function streamCopyFile(sourcePath: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath);

    readStream.on('error', (error) => {
      reject(new Error(`Read stream error: ${error.message}`));
    });

    writeStream.on('error', (error) => {
      reject(new Error(`Write stream error: ${error.message}`));
    });

    writeStream.on('finish', () => {
      resolve();
    });

    readStream.pipe(writeStream);
  });
}

/**
 * Validate that an image/video file exists and is readable
 * @param isAvatar - If true, uses more lenient size validation for test fixtures
 */
async function validateImageFile(path: string, isAvatar = false): Promise<{
  valid: boolean;
  error?: string;
  sizeKB?: number;
}> {
  // Handle data URLs (base64)
  if (path.startsWith('data:')) {
    return { valid: true };
  }

  // Handle HTTP URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return { valid: true };
  }

  // Resolve path using path resolver (handles both relative and absolute)
  const resolvedPath = isAbsolute(path)
    ? path // Legacy absolute path
    : resolveStoragePath(path); // New relative path (e.g., "images/file.jpg")

  const normalizedPath = normalize(resolvedPath);

  // Check file exists
  if (!existsSync(normalizedPath)) {
    return {
      valid: false,
      error: `File not found: ${normalizedPath}`,
    };
  }

  // Check it's a file (not directory)
  try {
    const stats = statSync(normalizedPath);

    if (!stats.isFile()) {
      return {
        valid: false,
        error: `Path is not a file: ${normalizedPath}`,
      };
    }

    // Check file size (warn if 0 bytes or suspiciously small)
    const sizeKB = stats.size / 1024;

    if (stats.size === 0) {
      return {
        valid: false,
        error: `File is empty (0 bytes): ${normalizedPath}`,
      };
    }

    // Validate file extension (unless it's an avatar which may be .mp4)
    if (!isAvatar) {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const hasValidExtension = validExtensions.some(ext => normalizedPath.toLowerCase().endsWith(ext));

      if (!hasValidExtension) {
        return {
          valid: false,
          error: `Invalid file extension. Expected: ${validExtensions.join(', ')}. Path: ${normalizedPath}`,
        };
      }
    }

    // Environment-aware file size validation:
    // - Test mode: Accept any file >0 bytes (allows test fixtures)
    // - Production: Require ≥10KB for images (catches corrupt/incomplete files)
    const isTestMode = process.env.NODE_ENV === 'test';

    // In test mode, only reject completely empty files
    if (isTestMode) {
      return { valid: true, sizeKB };
    }

    // In production, enforce minimum 10KB size (corrupt images can be 1-50KB)
    const minSizeKB = isAvatar ? 1 : 10;
    if (sizeKB < minSizeKB) {
      return {
        valid: false,
        error: `File is suspiciously small (${sizeKB.toFixed(2)} KB, minimum ${minSizeKB} KB): ${normalizedPath}`,
      };
    }

    return {
      valid: true,
      sizeKB,
    };

  } catch (error) {
    return {
      valid: false,
      error: `Cannot read file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Extract filename from various path formats
 */
function extractFilename(path: string): string | null {
  if (!path) return null;

  // Handle data URLs
  if (path.startsWith('data:')) {
    return null;
  }

  // Normalize path separators
  const normalizedPath = path.replace(/\\/g, '/');

  // Extract filename
  const parts = normalizedPath.split('/');
  const filename = parts[parts.length - 1];

  if (!filename || filename.length === 0) {
    return null;
  }

  return filename;
}

/**
 * Preload avatar file to verify it's fully accessible before rendering
 *
 * This reads the first 10MB of the file to ensure:
 * - File is not corrupted
 * - File permissions are correct
 * - Disk is not having I/O issues
 * - File handle can be opened successfully
 *
 * Catching issues here prevents Remotion timeouts during render.
 */
async function preloadAvatarFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, {
      highWaterMark: 1024 * 1024, // 1MB chunks
    });

    let bytesRead = 0;
    const preloadLimit = 10 * 1024 * 1024; // Read first 10MB

    // 30-second timeout to prevent indefinite hangs on I/O issues
    const timeout = setTimeout(() => {
      stream.destroy();
      reject(new Error(`Avatar preload timeout after 30 seconds. File: ${filePath}`));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      stream.destroy();
    };

    stream.on('data', (chunk) => {
      bytesRead += chunk.length;

      // Stop after reading 10MB (enough to verify file is accessible)
      if (bytesRead >= preloadLimit) {
        cleanup();
        resolve();
      }
    });

    stream.on('end', () => {
      // File is smaller than 10MB, fully read
      cleanup();
      resolve();
    });

    stream.on('error', (error) => {
      cleanup();
      reject(new Error(`Avatar preload failed: ${error.message}`));
    });
  });
}
