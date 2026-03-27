# Pexels SDK - Modular Stock Media API Client

A production-ready, reusable TypeScript client for the Pexels API with built-in caching, rate limiting, error handling, and MCP (Model Context Protocol) support for AI integration.

## Features

- ✅ **Full Pexels API Support** - Videos and Photos search/download
- ✅ **Smart Selection** - Automatic scoring algorithm for best media
- ✅ **Caching** - In-memory cache with configurable TTL (default: 1 hour)
- ✅ **Rate Limiting** - Automatic tracking and warnings (200/hour, 20,000/month)
- ✅ **Error Handling** - Structured errors with retry logic
- ✅ **Logging** - Configurable logging (console, custom, or silent)
- ✅ **TypeScript** - Full type safety with comprehensive interfaces
- ✅ **MCP Integration** - Expose to AI assistants via Model Context Protocol
- ✅ **Zero Configuration** - Works out of the box with sensible defaults
- ✅ **Modular** - Use standalone or integrate with any project

## Quick Start

### Installation

```bash
npm install axios dotenv
```

### Basic Usage

```typescript
import { createPexelsClient } from './lib/pexels';

// Create client (reads from PEXELS_API_KEY env var)
const client = createPexelsClient({
  enableCache: true,
  debug: true,
});

// Search videos
const videos = await client.searchVideos({
  query: 'breaking news',
  orientation: 'landscape',
  min_duration: 5,
  max_duration: 30,
});

console.log(`Found ${videos.total_results} videos`);

// Select best video (auto-scores by quality, duration, orientation)
const best = client.selectBestVideo(videos.videos);

if (best) {
  console.log(`Selected: #${best.videoId} (${best.resolution}, ${best.duration}s)`);

  // Download
  const buffer = await client.downloadVideo(best.downloadUrl);
  console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}
```

### Advanced Usage

```typescript
import { PexelsClient, ConsoleLogger, Cache } from './lib/pexels';

// Custom configuration
const client = new PexelsClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.pexels.com',
  timeout: 30000,
  enableCache: true,
  cacheTtl: 3600000, // 1 hour
  debug: true,
  logger: new ConsoleLogger(true, '[MyApp]'),
  defaults: {
    orientation: 'landscape',
    perPage: 15,
    minDuration: 5,
    maxDuration: 30,
  },
});

// Search photos with color filter
const photos = await client.searchPhotos({
  query: 'technology',
  color: 'blue',
  orientation: 'landscape',
});

// Download with progress
const buffer = await client.downloadPhoto(
  photos.photos[0].src.large,
  (percent) => console.log(`Downloaded: ${percent}%`)
);

// Check rate limit
const status = client.getRateLimitStatus();
console.log(`API: ${status.used}/${status.limit} requests used`);

// Cache management
const stats = client.getCacheStats();
console.log(`Cache: ${stats.valid} entries, ${stats.expired} expired`);
client.cleanupCache(); // Remove expired entries
client.clearCache();   // Clear all
```

## API Reference

### `createPexelsClient(options)`

Factory function to create a Pexels client.

**Options:**
```typescript
{
  apiKey?: string;           // API key (defaults to PEXELS_API_KEY env var)
  enableCache?: boolean;     // Enable caching (default: true)
  cacheTtl?: number;         // Cache TTL in ms (default: 3600000 = 1 hour)
  debug?: boolean;           // Enable debug logging (default: false)
  timeout?: number;          // HTTP timeout in ms (default: 30000)
  logger?: Logger;           // Custom logger instance
  defaults?: {
    orientation?: 'landscape' | 'portrait' | 'square';
    size?: 'large' | 'medium' | 'small';
    perPage?: number;        // Results per page (max: 80)
    minDuration?: number;    // Min video duration in seconds
    maxDuration?: number;    // Max video duration in seconds
  };
}
```

### `client.searchVideos(request)`

Search for videos.

**Request:**
```typescript
{
  query: string;                   // Required
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  min_duration?: number;
  max_duration?: number;
  per_page?: number;               // 1-80
  page?: number;                   // For pagination
}
```

**Returns:** `Promise<PexelsSearchResponse>`

### `client.searchPhotos(request)`

Search for photos.

**Request:**
```typescript
{
  query: string;                   // Required
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  color?: string;                  // e.g., 'red', 'blue', '#ffffff'
  locale?: string;                 // e.g., 'en-US'
  per_page?: number;               // 1-80
  page?: number;                   // For pagination
}
```

**Returns:** `Promise<PexelsPhotoSearchResponse>`

### `client.selectBestVideo(videos)`

Select best video using scoring algorithm.

**Scoring:**
- HD 1920x1080: 100 points
- 5-30s duration: 50 points
- Landscape (16:9): 30 points

**Returns:** `PexelsSelectedVideo | null`

### `client.downloadVideo(url, onProgress?)`

Download video file.

**Parameters:**
- `url` - Video download URL
- `onProgress` - Optional callback `(percent: number) => void`

**Returns:** `Promise<Buffer>`

### `client.downloadPhoto(url, onProgress?)`

Download photo file.

**Parameters:**
- `url` - Photo download URL
- `onProgress` - Optional callback `(percent: number) => void`

**Returns:** `Promise<Buffer>`

### `client.getRateLimitStatus()`

Get current rate limit status.

**Returns:**
```typescript
{
  used: number;              // Requests used this hour
  limit: number;             // Max requests per hour (200)
  resetInMinutes: number;    // Minutes until limit resets
}
```

### `client.getCacheStats()`

Get cache statistics.

**Returns:**
```typescript
{
  size: number;              // Total entries
  maxSize: number;           // Max cache size
  expired: number;           // Expired entries
  valid: number;             // Valid entries
}
```

### `client.clearCache()`

Clear all cached results.

### `client.cleanupCache()`

Remove expired cache entries. Returns number of entries removed.

## Error Handling

All errors are structured and typed:

```typescript
import {
  PexelsError,
  PexelsAuthError,
  PexelsRateLimitError,
  PexelsNotFoundError,
  PexelsValidationError,
  PexelsNetworkError,
} from './lib/pexels/errors';

try {
  await client.searchVideos({ query: 'test' });
} catch (error) {
  if (error instanceof PexelsRateLimitError) {
    console.log(`Rate limited. Resets at: ${error.resetTime}`);
    console.log(`Remaining: ${error.remaining}/${error.limit}`);
  } else if (error instanceof PexelsAuthError) {
    console.error('Invalid API key');
  } else if (error instanceof PexelsValidationError) {
    console.error(`Invalid ${error.field}: ${error.message}`);
  }

  // All errors have .toJSON() for logging
  console.error(error.toJSON());
}
```

## Caching

Built-in in-memory cache with automatic expiration:

```typescript
// Configure cache
const client = createPexelsClient({
  enableCache: true,
  cacheTtl: 7200000, // 2 hours
});

// Cache is automatic
const result1 = await client.searchVideos({ query: 'news' }); // API call
const result2 = await client.searchVideos({ query: 'news' }); // Cached!

// Check cache
const stats = client.getCacheStats();
console.log(`${stats.valid} cached results`);

// Manual management
client.cleanupCache(); // Remove expired
client.clearCache();   // Clear all
```

## Logging

Custom logging support:

```typescript
import { ConsoleLogger, NoOpLogger, Logger } from './lib/pexels/logger';

// Console logger with custom prefix
const client = createPexelsClient({
  logger: new ConsoleLogger(true, '[Pexels]'),
  debug: true,
});

// Silent logger (no output)
const client2 = createPexelsClient({
  logger: new NoOpLogger(),
});

// Custom logger
class MyLogger implements Logger {
  debug(msg: string, meta?: any) { /* ... */ }
  info(msg: string, meta?: any) { /* ... */ }
  warn(msg: string, meta?: any) { /* ... */ }
  error(msg: string, meta?: any) { /* ... */ }
}

const client3 = createPexelsClient({
  logger: new MyLogger(),
});
```

## Configuration

Environment variables (`.env`):

```bash
# Required
PEXELS_API_KEY=your_api_key_here

# Optional
PEXELS_CACHE_TTL=3600000
PEXELS_DEBUG=false
PEXELS_OUTPUT_DIR=./downloads
```

Or programmatic:

```typescript
import { createConfigFromEnv, mergeConfig, validateConfig } from './lib/pexels/config';

// From environment
const config = createConfigFromEnv();

// Merge with defaults
const config2 = mergeConfig({
  apiKey: 'your-key',
  timeout: 60000,
});

// Validate
validateConfig(config); // Throws if invalid
```

## MCP Integration

Expose to AI assistants via Model Context Protocol:

```bash
# Run MCP server
node src/mcp/pexels-server.ts
```

See `docs/MCP_SERVER_GUIDE.md` for full details.

## Module Structure

```
src/lib/pexels/
├── index.ts          # Main exports
├── client.ts         # Pexels client (modular version)
├── api.ts            # Legacy API client
├── types.ts          # TypeScript types
├── config.ts         # Configuration management
├── errors.ts         # Error classes
├── logger.ts         # Logging utilities
├── cache.ts          # Caching utilities
└── README.md         # This file
```

## Reusability

This module is designed to be **copy-paste ready** for any project:

### 1. Copy Module

```bash
cp -r src/lib/pexels /path/to/new/project/src/lib/
```

### 2. Install Dependencies

```bash
npm install axios dotenv
```

### 3. Use It

```typescript
import { createPexelsClient } from './lib/pexels';
// Works immediately!
```

## Examples

### Example 1: Download First HD Video

```typescript
const client = createPexelsClient();

const results = await client.searchVideos({
  query: 'ocean waves',
  orientation: 'landscape',
});

const best = client.selectBestVideo(results.videos);

if (best) {
  const buffer = await client.downloadVideo(best.downloadUrl);
  await fs.writeFile('ocean.mp4', buffer);
  console.log(`Saved to ocean.mp4 (${best.resolution})`);
}
```

### Example 2: Batch Download

```typescript
const queries = ['mountains', 'forest', 'desert', 'ocean'];

for (const query of queries) {
  const results = await client.searchVideos({ query, per_page: 1 });

  if (results.videos.length > 0) {
    const video = results.videos[0];
    const hdFile = video.video_files.find(f => f.quality === 'hd');

    if (hdFile) {
      const buffer = await client.downloadVideo(hdFile.link);
      await fs.writeFile(`${query}.mp4`, buffer);
      console.log(`✓ ${query}.mp4`);
    }
  }
}
```

### Example 3: Rate Limit Management

```typescript
async function safeSearch(query: string) {
  const status = client.getRateLimitStatus();

  if (status.used >= status.limit - 10) {
    console.warn(`Near rate limit (${status.used}/${status.limit}), waiting...`);
    await new Promise(r => setTimeout(r, status.resetInMinutes * 60000));
  }

  return client.searchVideos({ query });
}
```

## Testing

```bash
# Run test script
npm run test:pexels

# Expected output:
# ✅ API key found
# ✅ FFmpeg available
# ✅ Found 8000 videos
# ✅ Downloaded 9.2 MB
# 🎉 ALL TESTS PASSED!
```

## Performance

- **Search:** <1 second
- **Download (10-20 MB):** 3-5 seconds
- **Cache hit:** <1 millisecond
- **8 videos:** ~40 seconds total

## License

MIT (same as Pexels content - free to use)

## Support

- **Pexels API:** https://www.pexels.com/api/documentation/
- **Issues:** https://help.pexels.com/

## Changelog

### v1.0.0 (2026-03-25)
- Initial modular release
- Video and photo search
- Smart selection algorithms
- Caching and rate limiting
- MCP server integration
- Comprehensive documentation
