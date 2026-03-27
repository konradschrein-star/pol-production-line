# Pexels MCP Server Guide

## Overview

The **Pexels MCP (Model Context Protocol) Server** exposes Pexels API functionality to AI assistants like Claude Desktop, allowing them to search, download, and manage stock photos and videos programmatically.

This makes the Pexels SDK a **reusable, AI-accessible module** for any project.

---

## Features

### 🎬 Available Tools

1. **`search_videos`** - Search Pexels video library
2. **`search_photos`** - Search Pexels photo library
3. **`select_best_video`** - Smart video selection using scoring algorithm
4. **`download_video`** - Download video to local disk
5. **`download_photo`** - Download photo to local disk
6. **`get_rate_limit_status`** - Check API usage
7. **`get_cache_stats`** - View cache statistics
8. **`clear_cache`** - Clear cached search results

### 🚀 Capabilities

- ✅ Full Pexels API access via MCP
- ✅ Automatic caching (1 hour TTL)
- ✅ Rate limit tracking and warnings
- ✅ Smart video/photo selection algorithms
- ✅ Progress tracking for downloads
- ✅ Structured error handling
- ✅ TypeScript support

---

## Installation

### 1. Install Dependencies

```bash
cd obsidian-news-desk
npm install @modelcontextprotocol/sdk
```

### 2. Set Environment Variables

Add to `.env`:
```bash
PEXELS_API_KEY=fe1prqc2zR7oLTMmx0XSuFTwkIENIiPB4QjxhXvTlkNB1uzuqekDrvcD
PEXELS_CACHE_TTL=3600000
PEXELS_DEBUG=false
PEXELS_OUTPUT_DIR=C:\Users\konra\ObsidianNewsDesk\footage
```

### 3. Build TypeScript (if needed)

```bash
npm run build
```

---

## Configuration for Claude Desktop

### Location

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Configuration

Add this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "pexels": {
      "command": "node",
      "args": [
        "C:\\Users\\konra\\OneDrive\\Projekte\\20260319 Political content automation\\obsidian-news-desk\\src\\mcp\\pexels-server.ts"
      ],
      "env": {
        "PEXELS_API_KEY": "fe1prqc2zR7oLTMmx0XSuFTwkIENIiPB4QjxhXvTlkNB1uzuqekDrvcD",
        "PEXELS_CACHE_TTL": "3600000",
        "PEXELS_DEBUG": "false",
        "PEXELS_OUTPUT_DIR": "C:\\Users\\konra\\ObsidianNewsDesk\\footage"
      }
    }
  }
}
```

**Note:** Replace paths with your actual installation paths. Use double backslashes (`\\`) on Windows.

### Restart Claude Desktop

After updating the config:
1. Quit Claude Desktop completely
2. Restart Claude Desktop
3. The Pexels server will be available

---

## Usage Examples

### Example 1: Search for Videos

**Prompt to Claude:**
```
Search Pexels for "breaking news anchor" videos in landscape orientation,
with duration between 10-30 seconds. Show me the top 5 results.
```

**Claude will call:**
```json
{
  "tool": "search_videos",
  "arguments": {
    "query": "breaking news anchor",
    "orientation": "landscape",
    "min_duration": 10,
    "max_duration": 30,
    "per_page": 5
  }
}
```

### Example 2: Download Best Video

**Prompt to Claude:**
```
From the search results, select the best HD video and download it
to my footage folder as "news-anchor.mp4"
```

**Claude will call:**
```json
// First: select_best_video
{
  "tool": "select_best_video",
  "arguments": {
    "videos": [/* search results */]
  }
}

// Then: download_video
{
  "tool": "download_video",
  "arguments": {
    "url": "https://videos.pexels.com/...",
    "filename": "news-anchor.mp4"
  }
}
```

### Example 3: Search Photos with Color Filter

**Prompt to Claude:**
```
Find blue-toned photos of technology or computers. Download the best one.
```

**Claude will call:**
```json
{
  "tool": "search_photos",
  "arguments": {
    "query": "technology computer",
    "color": "blue",
    "orientation": "landscape",
    "per_page": 15
  }
}
```

### Example 4: Check Rate Limits

**Prompt to Claude:**
```
How many Pexels API requests do I have remaining?
```

**Claude will call:**
```json
{
  "tool": "get_rate_limit_status",
  "arguments": {}
}
```

**Response:**
```json
{
  "used": 5,
  "limit": 200,
  "resetInMinutes": 45
}
```

---

## Direct Usage (Without Claude Desktop)

You can also run the MCP server directly for testing:

### Start Server

```bash
cd obsidian-news-desk
node src/mcp/pexels-server.ts
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node src/mcp/pexels-server.ts
```

This opens a web UI to test the MCP server tools interactively.

---

## Programmatic Usage (Node.js)

You can also use the Pexels SDK directly in your code:

```typescript
import { createPexelsClient } from './lib/pexels';

const client = createPexelsClient({
  apiKey: process.env.PEXELS_API_KEY!,
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

// Select best video
const best = client.selectBestVideo(videos.videos);

if (best) {
  console.log(`Best video: ${best.videoId} (${best.resolution}, ${best.duration}s)`);

  // Download
  const buffer = await client.downloadVideo(best.downloadUrl);
  console.log(`Downloaded ${buffer.length} bytes`);
}

// Check rate limits
const status = client.getRateLimitStatus();
console.log(`API usage: ${status.used}/${status.limit} requests`);

// Cache stats
const cache = client.getCacheStats();
console.log(`Cache: ${cache.valid} valid entries, ${cache.expired} expired`);
```

---

## Tool Reference

### `search_videos`

Search for stock videos on Pexels.

**Parameters:**
- `query` (string, required) - Search query
- `orientation` (enum, optional) - `landscape`, `portrait`, `square`
- `size` (enum, optional) - `large`, `medium`, `small`
- `min_duration` (number, optional) - Minimum duration in seconds
- `max_duration` (number, optional) - Maximum duration in seconds
- `per_page` (number, optional) - Results per page (1-80)
- `page` (number, optional) - Page number for pagination

**Returns:**
```json
{
  "total_results": 8000,
  "page": 1,
  "per_page": 15,
  "videos": [...]
}
```

### `search_photos`

Search for stock photos on Pexels.

**Parameters:**
- `query` (string, required) - Search query
- `orientation` (enum, optional) - `landscape`, `portrait`, `square`
- `size` (enum, optional) - `large`, `medium`, `small`
- `color` (string, optional) - Color filter (e.g., `red`, `#ffffff`)
- `per_page` (number, optional) - Results per page (1-80)
- `page` (number, optional) - Page number for pagination

**Returns:**
```json
{
  "total_results": 5000,
  "page": 1,
  "per_page": 15,
  "photos": [...]
}
```

### `select_best_video`

Select best video using scoring algorithm.

**Scoring:**
- HD 1920x1080: 100 points
- 5-30s duration: 50 points
- Landscape orientation: 30 points

**Parameters:**
- `videos` (array, required) - Array of video objects from search results

**Returns:**
```json
{
  "videoId": 5192707,
  "downloadUrl": "https://...",
  "resolution": "1920x1080",
  "duration": 14,
  "quality": "hd",
  "fps": 24
}
```

### `download_video`

Download video file to disk.

**Parameters:**
- `url` (string, required) - Video download URL
- `filename` (string, optional) - Output filename (auto-generated if not provided)

**Returns:**
```json
{
  "success": true,
  "path": "C:\\Users\\konra\\ObsidianNewsDesk\\footage\\video-123.mp4",
  "size": 9647801,
  "sizeInMB": "9.20"
}
```

### `download_photo`

Download photo file to disk.

**Parameters:**
- `url` (string, required) - Photo download URL
- `filename` (string, optional) - Output filename (auto-generated if not provided)

**Returns:**
```json
{
  "success": true,
  "path": "C:\\Users\\konra\\ObsidianNewsDesk\\footage\\photo-123.jpg",
  "size": 2547801,
  "sizeInMB": "2.43"
}
```

### `get_rate_limit_status`

Get current API rate limit status.

**Parameters:** None

**Returns:**
```json
{
  "used": 5,
  "limit": 200,
  "resetInMinutes": 45
}
```

### `get_cache_stats`

Get cache statistics.

**Parameters:** None

**Returns:**
```json
{
  "size": 12,
  "maxSize": 100,
  "expired": 2,
  "valid": 10
}
```

### `clear_cache`

Clear all cached search results.

**Parameters:** None

**Returns:**
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

---

## Error Handling

The MCP server returns structured errors:

```json
{
  "error": true,
  "message": {
    "name": "PexelsRateLimitError",
    "code": "RATE_LIMIT_ERROR",
    "statusCode": 429,
    "details": {
      "resetTime": "2026-03-25T15:30:00.000Z",
      "limit": 200,
      "remaining": 0
    }
  }
}
```

**Error Types:**
- `PexelsAuthError` (401) - Invalid API key
- `PexelsRateLimitError` (429) - Rate limit exceeded
- `PexelsNotFoundError` (404) - Resource not found
- `PexelsValidationError` (400) - Invalid parameters
- `PexelsNetworkError` - Network/connection issues

---

## Troubleshooting

### Server Not Showing in Claude Desktop

1. Check config file location and syntax
2. Ensure paths use double backslashes on Windows
3. Restart Claude Desktop completely
4. Check Claude Desktop logs: `%APPDATA%\Claude\logs\`

### API Key Invalid

1. Verify `PEXELS_API_KEY` in config
2. Test key: `curl -H "Authorization: YOUR_KEY" https://api.pexels.com/videos/search?query=test`
3. Regenerate key at https://www.pexels.com/api/

### Downloads Failing

1. Check `PEXELS_OUTPUT_DIR` exists and is writable
2. Ensure enough disk space
3. Check network connection
4. Verify video/photo URL is valid

### Rate Limit Errors

1. Check usage: Call `get_rate_limit_status`
2. Wait for reset (shown in error details)
3. Enable caching to reduce API calls
4. Apply for unlimited requests (if eligible)

---

## Advanced Configuration

### Custom Cache TTL

Set cache expiration time (in milliseconds):
```json
{
  "env": {
    "PEXELS_CACHE_TTL": "7200000"  // 2 hours
  }
}
```

### Debug Mode

Enable debug logging:
```json
{
  "env": {
    "PEXELS_DEBUG": "true"
  }
}
```

### Custom Output Directory

Change download location:
```json
{
  "env": {
    "PEXELS_OUTPUT_DIR": "D:\\Videos\\Stock"
  }
}
```

---

## Reusability

This module is designed to be **fully reusable** across projects:

### 1. Copy the Pexels SDK

```bash
# Copy just the SDK (without MCP server)
cp -r src/lib/pexels /path/to/new/project/src/lib/
```

### 2. Install Dependencies

```bash
npm install axios dotenv
```

### 3. Use in New Project

```typescript
import { createPexelsClient } from './lib/pexels';

const client = createPexelsClient({
  apiKey: process.env.PEXELS_API_KEY!
});
```

### 4. Add MCP Server (Optional)

```bash
# Copy MCP server
cp src/mcp/pexels-server.ts /path/to/new/project/src/mcp/

# Install MCP SDK
npm install @modelcontextprotocol/sdk
```

---

## Next Steps

1. **Test the integration** - Try searching and downloading via Claude Desktop
2. **Integrate with workflow** - Use Pexels tools in your automation pipelines
3. **Extend functionality** - Add new tools (e.g., featured videos, collections)
4. **Share the module** - Package as npm module for easy distribution

---

## Support

**Documentation:**
- Pexels API: https://www.pexels.com/api/documentation/
- MCP Protocol: https://modelcontextprotocol.io/

**Issues:**
- Pexels API: https://help.pexels.com/
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk

---

## Changelog

### Version 1.0.0 (March 25, 2026)
- ✅ Initial release
- ✅ Video and photo search
- ✅ Smart selection algorithms
- ✅ Caching and rate limiting
- ✅ MCP server integration
- ✅ Comprehensive documentation
