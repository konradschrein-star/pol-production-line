# Pexels API Quick Reference

## API Key
```
Location: .env file
Key: PEXELS_API_KEY=fe1prqc2zR7oLTMmx0XSuFTwkIENIiPB4QjxhXvTlkNB1uzuqekDrvcD
Status: ✅ Active (25,000 requests available)
```

## Rate Limits
- **Hourly:** 200 requests
- **Monthly:** 20,000 requests
- **Current:** 24,999/25,000 remaining
- **Tracking:** Automatic via response headers

## Test Command
```bash
npm run test:pexels
```

## Search Example
```typescript
import { PexelsAPIClient } from '@/lib/pexels/api';

const client = new PexelsAPIClient(process.env.PEXELS_API_KEY!);

// Search for relevant videos
const results = await client.searchVideos({
  query: "breaking news anchor",     // ✅ Specific query
  orientation: "landscape",          // 16:9 for news
  per_page: 15,                      // Max 80
  min_duration: 5,                   // Minimum 5 seconds
  max_duration: 30                   // Maximum 30 seconds
});

// Select best HD video
const best = client.selectBestVideo(results.videos);

// Download
const videoBuffer = await client.downloadVideo(best.downloadUrl);

// Save to storage
const path = await saveBuffer(videoBuffer, 'my-video.mp4', 'footage');
```

## Performance
- **Search:** <1 second
- **Download (10-20 MB):** ~3 seconds per video
- **8 videos:** ~40 seconds total
- **vs Whisk images:** 20-30x faster!

## Search Quality Tips

✅ **Good Queries:**
- "breaking news anchor studio"
- "presidential press conference"
- "stock market trading floor"
- "political debate stage"

❌ **Bad Queries:**
- "news" (too generic)
- "random" (will return random results)
- "" (empty string)

## Storage
- **Location:** `C:\Users\konra\ObsidianNewsDesk\footage\`
- **Format:** MP4 (H.264)
- **Size:** 10-20 MB per video (HD 1080p)
- **Per broadcast:** ~80-160 MB (8 videos)

## Error Handling
```typescript
try {
  const results = await client.searchVideos({ query });
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Wait or use cache
  } else if (error.message.includes('401')) {
    // Check API key
  }
}
```

## Rate Limit Check
```typescript
const status = client.getRateLimitStatus();
console.log(`${status.used}/${status.limit} requests`);
console.log(`Resets in ${status.resetInMinutes} minutes`);
```

## Best Practices
1. **Cache searches** - Save results for 1 hour
2. **Batch downloads** - Get multiple videos from one search
3. **Fallback to Whisk** - If Pexels fails or rate limited
4. **Monitor usage** - Check rate limit regularly

## Documentation
- Full guide: `docs/PEXELS_API_GUIDE.md`
- Setup guide: `docs/PEXELS_TOKEN_SETUP.md`
- Phase 1 summary: `docs/PHASE_1_IMPLEMENTATION_SUMMARY.md`

## Support
- Pexels Help: https://help.pexels.com/
- API Docs: https://www.pexels.com/api/documentation/
