# Thumbnail Generation - Quick Start Guide

## Installation

### 1. Install ffmpeg

**Windows (using Chocolatey):**
```bash
choco install ffmpeg
```

**Windows (manual download):**
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to system PATH
4. Restart terminal

**Verify installation:**
```bash
ffmpeg -version
```

### 2. Database Migration

The thumbnail columns already exist if you've run migration `002_feature_additions.sql`. Verify with:

```bash
psql $DATABASE_URL -c "\d news_jobs"
```

Should see:
- `thumbnail_url` (TEXT)
- `thumbnail_generated_at` (TIMESTAMP WITH TIME ZONE)

## Usage

### Automatic (Recommended)

Thumbnails are **automatically generated** when a render job completes. No action required!

**Workflow:**
1. Create broadcast → Analyze → Generate images → Review assets
2. Upload avatar → Click "Render Final Video"
3. Wait for render to complete
4. ✅ Thumbnail automatically generated and saved
5. View in broadcasts list

### Manual Regeneration

**Use case:** You want a thumbnail from a different timestamp (e.g., 10s instead of 5s)

**Steps:**

1. **Via API:**
```bash
curl -X POST http://localhost:3000/api/jobs/{jobId}/thumbnail \
  -H "Content-Type: application/json" \
  -d '{"timestamp": 10}'
```

2. **Via Browser Console (while viewing job page):**
```javascript
// Regenerate at 10 seconds
fetch(`/api/jobs/${jobId}/thumbnail`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ timestamp: 10 })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## Testing

### Test Automatic Generation

1. **Create a test render:**
```bash
# Queue a job for rendering
tsx scripts/queue-render.ts {jobId}
```

2. **Wait for completion** (~2-5 minutes depending on video length)

3. **Check database:**
```bash
psql $DATABASE_URL -c "SELECT id, thumbnail_url, thumbnail_generated_at FROM news_jobs WHERE id = '{jobId}';"
```

4. **View in UI:**
   - Navigate to http://localhost:3000/broadcasts
   - Find your job in the list
   - Thumbnail should appear in the first column

### Test Manual Regeneration

```bash
tsx scripts/test-thumbnail-generation.ts [jobId]
```

**Expected output:**
```
✅ ALL TESTS PASSED!

📋 Summary:
   Job ID: abc123
   Video: C:\Users\konra\ObsidianNewsDesk\videos\abc123.mp4
   Thumbnail: C:\Users\konra\ObsidianNewsDesk\images\abc123-thumbnail.jpg
   Size: 45.23 KB
```

## Verification Checklist

- [ ] ffmpeg installed and in PATH
- [ ] Database migration applied (`thumbnail_url` column exists)
- [ ] Render worker running (`tsx scripts/start-workers.ts`)
- [ ] Next.js dev server running (`npm run dev`)
- [ ] At least one completed job exists

## Troubleshooting

### "ffmpeg not found"

**Problem:** ffmpeg not installed or not in PATH

**Solution:**
```bash
# Check if installed
ffmpeg -version

# If not found, install (Windows + Chocolatey):
choco install ffmpeg

# Restart terminal and verify:
ffmpeg -version
```

### Thumbnail not showing in UI

**Problem:** Image fails to load

**Debug:**
```bash
# 1. Check if file exists
ls "C:\Users\konra\ObsidianNewsDesk\images\*-thumbnail.jpg"

# 2. Check database
psql $DATABASE_URL -c "SELECT id, thumbnail_url FROM news_jobs WHERE thumbnail_url IS NOT NULL LIMIT 5;"

# 3. Test media serving API
curl http://localhost:3000/api/media/serve?path=C%3A%5CUsers%5Ckonra%5CObsidianNewsDesk%5Cimages%5C{jobId}-thumbnail.jpg
```

### "Cannot generate thumbnail for job in status: pending"

**Problem:** Trying to generate thumbnail for incomplete job

**Solution:** Wait until job status is `completed`, then retry

## Common Commands

```bash
# Test thumbnail generation for most recent job
tsx scripts/test-thumbnail-generation.ts

# Test with specific job ID
tsx scripts/test-thumbnail-generation.ts abc123

# Regenerate thumbnail at 10 seconds
curl -X POST http://localhost:3000/api/jobs/abc123/thumbnail \
  -H "Content-Type: application/json" \
  -d '{"timestamp": 10}'

# Delete thumbnail
curl -X DELETE http://localhost:3000/api/jobs/abc123/thumbnail

# View all jobs with thumbnails
psql $DATABASE_URL -c "SELECT id, status, thumbnail_generated_at FROM news_jobs WHERE thumbnail_url IS NOT NULL ORDER BY created_at DESC;"
```

## Configuration

Default settings are in `src/lib/integrations/thumbnail-api.ts`:

```typescript
{
  timestamp: 5,      // Extract at 5 seconds
  width: 640,        // 640px wide
  quality: 2,        // JPEG quality (1-31, lower = better)
}
```

To change defaults, edit the `generateThumbnailWithRetry()` call in `src/lib/queue/workers/render.worker.ts` (line 131).

## Performance

| Metric | Value |
|--------|-------|
| Generation time | 1-3 seconds |
| File size | 30-60 KB |
| Image width | 640px |
| Timeout | 30 seconds |
| Retry attempts | 3 (at 5s, 3s, 1s) |

## Next Steps

Once thumbnails are working:

1. **Customize timestamps:** Edit render worker to extract at different positions
2. **Add UI controls:** Create thumbnail regeneration button in job detail page
3. **Multiple thumbnails:** Generate 3-5 preview images per job
4. **Thumbnail picker:** Let users select preferred thumbnail before publishing

## Support

- **Documentation:** `THUMBNAIL_GENERATION_FEATURE.md`
- **Test script:** `scripts/test-thumbnail-generation.ts`
- **API reference:** See documentation for all endpoints
