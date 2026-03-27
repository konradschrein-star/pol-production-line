import { existsSync, mkdirSync, cpSync, rmSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const CACHE_DIR = process.env.REMOTION_BUNDLE_CACHE_DIR || join(process.cwd(), 'tmp', 'remotion-cache');
const MAX_CACHE_ENTRIES = 5;

/**
 * Check if a cached bundle exists for the given composition hash
 * @returns Path to cached bundle or null if not found
 */
export function getCachedBundle(compositionHash: string): string | null {
  const cachedPath = join(CACHE_DIR, compositionHash);

  if (existsSync(cachedPath)) {
    console.log(`✅ [Cache] Bundle cache HIT: ${compositionHash.substring(0, 8)}...`);
    return cachedPath;
  }

  console.log(`❌ [Cache] Bundle cache MISS: ${compositionHash.substring(0, 8)}...`);
  return null;
}

/**
 * Cache a bundle directory
 */
export function cacheBundle(compositionHash: string, bundlePath: string): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cachedPath = join(CACHE_DIR, compositionHash);

  // Copy bundle to cache
  cpSync(bundlePath, cachedPath, { recursive: true });

  console.log(`💾 [Cache] Cached bundle: ${compositionHash.substring(0, 8)}...`);
  console.log(`   Path: ${cachedPath}`);

  // Cleanup old cache entries
  cleanupOldCache();
}

/**
 * Compute hash of composition files to detect changes
 * @returns MD5 hash of all composition-related files
 */
export function computeCompositionHash(): string {
  const compositionFiles = [
    'src/lib/remotion/index.ts',
    'src/lib/remotion/compositions/NewsVideo.tsx',
    'src/lib/remotion/components/Scene.tsx',
    'src/lib/remotion/components/AvatarOverlay.tsx',
    'src/lib/remotion/components/Ticker.tsx',
  ];

  const hash = crypto.createHash('md5');

  for (const file of compositionFiles) {
    const filePath = join(process.cwd(), file);

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      hash.update(content);
    } else {
      console.warn(`⚠️  [Cache] Composition file not found: ${file}`);
    }
  }

  return hash.digest('hex');
}

/**
 * Remove oldest cache entries if cache exceeds MAX_CACHE_ENTRIES
 */
function cleanupOldCache(): void {
  if (!existsSync(CACHE_DIR)) {
    return;
  }

  const cacheEntries = readdirSync(CACHE_DIR);

  if (cacheEntries.length <= MAX_CACHE_ENTRIES) {
    return;
  }

  // Sort by modification time (oldest first)
  const sorted = cacheEntries
    .map(entry => ({
      name: entry,
      path: join(CACHE_DIR, entry),
      mtime: statSync(join(CACHE_DIR, entry)).mtime.getTime(),
    }))
    .sort((a, b) => a.mtime - b.mtime);

  // Remove oldest entries
  const toRemove = sorted.slice(0, sorted.length - MAX_CACHE_ENTRIES);

  for (const entry of toRemove) {
    rmSync(entry.path, { recursive: true, force: true });
    console.log(`🗑️  [Cache] Removed old bundle: ${entry.name.substring(0, 8)}...`);
  }
}

/**
 * Clear all cached bundles
 */
export function clearCache(): void {
  if (existsSync(CACHE_DIR)) {
    rmSync(CACHE_DIR, { recursive: true, force: true });
    console.log('🗑️  [Cache] Cleared all cached bundles');
  }
}
