# Thumbnail Generation Feature

**Status:** ✅ Fully Implemented (March 22, 2026)

## Overview

Automatic video thumbnail generation for completed render jobs. Thumbnails are extracted from the final rendered video and displayed in the broadcasts list UI.

## Architecture

### Components

**1. Thumbnail Generation API (`src/lib/integrations/thumbnail-api.ts`)**
- Uses ffmpeg to extract frames from video files
- Supports custom timestamp, width, and quality settings
- Automatic retry logic with fallback timestamps (5s → 3s → 1s)
- Error handling that doesn't fail the parent render job

**2. Render Worker Integration (`src/lib/queue/workers/render.worker.ts`)**
- Automatically generates thumbnails after successful video render
- Extracts frame at 5-second mark by default
- Saves thumbnail to local storage (`images/` directory)
- Updates database with thumbnail URL and generation timestamp
- Non-blocking: render job completes even if thumbnail fails

**3. Manual Regeneration API (`src/app/api/jobs/[id]/thumbnail/route.ts`)**
- POST endpoint to regenerate thumbnail with custom timestamp
- DELETE endpoint to remove thumbnail
- Validates job status (must be completed)
- Returns thumbnail URL and metadata

**4. Media Serving API (`src/app/api/media/serve/route.ts`)**
- Serves local image/video files to the frontend
- Security: Only serves files from allowed directories
- Supports caching with Cache-Control headers
- Content-Type detection based on file extension

**5. Broadcasts List UI (`src/app/(dashboard)/broadcasts/page.tsx`)**
- Displays thumbnail in table column (120px wide)
- Shows placeholder "No thumb" for jobs without thumbnails
- Graceful fallback on image load errors
- Responsive design with rounded corners (8px border-radius)

## Database Schema

The `news_jobs` table includes thumbnail columns (from migration `002_feature_additions.sql`):

```sql
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_news_jobs_thumbnail_url
ON news_jobs(thumbnail_url)
WHERE thumbnail_url IS NOT NULL;
```

## Configuration

### Default Settings

```typescript
{
  timestamp: 5,      // Extract frame at 5 seconds
  width: 640,        // 640px wide (maintains aspect ratio)
  quality: 2,        // JPEG quality (1-31, lower is better)
}
```

### File Locations

- **Thumbnails:** `C:\Users\konra\ObsidianNewsDesk\images\{jobId}-thumbnail.jpg`
- **Videos:** `C:\Users\konra\ObsidianNewsDesk\videos\{jobId}.mp4`

## API Usage

### 1. Automatic Generation (During Render)

Thumbnails are automatically generated when a render job completes. No manual intervention required.

### 2. Manual Regeneration

**Endpoint:** `POST /api/jobs/:id/thumbnail`

**Request Body (optional):**
```json
{
  "timestamp": 10  // Custom timestamp in seconds
}
```

**Response:**
```json
{
  "success": true,
  "thumbnailUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\abc123-thumbnail.jpg",
  "timestamp": 10,
  "sizeInBytes": 45678,
  "message": "Thumbnail regenerated successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/jobs/abc123/thumbnail \
  -H "Content-Type: application/json" \
  -d '{"timestamp": 10}'
```

### 3. Delete Thumbnail

**Endpoint:** `DELETE /api/jobs/:id/thumbnail`

**Response:**
```json
{
  "success": true,
  "message": "Thumbnail deleted successfully"
}
```

### 4. Serve Thumbnail

**Endpoint:** `GET /api/media/serve?path={absolutePath}`

**Example:**
```html
<img src="/api/media/serve?path=C%3A%5CUsers%5Ckonra%5CObsidianNewsDesk%5Cimages%5Cabc123-thumbnail.jpg" />
```

## Testing

### Test Script

Run the comprehensive test suite:

```bash
tsx scripts/test-thumbnail-generation.ts [jobId]
```

If no `jobId` is provided, the script will automatically find the most recent completed job.

**Test Coverage:**
1. Validate video file for thumbnail generation
2. Generate thumbnail at default timestamp (5s)
3. Generate thumbnail at custom timestamp (3s)
4. Update database with thumbnail URL
5. Verify thumbnail file exists

### Expected Output

```
🧪 THUMBNAIL GENERATION TEST

📋 No job ID provided. Finding most recent completed job...
✅ Found job: abc123

📦 Job Details:
   ID: abc123
   Status: completed
   Video: C:\Users\konra\ObsidianNewsDesk\videos\abc123.mp4
   Current Thumbnail: None
   Generated At: Never

✅ Job is valid for thumbnail generation

🧪 TEST 1: Validate video file
✅ Video is valid for thumbnail generation (duration >= 5s)

🧪 TEST 2: Generate thumbnail at 5s
✅ Thumbnail generated:
   Path: C:\Users\konra\ObsidianNewsDesk\images\abc123-thumbnail.jpg
   Size: 45.23 KB
   Timestamp: 5s

🧪 TEST 3: Generate thumbnail at 3s
✅ Thumbnail generated:
   Path: C:\Users\konra\ObsidianNewsDesk\images\abc123-thumbnail.jpg
   Size: 44.87 KB
   Timestamp: 3s

🧪 TEST 4: Update database with thumbnail
✅ Database updated:
   Thumbnail URL: C:\Users\konra\ObsidianNewsDesk\images\abc123-thumbnail.jpg
   Generated At: 2026-03-22T12:34:56.789Z

🧪 TEST 5: Verify thumbnail file exists
✅ Thumbnail file exists

✅ ALL TESTS PASSED!
```

## Error Handling

### Render Worker

**Scenario:** Thumbnail generation fails during render
**Behavior:** Log warning and continue with job completion
**Result:** Job status = `completed`, thumbnail_url = `null`

```
⚠️ [RENDER] Thumbnail generation failed: ffmpeg not found
   Job will complete without thumbnail
✅ [RENDER] Job abc123 render complete!
```

### Manual Regeneration

**Scenario:** Invalid job status
**Response:** `400 Bad Request`
```json
{
  "error": "Cannot generate thumbnail for job in status: pending. Job must be completed."
}
```

**Scenario:** Video file missing
**Response:** `400 Bad Request`
```json
{
  "error": "Job has no video file"
}
```

**Scenario:** ffmpeg not installed
**Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to generate thumbnail",
  "details": "ffmpeg not found. Please install ffmpeg."
}
```

## Requirements

### System Dependencies

- **ffmpeg:** Required for frame extraction
  - Windows: `choco install ffmpeg` or download from https://ffmpeg.org/
  - macOS: `brew install ffmpeg`
  - Linux: `apt-get install ffmpeg`

- **ffprobe:** Included with ffmpeg (used for validation)

### Environment

- Node.js with `child_process` support
- File system write access to `C:\Users\konra\ObsidianNewsDesk\images\`

## Design System Compliance

Thumbnails follow the project's design system principles:

- **Size:** 80x48px display (maintains aspect ratio)
- **Border radius:** 8px (polished, modern feel)
- **Border:** 1px `border-outline-variant`
- **Placeholder background:** `surface-container-low` (#1e1e1e)
- **Placeholder text:** `text-on-surface-variant` (xs size)

## Performance

### Generation Time

- **Average:** 1-3 seconds per thumbnail
- **Factors:** Video resolution, file size, CPU speed
- **Timeout:** 30 seconds maximum

### Storage

- **Average size:** 30-60 KB per thumbnail (JPEG quality 2)
- **Resolution:** 640px wide (aspect ratio maintained)
- **Format:** JPEG

### Caching

- **Browser cache:** 1 year (`Cache-Control: public, max-age=31536000, immutable`)
- **Why:** Thumbnails never change after generation

## Troubleshooting

### Issue: Thumbnails not showing in UI

**Possible causes:**
1. Media serving API not configured
2. File permissions issue
3. Invalid file path in database

**Debug steps:**
```bash
# Check if thumbnail file exists
ls "C:\Users\konra\ObsidianNewsDesk\images\*-thumbnail.jpg"

# Check database entries
psql $DATABASE_URL -c "SELECT id, thumbnail_url FROM news_jobs WHERE thumbnail_url IS NOT NULL LIMIT 5;"

# Test media serving API
curl http://localhost:3000/api/media/serve?path=C%3A%5CUsers%5Ckonra%5CObsidianNewsDesk%5Cimages%5Ctest-thumbnail.jpg
```

### Issue: ffmpeg not found

**Error:** `ffmpeg is not installed or not in PATH`

**Solution:**
1. Install ffmpeg (see Requirements section)
2. Verify installation: `ffmpeg -version`
3. Add to PATH if necessary
4. Restart worker processes

### Issue: Thumbnail generation timeout

**Error:** `Thumbnail generation timed out after 30 seconds`

**Possible causes:**
- Very large video file
- Slow disk I/O
- CPU overload

**Solutions:**
- Reduce video resolution before rendering
- Process fewer concurrent render jobs
- Increase timeout in `thumbnail-api.ts` (line 74)

## Future Enhancements

### Potential Improvements

1. **Multiple thumbnails:** Generate 3-5 thumbnails at different timestamps
2. **Thumbnail selection UI:** Allow users to pick preferred thumbnail
3. **Custom timestamp in UI:** Add input field for manual timestamp
4. **Animated thumbnails:** Generate short GIF previews
5. **Cloud storage:** Upload thumbnails to CDN for faster delivery
6. **Batch regeneration:** Regenerate all thumbnails with new settings
7. **AI scene detection:** Extract thumbnail from most visually interesting frame

### Technical Debt

- [ ] Add unit tests for thumbnail-api.ts
- [ ] Add integration tests for render worker
- [ ] Implement thumbnail queue for batch processing
- [ ] Add OpenTelemetry tracing for performance monitoring

## Related Files

**Core Implementation:**
- `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\src\lib\integrations\thumbnail-api.ts`
- `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\src\lib\queue\workers\render.worker.ts`

**API Endpoints:**
- `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\src\app\api\jobs\[id]\thumbnail\route.ts`
- `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\src\app\api\media\serve\route.ts`

**UI Components:**
- `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\src\app\(dashboard)\broadcasts\page.tsx`

**Testing:**
- `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\scripts\test-thumbnail-generation.ts`

**Database Migration:**
- `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\src\lib\db\migrations\002_feature_additions.sql`

## Changelog

### v1.0.0 (March 22, 2026)

**Added:**
- Thumbnail generation API with ffmpeg integration
- Automatic thumbnail generation in render worker
- Manual regeneration API endpoint
- Media serving API for local files
- Broadcasts list UI with thumbnail display
- Comprehensive test script
- Full documentation

**Configuration:**
- Default timestamp: 5 seconds
- Default width: 640px
- Default JPEG quality: 2
- Retry logic: 3 attempts with fallback timestamps

**Security:**
- Path validation for media serving
- Directory whitelist enforcement
- Content-Type header validation
