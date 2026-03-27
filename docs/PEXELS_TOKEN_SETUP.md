# Pexels API Setup Guide

## Overview

The Obsidian News Desk system uses the Pexels Video API to source professional stock footage for news broadcasts. This guide explains how to obtain and configure your Pexels API key.

## Getting Your API Key

1. **Sign Up:**
   - Visit: https://www.pexels.com/api/
   - Click "Sign Up" (free account)
   - Verify your email address

2. **Generate API Key:**
   - Navigate to: https://www.pexels.com/api/documentation/#authorization
   - Click "Your API Key" in the top right
   - Copy the API key (format: `abcdef1234567890...`)

3. **Add to Environment:**
   ```bash
   cd obsidian-news-desk
   nano .env  # or your preferred editor
   ```

   Add this line:
   ```
   PEXELS_API_KEY=your_actual_api_key_here
   ```

## Rate Limits

**Free Tier:**
- 200 requests per hour
- 20,000 requests per month
- No credit card required

**What counts as a request:**
- Each video search = 1 request
- Each video download = 1 request
- For 8 scenes: 16 requests total (search + download for each)

**Rate limit handling:**
- System automatically tracks usage
- Warns at 180/200 requests
- Throws error at 200/200 with retry instructions

## Testing

Run the test script to verify your setup:
```bash
npm run test:pexels
```

Expected output:
```
🧪 PEXELS VIDEO API TEST
✅ API key found
✅ FFmpeg available
✅ Found 127 results
✅ Selected video #12345
✅ Downloaded 18.2 MB
✅ Saved to C:\Users\konra\ObsidianNewsDesk\footage\test-pexels-12345.mp4
✅ Metadata extracted
🎉 ALL TESTS PASSED!
```

## Troubleshooting

**"Invalid API key" error:**
- Double-check key has no extra spaces
- Verify key is active at: https://www.pexels.com/api/
- Try regenerating a new key

**"Rate limit exceeded" error:**
- Wait 1 hour for reset
- Check usage: `console.log(client.getRateLimitStatus())`
- Consider caching search results

**"FFmpeg not available" error:**
- Run: `npm install ffmpeg-static`
- Restart terminal/IDE
- Verify: `npm list ffmpeg-static`

## Next Steps

After setup:
1. Run `npm run test:pexels` to verify
2. Proceed to Phase 2: Worker integration
3. See `docs/VIDEO_WORKFLOW.md` for usage guide
