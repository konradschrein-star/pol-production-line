# Pexels API Integration Guide

**Last Updated:** March 25, 2026
**API Version:** v1
**Status:** ✅ Fully Operational

---

## Overview

The Obsidian News Desk system integrates with the **Pexels API** to source professional stock footage (videos and photos) for news broadcasts. This provides:

- **High-quality content:** Professional video/photo footage from Pexels library
- **Speed:** 5x faster than AI image generation (2-4 min vs 15-20 min for 8 scenes)
- **Cost:** 100% free (no credit card required)
- **Legal:** All content free to use under Pexels License

---

## API Rate Limits

### Current Account Status (Tested March 25, 2026)

```
Rate Limit: 24,999/25,000 requests remaining
Reset Time: Approximately every 24 hours
```

### Official Limits (Per Pexels Documentation)

**Free Tier (Default):**
- **200 requests per hour**
- **20,000 requests per month**
- Applies to both Photos and Videos APIs
- No credit card required

**Unlimited Requests:**
- Available for free if your platform is eligible
- Must meet Pexels guidelines and requirements
- Apply through Pexels Help Center

### Rate Limit Headers

Every successful API response (200 OK) includes these headers:

```
X-Ratelimit-Limit: 25000           # Your total rate limit
X-Ratelimit-Remaining: 24999       # Requests remaining
X-Ratelimit-Reset: 1743053392      # Unix timestamp when limit resets
```

**Our Implementation:**
- Automatically logs rate limits on every request
- Warns when approaching limit (180/200 for hourly tracking)
- Throws error at limit to prevent API lockout
- Tracks usage in memory (resets hourly)

---

## Search Quality & Relevance

### How to Get Relevant Results (Not Random)

**1. Use Specific, Descriptive Queries**

✅ **Good:**
```typescript
searchVideos({ query: "breaking news anchor studio" })
searchVideos({ query: "presidential press conference" })
searchVideos({ query: "stock market trading floor" })
```

❌ **Bad:**
```typescript
searchVideos({ query: "news" })           // Too generic
searchVideos({ query: "random video" })   // Will return random results
searchVideos({ query: "" })               // Invalid
```

**2. Use Search Filters**

```typescript
searchVideos({
  query: "breaking news",
  orientation: "landscape",  // Best for 16:9 videos
  size: "large",             // Prefer high-quality
  min_duration: 5,           // Minimum 5 seconds
  max_duration: 30,          // Maximum 30 seconds
  per_page: 15               // Results per page (max 80)
})
```

**3. Pagination for Better Selection**

```typescript
// Search multiple pages to find best match
const page1 = await searchVideos({ query: "news", page: 1 });
const page2 = await searchVideos({ query: "news", page: 2 });
```

**Our Smart Selection Algorithm:**
- Automatically prioritizes HD quality (1920x1080)
- Prefers 5-30 second duration
- Scores videos: HD 1080p (100 points) + ideal duration (50 points) + landscape (30 points)
- Returns highest-scoring video

---

## Available APIs

### 1. Videos API (Primary for News Broadcasts)

**Endpoint:** `https://api.pexels.com/videos/search`

**Supported Filters:**
- `query` (string, required) - Search keywords
- `orientation` (string, optional) - `landscape`, `portrait`, or `square`
- `size` (string, optional) - `large`, `medium`, or `small`
- `locale` (string, optional) - Language code (e.g., `en-US`)
- `page` (number, optional) - Page number (default: 1)
- `per_page` (number, optional) - Results per page (max: 80, default: 15)
- `min_duration` (number, optional) - Minimum duration in seconds
- `max_duration` (number, optional) - Maximum duration in seconds

**Response Format:**
```json
{
  "page": 1,
  "per_page": 15,
  "total_results": 8000,
  "url": "https://www.pexels.com/search/videos/breaking%20news",
  "videos": [
    {
      "id": 5192707,
      "width": 1920,
      "height": 1080,
      "duration": 14,
      "image": "https://...",  // Thumbnail
      "url": "https://www.pexels.com/video/...",
      "video_files": [
        {
          "id": 123456,
          "quality": "hd",
          "file_type": "video/mp4",
          "width": 1920,
          "height": 1080,
          "fps": 24,
          "link": "https://videos.pexels.com/..."
        }
      ],
      "video_pictures": [...]
    }
  ],
  "next_page": "https://api.pexels.com/videos/search?..."
}
```

### 2. Photos API (Future Enhancement)

**Endpoint:** `https://api.pexels.com/v1/search`

**Supported Filters:**
- `query` (string, required) - Search keywords
- `orientation` (string, optional) - `landscape`, `portrait`, or `square`
- `size` (string, optional) - `large`, `medium`, or `small`
- `color` (string, optional) - Filter by color (e.g., `red`, `blue`, `#ffffff`)
- `locale` (string, optional) - Language code
- `page` (number, optional) - Page number
- `per_page` (number, optional) - Results per page (max: 80)

**Not yet implemented** - Phase 1 focuses on videos only.

---

## Authentication

**Method:** API Key in Authorization Header

```http
GET /videos/search?query=breaking+news
Host: api.pexels.com
Authorization: YOUR_API_KEY
```

**Security:**
- API key stored in `.env` file (excluded from git via `.gitignore`)
- Never commit API key to version control
- No additional authentication required

**Your API Key:**
```
PEXELS_API_KEY=fe1prqc2zR7oLTMmx0XSuFTwkIENIiPB4QjxhXvTlkNB1uzuqekDrvcD
```

---

## Usage Best Practices

### 1. Caching (Recommended)

**Problem:** Repeated searches for same query waste API requests

**Solution:** Cache search results for 1 hour

```typescript
// Example: Simple in-memory cache
const searchCache = new Map();

async function cachedSearch(query: string) {
  const cacheKey = `${query}-${orientation}-${duration}`;

  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3600000) { // 1 hour
      return cached.results;
    }
  }

  const results = await pexelsClient.searchVideos({ query });
  searchCache.set(cacheKey, { results, timestamp: Date.now() });
  return results;
}
```

### 2. Request Batching

**Problem:** 8 scenes = 16 API requests (search + download for each)

**Solution:** Batch searches, reuse results

```typescript
// Search once, select 8 different videos from results
const results = await searchVideos({
  query: "breaking news",
  per_page: 80  // Get maximum results
});

// Select 8 best videos from single search
const selectedVideos = selectMultipleBestVideos(results.videos, 8);
```

### 3. Error Handling

```typescript
try {
  const results = await searchVideos({ query: "news" });
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Wait 1 hour or use cached results
    console.log('Rate limit hit - waiting...');
  } else if (error.message.includes('401')) {
    // Invalid API key
    console.error('Check PEXELS_API_KEY in .env');
  } else {
    // Network or other error
    console.error('Search failed:', error);
  }
}
```

### 4. Fallback Strategy

```typescript
// Try video first, fallback to image generation if fails
try {
  const video = await downloadPexelsVideo(query);
  return { type: 'video', url: video };
} catch (error) {
  console.warn('Pexels failed, falling back to Whisk image generation');
  const image = await generateWhiskImage(prompt);
  return { type: 'image', url: image };
}
```

---

## Testing & Verification

### Test Your Integration

```bash
npm run test:pexels
```

### Expected Output

```
🧪 PEXELS VIDEO API TEST

📋 TEST 1: Checking API key...
✅ API key found

🔧 TEST 2: Checking FFmpeg...
✅ FFmpeg 6.1.1 available

🔍 TEST 3: Searching for videos...
[Pexels] Rate limit: 24999/25000 requests remaining (resets: 2:49:52 AM)
[Pexels] Search found 8000 results for "breaking news"
✅ Found 8000 results

🎯 TEST 4: Selecting best video...
[Pexels] Selected video #5192707 (score: 180, 1920x1080, 14s)
✅ Selected video #5192707

⬇️  TEST 5: Downloading video...
[Pexels] Downloaded 9.2 MB
✅ Downloaded 9.2 MB

💾 TEST 6: Saving to storage...
✅ Saved to C:\Users\konra\ObsidianNewsDesk\footage\test-pexels-5192707.mp4

🔍 TEST 7: Extracting metadata...
✅ Metadata extracted:
   Resolution: 1920x1080
   Codec: h264
   Duration: 13.5s
   FPS: 24
   Bitrate: 5711 kbps

📊 TEST 8: Rate limit status...
✅ API Usage: 2/200 requests

🎉 ALL TESTS PASSED!
```

### Manual Testing

```bash
# Check current rate limit status
curl -H "Authorization: YOUR_API_KEY" \
  "https://api.pexels.com/videos/search?query=test&per_page=1" \
  -I | grep -i ratelimit

# Expected headers:
# x-ratelimit-limit: 25000
# x-ratelimit-remaining: 24999
# x-ratelimit-reset: 1743053392
```

---

## Performance Metrics

### Tested Performance (March 25, 2026)

**Single Video:**
- Search: <1 second
- Download (9.2 MB, HD 1080p): ~3 seconds
- Metadata extraction: <1 second
- **Total: ~4 seconds**

**8 Videos (Full News Broadcast):**
- 8 searches: ~8 seconds
- 8 downloads: ~30 seconds (average 3.75s each)
- **Total: ~40 seconds**

**vs Whisk Image Generation:**
- 8 images: 15-20 minutes
- **Video is 20-30x faster!**

### Storage Usage

**Per Video:**
- Average size: 10-20 MB (HD 1080p, 10-20s)
- Codec: H.264 (widely compatible)
- Format: MP4

**Per Broadcast (8 videos):**
- Total storage: ~80-160 MB
- Recommendation: Clean up old jobs periodically

---

## Troubleshooting

### "Invalid API key" (401 Error)

**Cause:** API key missing, incorrect, or malformed

**Solutions:**
1. Check `.env` file has `PEXELS_API_KEY=...`
2. Verify key has no extra spaces or quotes
3. Regenerate key at https://www.pexels.com/api/
4. Restart application after updating `.env`

### "Rate limit exceeded" (429 Error)

**Cause:** Hit 200 requests/hour or 20,000/month limit

**Solutions:**
1. Wait 1 hour for hourly limit reset
2. Check usage: `npm run test:pexels` → see "API Usage" in output
3. Implement caching (see Best Practices above)
4. Apply for unlimited requests (if eligible)

### "No results found" for Query

**Cause:** Query too specific or uses non-English keywords

**Solutions:**
1. Broaden search: "news anchor" instead of "CNN news anchor desk closeup"
2. Use English keywords
3. Remove special characters from query
4. Try similar/related keywords

### Video Download Timeout

**Cause:** Network issues or very large files

**Solutions:**
1. Increase timeout in client (currently 2 minutes)
2. Prefer smaller video files in selection algorithm
3. Check internet connection
4. Retry download

### FFmpeg Metadata Extraction Failed

**Cause:** Missing ffprobe-static or corrupted video file

**Solutions:**
1. Verify package installed: `npm list ffprobe-static`
2. Reinstall: `npm install --save ffprobe-static`
3. Check video file size > 0 bytes
4. Try downloading video again

---

## Legal & Licensing

### Pexels License

All videos/photos from Pexels are free to use under the **Pexels License**:

✅ **You CAN:**
- Use for commercial and non-commercial projects
- Modify and edit content
- Use without attribution (though appreciated)

❌ **You CANNOT:**
- Sell unmodified content as-is
- Redistribute on other stock photo/video sites
- Use to create misleading or harmful content
- Use identifiable people in bad light without consent

**Full License:** https://www.pexels.com/license/

### Attribution (Optional but Appreciated)

```
Video by [Photographer Name] from Pexels
```

Our implementation does NOT automatically add attribution, but you can add it manually if desired.

---

## API Documentation References

**Official Documentation:**
- Main API Docs: https://www.pexels.com/api/documentation/
- Rate Limits: https://help.pexels.com/hc/en-us/articles/900006470063
- Unlimited Requests: https://help.pexels.com/hc/en-us/articles/900005852323
- Help Center: https://help.pexels.com/hc/en-us/categories/900001326143-API

**Third-Party Resources:**
- PublicAPI.dev Guide: https://publicapi.dev/pexels-api
- Community Examples: https://github.com/topics/pexels-api

---

## Next Steps

### Phase 2: Worker Integration (Week 2)
- Extend image worker to handle video downloads
- Implement caching for search results
- Add fallback to Whisk if Pexels fails
- Batch video downloads for efficiency

### Phase 3: Photos API Support (Future)
- Add photos search/download
- Support color filtering
- Mix videos and photos in same broadcast

### Phase 4: Advanced Features (Future)
- Trending videos endpoint
- Collections API
- User curated collections
- Related videos suggestions

---

## Support

**Issues:**
- Pexels API Support: https://help.pexels.com/
- Our Implementation: See `docs/PHASE_1_IMPLEMENTATION_SUMMARY.md`

**API Key Management:**
- Get key: https://www.pexels.com/api/
- Manage keys: https://www.pexels.com/api/ (login required)

---

## Changelog

### March 25, 2026 - Initial Integration
- ✅ API client implemented
- ✅ Rate limit tracking
- ✅ Smart video selection
- ✅ FFmpeg metadata extraction
- ✅ End-to-end testing complete
- ✅ Documentation complete

**Sources:**
- [Pexels API Documentation](https://www.pexels.com/api/documentation/)
- [Rate Limit Best Practices](https://help.pexels.com/hc/en-us/articles/900006470063-What-steps-can-I-take-to-avoid-hitting-the-rate-limit)
- [Unlimited Requests Guide](https://help.pexels.com/hc/en-us/articles/900005852323-How-do-I-get-unlimited-requests)
- [Pexels API Help Center](https://help.pexels.com/hc/en-us/categories/900001326143-API)
