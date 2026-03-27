/**
 * Pexels SDK - Modular Stock Media API Client
 *
 * A production-ready, reusable client for the Pexels API with:
 * - Photos and Videos search
 * - Smart selection algorithms
 * - Caching and rate limiting
 * - Comprehensive error handling
 * - Structured logging
 * - TypeScript support
 *
 * @example
 * ```typescript
 * import { createPexelsClient } from './pexels';
 *
 * const client = createPexelsClient({
 *   apiKey: process.env.PEXELS_API_KEY,
 *   enableCache: true,
 *   debug: true
 * });
 *
 * const videos = await client.searchVideos({
 *   query: 'breaking news',
 *   orientation: 'landscape'
 * });
 *
 * const best = client.selectBestVideo(videos.videos);
 * const buffer = await client.downloadVideo(best.downloadUrl);
 * ```
 */

// Client
export { PexelsClient, createPexelsClient, type PexelsClientOptions } from './client';

// Types
export * from './types';

// Configuration
export {
  type PexelsConfig,
  DEFAULT_CONFIG,
  createConfigFromEnv,
  mergeConfig,
  validateConfig,
} from './config';

// Errors
export {
  PexelsError,
  PexelsAuthError,
  PexelsRateLimitError,
  PexelsNotFoundError,
  PexelsNetworkError,
  PexelsValidationError,
} from './errors';

// Logging
export {
  type Logger,
  type LogLevel,
  ConsoleLogger,
  NoOpLogger,
  createLogger,
} from './logger';

// Caching
export { Cache, createCacheKey, type CacheEntry, type CacheOptions } from './cache';

// Legacy compatibility - keep old API client for backward compatibility
export { PexelsAPIClient } from './api';
