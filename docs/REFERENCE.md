# Technical Reference Manual

**Obsidian News Desk** - Complete reference documentation for advanced users and developers

**Version:** 1.0.0
**Date:** March 22, 2026
**Status:** Production Ready

---

## Table of Contents

1. [Complete Keyboard Shortcuts](#1-complete-keyboard-shortcuts)
2. [Job Status Reference](#2-job-status-reference)
3. [Error Codes and Meanings](#3-error-codes-and-meanings)
4. [API Endpoint Overview](#4-api-endpoint-overview)
5. [File Locations Map](#5-file-locations-map)
6. [Environment Variables](#6-environment-variables)
7. [Glossary of Terms](#7-glossary-of-terms)
8. [Frequently Asked Questions](#8-frequently-asked-questions)
9. [Advanced Usage](#9-advanced-usage)
10. [Support & Resources](#10-support--resources)

---

## 1. Complete Keyboard Shortcuts

Keyboard shortcuts enable mouse-free navigation and editing throughout the application.

### Global (All Pages)

| Key | Action | Context |
|-----|--------|---------|
| `?` | Show/hide keyboard shortcuts help modal | Any page |
| `Esc` | Close modal/dialog | When modal is open |

---

### Broadcasts List Page (`/broadcasts`)

**Navigation:**

| Key | Action | Notes |
|-----|--------|-------|
| `J` or `↓` | Select next job | Wraps to first item at end |
| `K` or `↑` | Select previous job | Wraps to last item at start |
| `Enter` | Open selected job | Opens storyboard editor |
| `→` | Next page | If pagination active |
| `←` | Previous page | If pagination active |

**Actions:**

| Key | Action | Notes |
|-----|--------|-------|
| `N` | Create new broadcast | Opens creation form |

**Visual Feedback:**
- Selected row highlighted with bright background and primary ring
- Auto-scrolls to keep selected row visible
- Hover shows lighter background

---

### Storyboard Editor (`/jobs/[id]`)

**Scene Navigation:**

| Key | Action | Notes |
|-----|--------|-------|
| `J` or `↓` | Next scene | Circular navigation |
| `K` or `↑` | Previous scene | Circular navigation |
| `1-9` | Jump to scene 1-9 | Direct scene access |

**Scene Actions (on selected scene):**

| Key | Action | Notes |
|-----|--------|-------|
| `R` | Regenerate scene image | Re-queues to image generation |
| `U` | Upload custom image | Opens file picker |
| `E` | Edit ticker headline | Enters inline edit mode |

**Global Actions:**

| Key | Action | Notes |
|-----|--------|-------|
| `C` | Copy avatar script | Copies to clipboard |
| `D` | Download final video | If status is `completed` |

**Visual Feedback:**
- Selected scene has 4px primary ring with offset
- Auto-scrolls selected scene to center of viewport
- Smooth transitions between selections

---

### Settings Page (`/settings`)

| Key | Action | Notes |
|-----|--------|-------|
| `Ctrl+S` | Save settings | Persists to `.env` file |
| `Ctrl+R` | Reset to defaults | Confirmation dialog shown |

---

### Implementation Notes

**Hook:** `src/lib/hooks/useHotkeys.ts`
- Generic keyboard listener with context awareness
- Automatically prevents hotkeys when typing in inputs/textareas
- `global` flag overrides input detection for critical shortcuts
- Supports modifier keys (Ctrl, Shift, Alt)
- Cross-platform (Cmd on Mac, Ctrl on Windows/Linux)

**Component:** `src/components/shared/HotkeyHelp.tsx`
- Modal dialog showing all available shortcuts
- Press `?` to toggle (works globally)
- Dark overlay with brutalist card design
- Auto-disables when typing in inputs

---

## 2. Job Status Reference

### State Machine Diagram

```
pending
   ↓
analyzing (AI script analysis, 30-60s)
   ↓
generating_images (Whisk API, 8-12 min)
   ↓
review_assets (MANUAL CHECKPOINT - human review)
   ↓
rendering (Remotion compilation, 2-4 min)
   ↓
completed (video ready for download)

Any stage can → failed (error occurred, check error_message)
Any stage can → cancelled (user action, check cancellation_reason)
```

---

### Detailed Status Explanations

#### `pending`
**Description:** Job created, queued for analysis
**Duration:** < 5 seconds
**Next State:** Auto-advances to `analyzing`
**User Actions:**
- None available (system automatically processes)
- Can cancel job

**Troubleshooting:**
- If stuck >10 seconds: Check workers are running (`npm run workers`)
- Check Redis connection in worker logs

---

#### `analyzing`
**Description:** AI analyzing script to generate scenes
**Duration:** 30-60 seconds
**Next State:** Auto-advances to `generating_images`
**Queue:** `queue_analyze`

**What Happens:**
- AI provider (Google/Claude/OpenAI/Groq) processes script
- Generates avatar script for TTS/HeyGen
- Creates 6-8 scene definitions with:
  - Image prompt (for AI generation)
  - Ticker headline (for scrolling overlay)
  - Scene order

**User Actions:**
- None (wait for completion)
- Can cancel job

**Troubleshooting:**
- Stuck in analyzing: Check AI provider API key is valid
- Check worker logs for API errors
- Verify `AI_PROVIDER` environment variable is set correctly
- Common errors:
  - "Rate limit exceeded" → Wait 60 seconds, retry
  - "API key invalid" → Check Settings, verify API key
  - "Script too short" → Must be 100+ characters

---

#### `generating_images`
**Description:** Whisk API creating scene backgrounds
**Duration:** 8-12 minutes (for 8 scenes)
**Next State:** Auto-advances to `review_assets` when all scenes complete
**Queue:** `queue_images` (parallel processing)

**What Happens:**
- Each scene queued individually to BullMQ
- Whisk API generates images based on prompts
- Images uploaded to local storage (`C:\Users\konra\ObsidianNewsDesk\images\`)
- Database updated with image URLs

**User Actions:**
- Monitor progress (scene status updates in real-time)
- Regenerate individual scenes if they fail
- Can cancel job

**Troubleshooting:**
- Individual scene failures: Click "Regenerate" button
- "Content policy violation" → Auto-sanitization attempted, may regenerate
- "Whisk API token expired" → Refresh token (F12 → Network → Copy new token)
- "Queue paused" → Click "Resume Queue" button
- "Too many regenerations" → Wait 5 minutes (ban detection cooldown)

---

#### `review_assets`
**Description:** MANUAL STEP - Review scenes, edit headlines, generate avatar
**Duration:** 3-10 minutes (user-dependent)
**Next State:** Manual advancement to `rendering` after avatar upload
**Queue:** None (user action required)

**What Happens:**
- Pipeline pauses for human review
- User reviews all generated scene images
- User edits ticker headlines if needed
- User generates and uploads avatar MP4 from HeyGen

**User Actions:**
- **Required:** Upload avatar MP4 (click "COMPILE & RENDER")
- **Optional:**
  - Regenerate scenes with unsatisfactory images
  - Edit ticker headlines (press `E` on selected scene)
  - Upload custom images to override AI generations
  - Add reference images (subject/scene/style)

**Critical Notes:**
- **CANNOT advance without avatar upload**
- Avatar must be:
  - MP4 format (H.264 codec)
  - 48kHz audio sample rate
  - <100MB (optimize with `./scripts/optimize-avatar.sh` if larger)

**Troubleshooting:**
- "COMPILE & RENDER" disabled → Upload avatar first
- Avatar upload fails → Check file format (MP4 only), audio sample rate (48kHz)
- Avatar file too large → Use optimization script:
  ```bash
  cd obsidian-news-desk
  ./scripts/optimize-avatar.sh "C:\path\to\avatar.mp4" "optimized-avatar.mp4"
  ```

---

#### `rendering`
**Description:** Remotion compiling final video
**Duration:** 2-4 minutes
**Next State:** Auto-advances to `completed`
**Queue:** `queue_render`

**What Happens:**
- Remotion renders 1920x1080 MP4 at 30fps
- Applies Ken Burns effect to scene backgrounds
- Composites HeyGen avatar with WebGL chromakey (green screen removal)
- Overlays scrolling ticker with headlines
- Critical pacing logic:
  - **Hook (0-15s):** Images transition every 1.5 seconds
  - **Body (15s+):** Images transition at sentence boundaries
- Final video uploaded to local storage (`C:\Users\konra\ObsidianNewsDesk\videos\`)

**User Actions:**
- None (wait for completion)
- Monitor render progress (percentage shown)
- Can cancel (but current frame will complete)

**Troubleshooting:**
- Render fails: Check Remotion worker logs
- "Missing images" → Some scenes failed, regenerate them first
- "Timeout" → Increase `REMOTION_TIMEOUT_MS` in Settings (default: 120000ms)
- "Out of memory" → Close other apps, reduce `REMOTION_CONCURRENCY`
- Avatar not appearing → Check file exists at avatar path
- Green screen not removed → Verify avatar has green background

---

#### `completed`
**Description:** Video ready to download
**Duration:** Terminal state (permanent)
**Next State:** None (terminal)

**What Happens:**
- Final video available at `final_video_url`
- All metrics recorded in `job_metrics` table
- Job archived but can be viewed/downloaded anytime

**User Actions:**
- Download video (press `D` or click download button)
- View in storyboard editor
- Delete job (if no longer needed)
- Clone job to create similar broadcast

**File Location:**
```
C:\Users\konra\ObsidianNewsDesk\videos\{job_id}.mp4
```

---

#### `failed`
**Description:** Error occurred, check error message
**Duration:** Terminal state
**Next State:** Can retry manually (creates new job)

**What Happens:**
- Job processing encountered unrecoverable error
- `error_message` field contains detailed error
- All progress stopped

**User Actions:**
- Read error message for details
- Fix underlying issue (API key, disk space, etc.)
- Create new job with same script (copy/paste)
- Cannot resume failed job

**Common Causes:**
- Invalid API key
- Whisk token expired
- Database connection lost
- Disk full
- All scene image generations failed

---

#### `cancelled`
**Description:** User cancelled job
**Duration:** Terminal state
**Next State:** None (terminal)

**What Happens:**
- User clicked cancel button
- Current operations complete, then stop
- `cancellation_reason` may contain user note
- Partial progress preserved (generated images remain)

**User Actions:**
- View partial results in storyboard editor
- Delete job
- Recover generated images if needed (check scenes table)

---

### Status Transitions Table

| From State | To State | Trigger | Auto/Manual |
|------------|----------|---------|-------------|
| `pending` | `analyzing` | Queue processes job | Auto |
| `analyzing` | `generating_images` | Analysis complete | Auto |
| `generating_images` | `review_assets` | All images generated | Auto |
| `review_assets` | `rendering` | Avatar uploaded, compile clicked | Manual |
| `rendering` | `completed` | Render complete | Auto |
| Any | `failed` | Error occurs | Auto |
| Any | `cancelled` | User cancels | Manual |

---

## 3. Error Codes and Meanings

Complete reference of all error codes with solutions.

### Configuration Errors

#### `INVALID_API_KEY`
**Message:** Invalid API key for selected AI provider
**Cause:** API key is incorrect, expired, or malformed
**Solution:**
1. Go to Settings page
2. Verify API key is correct (no extra spaces)
3. Google AI keys start with `AIzaSy`
4. Claude keys start with `sk-ant-api03-`
5. Groq keys start with `gsk_`
6. Regenerate key from provider console if needed

---

#### `MISSING_API_KEY`
**Message:** Missing API key for selected AI provider
**Cause:** `AI_PROVIDER` is set but corresponding API key is not
**Solution:**
1. Open Settings page
2. If `AI_PROVIDER=google`, add `GOOGLE_AI_API_KEY`
3. If `AI_PROVIDER=claude`, add `ANTHROPIC_API_KEY`
4. If `AI_PROVIDER=groq`, add `GROQ_API_KEY`
5. Save settings and restart workers

---

#### `INVALID_AI_PROVIDER`
**Message:** Invalid AI provider specified
**Cause:** `AI_PROVIDER` is not one of: `google`, `claude`, `groq`, `openai`
**Solution:**
1. Open Settings page
2. Set AI Provider to valid option
3. Add corresponding API key
4. Save and restart workers

---

### Validation Errors

#### `SCRIPT_TOO_SHORT`
**Message:** News script is too short
**Cause:** Script has fewer than 100 characters
**Solution:**
- Add more content to news script
- Minimum 100 characters required
- Recommended: 500-2000 characters for 6-8 scenes

---

#### `INVALID_JOB_STATUS`
**Message:** Job is not in the correct status for this action
**Cause:** Attempting action not allowed in current job state
**Example:** Trying to compile before all images are generated
**Solution:**
- Wait for job to reach appropriate status
- Check status diagram in section 2
- Cannot skip `review_assets` state

---

#### `INVALID_FILE_TYPE`
**Message:** Invalid file type uploaded
**Cause:** Uploaded file doesn't match expected format
**Solution:**
- Avatar: MP4 only (H.264 codec)
- Scene images: PNG, JPG, WebP
- Reference images: PNG, JPG, WebP
- Check file extension matches format

---

#### `FILE_TOO_LARGE`
**Message:** File size exceeds maximum allowed
**Cause:** File >100MB
**Solution:**
- Avatar: Use optimization script
  ```bash
  ./scripts/optimize-avatar.sh <input.mp4> <output.mp4>
  ```
- Images: Resize to 1920x1080 or lower
- Compress with online tools or FFmpeg

---

### Resource Errors

#### `JOB_NOT_FOUND`
**Message:** Job not found
**Cause:** Job ID doesn't exist in database
**Solution:**
- Check job ID is correct
- Job may have been deleted
- Return to broadcasts list and select valid job

---

#### `SCENE_NOT_FOUND`
**Message:** Scene not found
**Cause:** Scene ID doesn't exist or was deleted
**Solution:**
- Refresh page
- Check scene belongs to correct job
- May indicate database inconsistency

---

#### `DISK_SPACE_LOW`
**Message:** Low disk space on storage drive
**Cause:** Less than 10GB free on `C:\` drive
**Solution:**
1. Delete old broadcast videos from `C:\Users\konra\ObsidianNewsDesk\videos\`
2. Empty Recycle Bin
3. Run Disk Cleanup utility
4. Move storage to different drive (change `STORAGE_PATH` in Settings)

---

#### `FILE_NOT_FOUND`
**Message:** File not found on disk
**Cause:** Expected file missing from storage
**Solution:**
- Regenerate image (if scene image)
- Re-upload avatar (if avatar MP4)
- Check file permissions
- Verify `STORAGE_PATH` is correct

---

### Queue Errors

#### `QUEUE_PAUSED`
**Message:** Worker queue is paused
**Cause:** Queue manually paused or auto-paused due to errors
**Solution:**
1. Click "RESUME QUEUE" button in UI
2. Or restart workers:
   ```bash
   STOP.bat
   START.bat
   ```
3. Check worker logs for errors that caused pause

---

#### `QUEUE_FAILED`
**Message:** Failed to add job to queue
**Cause:** Redis connection error
**Solution:**
1. Check Redis Docker container is running:
   ```bash
   docker ps
   ```
2. Check Redis logs:
   ```bash
   docker-compose logs redis
   ```
3. Restart Redis:
   ```bash
   docker-compose restart redis
   ```
4. Full system restart:
   ```bash
   STOP.bat
   START.bat
   ```

---

#### `GOOGLE_WISK_BAN`
**Message:** Google Whisk ban detected
**Cause:** >5 failed generations in 5 minutes (rate limit or policy violations)
**Solution:**
1. Wait 15 minutes (ban cooldown)
2. Log into https://labs.google.com/whisk manually
3. Generate one test image to verify unblocked
4. Resume queue in UI
5. Reduce `WHISK_CONCURRENCY` in Settings to avoid future bans

---

### Worker Errors

#### `IMAGE_GENERATION_FAILED`
**Message:** Image generation failed
**Cause:** Whisk API rejected prompt or network error
**Solution:**
1. Click "Regenerate" on failed scene
2. Check error message for specific cause:
   - "Content policy violation" → Prompt auto-sanitized, retry
   - "401 Unauthorized" → Refresh Whisk token
   - "Network error" → Check internet connection
3. Upload custom image as workaround
4. Add reference images to improve success rate

---

#### `REMOTION_RENDER_FAILED`
**Message:** Video rendering failed
**Cause:** Remotion encountered error during compilation
**Solution:**
1. Check Remotion worker logs for details
2. Verify all scenes have images:
   ```sql
   SELECT id, image_url FROM news_scenes WHERE job_id='<job_id>' AND image_url IS NULL;
   ```
3. Verify avatar uploaded and accessible
4. Check disk space (need ~500MB for temp files)
5. Reduce `REMOTION_CONCURRENCY` if system overloaded
6. Increase `REMOTION_TIMEOUT_MS` if large video

**Common Causes:**
- Missing scene images
- Avatar file not found
- Out of memory
- Timeout exceeded
- Corrupted avatar MP4

---

#### `AVATAR_UPLOAD_FAILED`
**Message:** Avatar upload failed
**Cause:** Invalid MP4 format or audio sample rate mismatch
**Solution:**
1. Verify MP4 format (not MOV, AVI, etc.)
2. Check codec: Must be H.264
   ```bash
   ffprobe <avatar.mp4>
   ```
3. Check audio: Must be 48kHz AAC
4. Re-export from HeyGen with correct settings
5. Optimize if too large:
   ```bash
   ./scripts/optimize-avatar.sh <input.mp4> <output.mp4>
   ```

---

### Database Errors

#### `DATABASE_ERROR`
**Message:** Database connection error
**Cause:** PostgreSQL not running or connection refused
**Solution:**
1. Check Docker Desktop is running
2. Verify PostgreSQL container status:
   ```bash
   docker ps | grep postgres
   ```
3. Check database logs:
   ```bash
   docker-compose logs postgres
   ```
4. Restart database:
   ```bash
   docker-compose restart postgres
   ```
5. Full system restart:
   ```bash
   STOP.bat
   START.bat
   ```

---

#### `REDIS_ERROR`
**Message:** Redis connection error
**Cause:** Redis not running or connection refused
**Solution:**
1. Check Docker Desktop is running
2. Verify Redis container status:
   ```bash
   docker ps | grep redis
   ```
3. Check Redis logs:
   ```bash
   docker-compose logs redis
   ```
4. Restart Redis:
   ```bash
   docker-compose restart redis
   ```
5. Full system restart:
   ```bash
   STOP.bat
   START.bat
   ```

---

#### `UNKNOWN_ERROR`
**Message:** An unknown error occurred
**Cause:** Unexpected error not covered by specific codes
**Solution:**
1. Check worker console logs for stack trace
2. Check browser console (F12) for frontend errors
3. Review recent changes to configuration
4. Restart system
5. Contact system administrator if issue persists

---

## 4. API Endpoint Overview

Base URL: `http://localhost:8347`

All endpoints return JSON. Authentication not currently implemented (local use only).

### Jobs

#### `POST /api/jobs`
**Description:** Create new broadcast job
**Request Body:**
```json
{
  "raw_script": "Breaking news: ..."
}
```
**Response:**
```json
{
  "id": "uuid",
  "status": "pending",
  "raw_script": "Breaking news: ...",
  "created_at": "2026-03-22T..."
}
```
**Status Codes:**
- `201` Created
- `400` Invalid request (script too short)
- `500` Server error

---

#### `GET /api/jobs`
**Description:** List all jobs
**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "status": "completed",
      "created_at": "2026-03-22T...",
      "updated_at": "2026-03-22T..."
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

#### `GET /api/jobs/[id]`
**Description:** Get job details
**Response:**
```json
{
  "id": "uuid",
  "status": "review_assets",
  "raw_script": "Breaking news: ...",
  "avatar_script": "Good evening. Breaking news: ...",
  "avatar_mp4_url": null,
  "final_video_url": null,
  "error_message": null,
  "scenes": [
    {
      "id": "uuid",
      "scene_order": 0,
      "image_prompt": "Photorealistic image of...",
      "ticker_headline": "BREAKING: ...",
      "image_url": "file:///C:/Users/.../image.jpg",
      "generation_status": "completed"
    }
  ],
  "created_at": "2026-03-22T...",
  "updated_at": "2026-03-22T..."
}
```

---

#### `PATCH /api/jobs/[id]`
**Description:** Update job metadata
**Request Body:**
```json
{
  "cancellation_reason": "User cancelled"
}
```
**Response:**
```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancellation_reason": "User cancelled"
}
```

---

#### `DELETE /api/jobs/[id]`
**Description:** Delete job and all associated scenes/files
**Response:**
```json
{
  "success": true,
  "deleted_files": [
    "C:/Users/.../video.mp4",
    "C:/Users/.../avatar.mp4",
    "C:/Users/.../scene_1.jpg"
  ]
}
```

---

#### `POST /api/jobs/[id]/compile`
**Description:** Upload avatar and start rendering
**Request:** Multipart form-data with `avatar` file
**Response:**
```json
{
  "id": "uuid",
  "status": "rendering",
  "avatar_mp4_url": "file:///C:/Users/.../avatar.mp4"
}
```
**Requirements:**
- File must be MP4 (H.264 codec)
- Audio must be 48kHz AAC
- Max file size: 100MB

---

#### `POST /api/jobs/[id]/launch-browser`
**Description:** Open HeyGen browser for manual avatar generation
**Response:**
```json
{
  "success": true,
  "browser": "edge",
  "message": "Browser launched with avatar script"
}
```
**Notes:**
- Uses `child_process.exec` to launch browser
- Avatar script automatically copied to clipboard
- Browser type configurable via `BROWSER_TYPE` environment variable

---

#### `POST /api/jobs/[id]/resume-queue`
**Description:** Resume paused image generation queue
**Response:**
```json
{
  "success": true,
  "resumed": true,
  "message": "Queue resumed"
}
```

---

#### `POST /api/jobs/[id]/cancel`
**Description:** Cancel job
**Request Body:**
```json
{
  "reason": "User cancellation"
}
```
**Response:**
```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancellation_reason": "User cancellation"
}
```

---

#### `POST /api/jobs/bulk`
**Description:** Bulk operations on multiple jobs
**Request Body:**
```json
{
  "action": "delete",
  "job_ids": ["uuid1", "uuid2", "uuid3"]
}
```
**Response:**
```json
{
  "success": true,
  "affected": 3,
  "results": [
    { "id": "uuid1", "success": true },
    { "id": "uuid2", "success": true },
    { "id": "uuid3", "success": false, "error": "Job not found" }
  ]
}
```
**Supported Actions:**
- `delete` - Delete multiple jobs
- `cancel` - Cancel multiple jobs

---

### Scenes

#### `GET /api/jobs/[id]/scenes`
**Description:** List all scenes for a job
**Response:**
```json
{
  "scenes": [
    {
      "id": "uuid",
      "job_id": "uuid",
      "scene_order": 0,
      "image_prompt": "Photorealistic image of...",
      "ticker_headline": "BREAKING: ...",
      "image_url": "file:///C:/Users/.../image.jpg",
      "generation_status": "completed",
      "reference_images": {
        "subject": "file:///C:/Users/.../ref.jpg"
      }
    }
  ]
}
```

---

#### `PATCH /api/jobs/[id]/scenes/[scene_id]`
**Description:** Update scene (e.g., edit ticker headline)
**Request Body:**
```json
{
  "ticker_headline": "NEW HEADLINE TEXT"
}
```
**Response:**
```json
{
  "id": "uuid",
  "ticker_headline": "NEW HEADLINE TEXT",
  "updated_at": "2026-03-22T..."
}
```

---

#### `POST /api/jobs/[id]/scenes/[scene_id]/regenerate`
**Description:** Regenerate scene image
**Response:**
```json
{
  "success": true,
  "scene_id": "uuid",
  "queued": true,
  "message": "Scene queued for regeneration"
}
```
**Notes:**
- Re-queues scene to `queue_images`
- Uses existing prompt and references
- Updates `generation_status` to `generating`

---

#### `POST /api/jobs/[id]/scenes/[scene_id]/upload`
**Description:** Upload custom image to override AI generation
**Request:** Multipart form-data with `image` file
**Response:**
```json
{
  "id": "uuid",
  "image_url": "file:///C:/Users/.../custom_image.jpg",
  "generation_status": "completed"
}
```
**Requirements:**
- Format: PNG, JPG, WebP
- Recommended aspect ratio: 16:9 (1920x1080)
- Max file size: 10MB

---

#### `POST /api/jobs/[id]/scenes/[scene_id]/references`
**Description:** Upload reference image for scene
**Request:** Multipart form-data with `file` and `type` (subject/scene/style)
**Response:**
```json
{
  "success": true,
  "reference_id": "uuid",
  "type": "subject",
  "path": "file:///C:/Users/.../reference.jpg"
}
```

---

#### `DELETE /api/jobs/[id]/scenes/[scene_id]/references/[ref_id]`
**Description:** Remove reference image
**Response:**
```json
{
  "success": true,
  "deleted": true
}
```

---

### Settings

#### `GET /api/settings`
**Description:** Get current system settings
**Response:**
```json
{
  "AI_PROVIDER": "google",
  "GOOGLE_AI_API_KEY": "AIzaSy***",
  "WHISK_API_TOKEN": "ya29.a0***",
  "WHISK_IMAGE_MODEL": "IMAGEN_3_5",
  "REMOTION_CONCURRENCY": 4,
  "REMOTION_TIMEOUT_MS": 120000,
  "LOCAL_STORAGE_ROOT": "C:\\Users\\konra\\ObsidianNewsDesk"
}
```
**Notes:**
- Sensitive values masked (first 6 characters shown)
- Read from `.env` file

---

#### `POST /api/settings`
**Description:** Save settings (updates `.env` file)
**Request Body:**
```json
{
  "AI_PROVIDER": "claude",
  "ANTHROPIC_API_KEY": "sk-ant-api03-..."
}
```
**Response:**
```json
{
  "success": true,
  "updated": ["AI_PROVIDER", "ANTHROPIC_API_KEY"],
  "message": "Settings saved. Restart workers for changes to take effect."
}
```
**Notes:**
- Overwrites `.env` file
- Workers must be restarted manually

---

### Analytics

#### `GET /api/analytics`
**Description:** Get performance metrics
**Response:**
```json
{
  "total_jobs": 150,
  "completed_jobs": 120,
  "failed_jobs": 5,
  "avg_processing_time_ms": 1800000,
  "avg_image_gen_time_ms": 720000,
  "avg_render_time_ms": 180000,
  "total_video_duration_seconds": 7200,
  "total_video_size_bytes": 5368709120
}
```

---

### System

#### `GET /api/system/disk-space`
**Description:** Check available disk space
**Response:**
```json
{
  "drive": "C:",
  "free_bytes": 107374182400,
  "free_gb": 100,
  "total_bytes": 536870912000,
  "total_gb": 500,
  "percent_free": 20
}
```

---

### Whisk

#### `POST /api/whisk/token`
**Description:** Update Whisk API token
**Request Body:**
```json
{
  "token": "ya29.a0ATkoCc..."
}
```
**Response:**
```json
{
  "success": true,
  "message": "Whisk token updated"
}
```

---

### Error Responses

All endpoints follow standard error format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "solution": "How to fix this error",
  "details": "Additional context (optional)"
}
```

---

## 5. File Locations Map

Complete directory structure and file organization.

### Project Root

```
C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\
│
├── src/                          # Source code
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/          # Dashboard layout group
│   │   │   ├── broadcasts/       # Broadcasts list page
│   │   │   ├── jobs/[id]/        # Storyboard editor
│   │   │   ├── analytics/        # Analytics dashboard
│   │   │   ├── settings/         # Settings page
│   │   │   ├── terminal/         # API testing terminal
│   │   │   ├── logs/             # Worker logs viewer
│   │   │   ├── personas/         # Persona management
│   │   │   └── wiki/             # Documentation
│   │   ├── api/                  # API routes
│   │   │   ├── jobs/             # Job endpoints
│   │   │   ├── settings/         # Settings endpoint
│   │   │   ├── analytics/        # Analytics endpoint
│   │   │   └── whisk/            # Whisk token endpoint
│   │   └── layout.tsx            # Root layout
│   │
│   ├── components/               # React components
│   │   ├── broadcast/            # Job-specific components
│   │   ├── data/                 # Data tables, grids
│   │   ├── shared/               # Reusable components
│   │   └── ui/                   # Base UI primitives
│   │
│   ├── lib/                      # Core logic
│   │   ├── ai/                   # AI provider integrations
│   │   │   ├── providers/        # Google, Claude, OpenAI, Groq
│   │   │   ├── prompts/          # Script analyzer prompt
│   │   │   └── prompt-sanitizer.ts  # Content policy handling
│   │   ├── queue/                # BullMQ queue system
│   │   │   └── workers/          # Worker implementations
│   │   ├── whisk/                # Whisk API client
│   │   ├── remotion/             # Video rendering
│   │   ├── storage/              # Local file storage
│   │   ├── db/                   # Database utilities
│   │   ├── browser/              # Browser automation
│   │   ├── integrations/         # HeyGen, etc.
│   │   ├── errors/               # Error handling
│   │   └── utils/                # Utility functions
│   │
│   └── remotion/                 # Remotion video project
│       ├── NewsVideo.tsx         # Main composition
│       ├── components/           # Video components
│       └── index.ts              # Composition registry
│
├── public/                       # Static assets
│   ├── avatars/                  # Optimized avatars for Remotion
│   └── fonts/                    # Custom fonts
│
├── tmp/                          # Temporary render output
│   ├── remotion-cache/           # Remotion bundle cache
│   └── {job_id}.mp4             # Rendered videos (temp)
│
├── scripts/                      # Utility scripts
│   ├── optimize-avatar.sh        # Avatar optimization
│   └── run-migration.ts          # Database migrations
│
├── docs/                         # Documentation
│   ├── QUICK_START.md            # Getting started guide
│   ├── USER_GUIDE.md             # Daily workflows
│   ├── REFERENCE.md              # This file
│   ├── WHISK_INTEGRATION.md      # Whisk API details
│   └── REFERENCE_IMAGES_GUIDE.md # Reference images tutorial
│
├── .env                          # Environment variables (NEVER commit)
├── .env.md                       # Env var documentation
├── .gitignore                    # Git ignore rules
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.mjs               # Next.js config
├── tailwind.config.ts            # TailwindCSS config
├── docker-compose.yml            # Database containers
│
├── START.bat                     # Windows startup script
├── STOP.bat                      # Windows shutdown script
│
├── CLAUDE.md                     # AI assistant instructions
├── CHECKPOINT.md                 # Version history
├── HOTKEYS.md                    # Keyboard shortcuts
└── CONTENT_POLICY_HANDLING.md    # Content moderation
```

---

### Local Storage Root

```
C:\Users\konra\ObsidianNewsDesk\
│
├── images/                       # Scene background images
│   └── {scene_id}.jpg            # Individual scene images
│
├── avatars/                      # HeyGen avatar videos
│   └── avatar_{timestamp}.mp4    # Avatar MP4 files
│
└── videos/                       # Final rendered videos
    └── {job_id}.mp4              # Completed broadcast videos
```

**Notes:**
- All paths stored in database as `file:///C:/Users/konra/ObsidianNewsDesk/...`
- Images: 1920x1080 JPG (typically 200-500KB each)
- Avatars: 640x360 MP4, 48kHz AAC (optimized to ~3MB)
- Videos: 1920x1080 MP4, H.264 + AAC 48kHz (15-30MB for 60s video)

---

### Database (Docker)

**Container:** `obsidian_news_postgres`
**Port:** 5432
**Volume:** `obsidian_news_postgres_data` (persists across restarts)

**Tables:**
- `news_jobs` - Job metadata
- `news_scenes` - Scene data
- `job_metrics` - Performance metrics
- `generation_history` - Image generation audit trail

**Access:**
```bash
docker exec -it obsidian_news_postgres psql -U postgres -d obsidian_news
```

---

### Redis (Docker)

**Container:** `obsidian_news_redis`
**Port:** 6379
**Volume:** `obsidian_news_redis_data` (persists across restarts)

**Queues:**
- `queue_analyze` - Script analysis jobs
- `queue_images` - Image generation jobs
- `queue_avatar_automation` - Avatar automation (optional)
- `queue_render` - Video rendering jobs

**Access:**
```bash
docker exec -it obsidian_news_redis redis-cli
```

---

### Important Paths Reference

| Resource | Location |
|----------|----------|
| Project Root | `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\` |
| Storage Root | `C:\Users\konra\ObsidianNewsDesk\` |
| Scene Images | `C:\Users\konra\ObsidianNewsDesk\images\{scene_id}.jpg` |
| Avatars | `C:\Users\konra\ObsidianNewsDesk\avatars\avatar_{timestamp}.mp4` |
| Final Videos | `C:\Users\konra\ObsidianNewsDesk\videos\{job_id}.mp4` |
| Temp Renders | `obsidian-news-desk\tmp\{job_id}.mp4` |
| Environment | `obsidian-news-desk\.env` |
| Database Schema | `obsidian-news-desk\src\lib\db\schema.sql` |
| Workers | `obsidian-news-desk\src\lib\queue\workers\*.worker.ts` |
| Remotion | `obsidian-news-desk\src\remotion\NewsVideo.tsx` |

---

## 6. Environment Variables

Complete `.env` reference with all configurable options.

### Database

```env
# PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:password@localhost:5432/obsidian_news

# Format: postgresql://[username]:[password]@[host]:[port]/[database]
# Default matches Docker Compose configuration
# DO NOT CHANGE unless using external database
```

---

### Redis

```env
# Redis Connection String
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Alternative format (complete URL):
# REDIS_URL=redis://:password@localhost:6379

# Default matches Docker Compose configuration
# Leave REDIS_PASSWORD empty if no auth configured
```

---

### AI Providers

**Select One Provider:**

```env
# AI Provider Selection
AI_PROVIDER=google  # google | claude | openai | groq

# Google AI (Gemini)
GOOGLE_AI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstu
# Get key: https://aistudio.google.com/app/apikey
# Free tier: 60 req/min, 1,500 req/day
# Model: Gemini 1.5

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz
# Get key: https://console.anthropic.com/
# Cost: ~$3 per 1M input tokens (no free tier)
# Model: Claude 3.5 Sonnet

# OpenAI
OPENAI_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz
# Get key: https://platform.openai.com/api-keys
# Cost: ~$5 per 1M input tokens (no free tier)
# Model: GPT-4

# Groq
GROQ_API_KEY=gsk_1234567890abcdefghijklmnopqrstuvwxyz
# Get key: https://console.groq.com/keys
# Free tier: 30 req/min, 14,400 req/day
# Model: Llama 3.1 70B
```

**Only set the API key for your selected AI_PROVIDER.**

---

### Whisk (Image Generation)

```env
# Whisk API Token (Bearer token from Google Whisk)
WHISK_API_TOKEN=ya29.a0ATkoCc1234567890abcdefghijklmnopqrstuvwxyz...

# How to get token:
# 1. Open https://labs.google.com/whisk
# 2. F12 → Network tab
# 3. Generate test image
# 4. Find "generateImage" request
# 5. Copy "Authorization: Bearer ..." header
# 6. Paste entire token (starts with "ya29.a0")

# Token expires every ~1-7 days
# Refresh when image generation fails with 401 errors

# Whisk Model Selection
WHISK_IMAGE_MODEL=IMAGEN_3_5  # IMAGEN_3 | IMAGEN_3_5 | IMAGEN_4

# IMAGEN_3: Stable, fast
# IMAGEN_3_5: Recommended (default)
# IMAGEN_4: Beta, higher quality but slower

# Whisk Concurrency (parallel image generation)
WHISK_CONCURRENCY=2           # 1-5
WHISK_MIN_CONCURRENCY=2       # Auto-scaling min
WHISK_MAX_CONCURRENCY=5       # Auto-scaling max

# Higher = faster, but risks rate limits/bans
# Recommended: 2 for production, 1 if frequently banned
```

---

### Avatar (HeyGen)

```env
# Avatar Generation Mode
AVATAR_MODE=manual  # manual | automated

# manual: Launch browser, generate manually, upload MP4
# automated: Python browser automation (requires setup)

# Browser Type (for manual mode)
BROWSER_TYPE=edge  # edge | chrome | chromium

# Browser launched when clicking "LAUNCH HEYGEN BROWSER"
# Avatar script automatically copied to clipboard
```

---

### Remotion (Video Rendering)

```env
# Remotion Timeout (milliseconds)
REMOTION_TIMEOUT_MS=120000  # 120 seconds

# Increase if rendering large videos or slow system
# Max: 600000 (10 minutes)
# Decrease for faster feedback on errors

# Remotion Concurrency (parallel frame rendering)
REMOTION_CONCURRENCY=4  # 2-8

# Number of CPU cores to use for rendering
# Higher = faster, but uses more CPU/RAM
# Recommended:
#   4 cores or less: 2
#   6-8 cores: 4
#   12+ cores: 8

# Remotion Bundle Cache Directory
REMOTION_BUNDLE_CACHE_DIR=./tmp/remotion-cache

# Where Remotion stores compiled bundles
# Speeds up subsequent renders
# Can safely delete to free space
```

---

### Local Storage

```env
# Local Storage Root Path
LOCAL_STORAGE_ROOT=C:\Users\konra\ObsidianNewsDesk

# Where images, avatars, and videos are stored
# Must be absolute path
# Subdirectories auto-created:
#   - images/   (scene backgrounds)
#   - avatars/  (HeyGen MP4 files)
#   - videos/   (final rendered videos)

# Change to different drive if C: runs low on space
# Example: D:\Obsidian\Storage
```

---

### Server

```env
# Server Port
PORT=8347

# Port for Next.js dev server
# Change if 8347 conflicts with another service

# Node Environment
NODE_ENV=development  # development | production

# development: Hot reload, detailed errors
# production: Optimized builds, must run `npm run build` first
```

---

### Optional Variables

These have sensible defaults and can be omitted.

```env
# Image Generation Delay (milliseconds between requests)
IMAGE_GENERATION_DELAY=60000  # 60 seconds

# Delay between image generation requests to avoid bans
# Increase if frequently triggering Whisk ban detection
# Decrease for faster generation (risky)

# Max Retries (failed image generation)
MAX_RETRIES=3

# Number of times to retry failed scene generation
# Increase for unstable networks
# Decrease to fail fast

# Max Prompt Sanitization Attempts
MAX_PROMPT_SANITIZATION_ATTEMPTS=3

# How many times to rewrite prompt after content policy violation
# Uses AI to make prompt compliant
# Increase for controversial content
# Decrease to fail fast and use fallback prompts

# Retry Backoff Base (milliseconds)
RETRY_BACKOFF_BASE=5000  # 5 seconds

# Base delay for exponential backoff on retries
# Retry delays: 5s, 10s, 20s (for 3 retries)
```

---

### Environment Variable Reference Table

| Variable | Required | Default | Type | Purpose |
|----------|----------|---------|------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL local | String | Database connection |
| `REDIS_HOST` | ✅ Yes | `localhost` | String | Redis hostname |
| `REDIS_PORT` | ✅ Yes | `6379` | Number | Redis port |
| `REDIS_PASSWORD` | ❌ No | Empty | String | Redis auth password |
| `AI_PROVIDER` | ✅ Yes | None | Enum | Which LLM to use |
| `GOOGLE_AI_API_KEY` | ⚠️ If Google | None | String | Google AI API key |
| `ANTHROPIC_API_KEY` | ⚠️ If Claude | None | String | Claude API key |
| `OPENAI_API_KEY` | ⚠️ If OpenAI | None | String | OpenAI API key |
| `GROQ_API_KEY` | ⚠️ If Groq | None | String | Groq API key |
| `WHISK_API_TOKEN` | ✅ Yes | None | String | Whisk bearer token |
| `WHISK_IMAGE_MODEL` | ❌ No | `IMAGEN_3_5` | Enum | Whisk model |
| `WHISK_CONCURRENCY` | ❌ No | `2` | Number | Parallel image gen |
| `AVATAR_MODE` | ❌ No | `manual` | Enum | Avatar generation mode |
| `BROWSER_TYPE` | ❌ No | `edge` | Enum | Browser for manual mode |
| `REMOTION_TIMEOUT_MS` | ❌ No | `120000` | Number | Render timeout |
| `REMOTION_CONCURRENCY` | ❌ No | `4` | Number | Render threads |
| `REMOTION_BUNDLE_CACHE_DIR` | ❌ No | `./tmp/remotion-cache` | String | Bundle cache path |
| `LOCAL_STORAGE_ROOT` | ✅ Yes | `C:\Users\konra\ObsidianNewsDesk` | String | File storage path |
| `PORT` | ❌ No | `8347` | Number | Server port |
| `NODE_ENV` | ❌ No | `development` | Enum | Node environment |
| `IMAGE_GENERATION_DELAY` | ❌ No | `60000` | Number | Delay between images |
| `MAX_RETRIES` | ❌ No | `3` | Number | Retry failed scenes |
| `MAX_PROMPT_SANITIZATION_ATTEMPTS` | ❌ No | `3` | Number | Content policy retries |
| `RETRY_BACKOFF_BASE` | ❌ No | `5000` | Number | Exponential backoff base |

---

### Example `.env` Files

**Minimal (Google AI):**

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/obsidian_news
REDIS_HOST=localhost
REDIS_PORT=6379
AI_PROVIDER=google
GOOGLE_AI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstu
WHISK_API_TOKEN=ya29.a0ATkoCc...
LOCAL_STORAGE_ROOT=C:\Users\konra\ObsidianNewsDesk
```

**Full Configuration:**

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/obsidian_news

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI Provider
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz

# Whisk
WHISK_API_TOKEN=ya29.a0ATkoCc...
WHISK_IMAGE_MODEL=IMAGEN_3_5
WHISK_CONCURRENCY=2
WHISK_MIN_CONCURRENCY=2
WHISK_MAX_CONCURRENCY=5

# Avatar
AVATAR_MODE=manual
BROWSER_TYPE=edge

# Remotion
REMOTION_TIMEOUT_MS=120000
REMOTION_CONCURRENCY=4
REMOTION_BUNDLE_CACHE_DIR=./tmp/remotion-cache

# Storage
LOCAL_STORAGE_ROOT=C:\Users\konra\ObsidianNewsDesk

# Server
PORT=8347
NODE_ENV=development

# Optional
IMAGE_GENERATION_DELAY=60000
MAX_RETRIES=3
MAX_PROMPT_SANITIZATION_ATTEMPTS=3
RETRY_BACKOFF_BASE=5000
```

---

## 7. Glossary of Terms

Alphabetical reference of technical terms and concepts.

### Avatar
AI-generated talking head video (from HeyGen) composited over scene backgrounds in final video. Uses WebGL chromakey for green screen removal. Must be MP4 format with 48kHz audio.

### Ban Detection
System that pauses image generation queue when >5 failed generations occur in 5 minutes, preventing Whisk API rate limit violations. Auto-resumes after cooldown period.

### Body
Video content after first 15 seconds. Uses sentence-based image transitions (parses word timestamps from Whisper to find sentence boundaries).

### BullMQ
Job queue system for background workers. Manages four queues: analyze, images, avatar_automation, render. Built on Redis.

### Chromakey
Green screen removal technique for avatar compositing. Uses WebGL shader to remove green pixels and make avatar background transparent.

### Completion
Terminal job status indicating video is ready to download. Final MP4 available at `final_video_url`.

### Concurrency
Number of parallel operations. `REMOTION_CONCURRENCY` controls parallel frame rendering, `WHISK_CONCURRENCY` controls parallel image generation.

### Content Policy
AI image generation restrictions preventing generation of violent, explicit, or copyrighted content. System auto-sanitizes prompts to bypass violations.

### Docker Compose
Tool for running PostgreSQL and Redis in containers. Configured in `docker-compose.yml`. Start with `docker-compose up -d`.

### Generation History
Audit trail table tracking all image generation attempts for debugging. Stores prompts, seeds, success/failure, and error messages.

### Hook
First 15 seconds of video with fast 1.5s image transitions to grab viewer attention. Fixed timing regardless of script content.

### HeyGen
Third-party service for AI avatar generation. Manual mode: launch browser, generate manually. Automated mode: Python automation (optional).

### Job
A single broadcast from script input to final video output. Progresses through states: pending → analyzing → generating_images → review_assets → rendering → completed.

### Job Metrics
Performance tracking table storing timing and resource usage for each job. Used by analytics dashboard.

### Ken Burns Effect
Slow zoom/pan animation on static images for dynamic feel. Implemented with Remotion `<Scale>` and `<Translate>` components.

### Next.js App Router
Modern Next.js routing system using file-based routes in `src/app/` directory. Supports Server Components and API routes.

### Pacing Logic
Algorithm determining when images transition in video. Hook: 1.5s fixed. Body: sentence-based (uses Whisper word timestamps).

### Queue
Background processing pipeline. Four queues: `queue_analyze` (script analysis), `queue_images` (image generation), `queue_avatar_automation` (avatar automation), `queue_render` (video compilation).

### Reference Image
Guide image for AI generation (subject, scene, or style). Uploaded to control specific visual characteristics of generated images.

### Remotion
React-based video rendering framework. Converts React components to MP4 videos. Renders at 1920x1080, 30fps.

### Review Assets
Manual checkpoint status requiring human review before rendering. User must upload avatar to proceed.

### Scene
One image + ticker headline in the video. Typically 6-8 scenes per 60-second video. Each scene has independent generation status.

### Seed
Random number used to make image generation reproducible. Same seed + same prompt = same image.

### State Machine
Job status progression system enforcing strict order: pending → analyzing → generating_images → review_assets → rendering → completed.

### Storyboard
Visual layout of all scenes for review and editing. Shows images, ticker headlines, and generation status. Supports keyboard navigation.

### Ticker
Scrolling text overlay at bottom of video showing scene headlines. Implemented with CSS `<marquee>` element in Remotion.

### Transcript
Word-level timing information from Whisper. Used for sentence-based pacing in video body. Format: `{word, start, end}`.

### Whisk
Google's image generation API (powered by Imagen). Supports reference images for subject/scene/style control. Requires bearer token authentication.

### Worker
Background process that handles one queue. Three workers: analyze.worker.ts, images.worker.ts, render.worker.ts. Started with `npm run workers`.

### Workflow ID
Unique identifier for Whisk API request. Stored in database for debugging failed generations.

---

## 8. Frequently Asked Questions

### General

#### Q: How long does each step take?
**A:**
- Analysis: 30-60 seconds
- Image generation: 8-12 minutes (8 scenes @ ~1 min each)
- Manual avatar: 3-5 minutes (user-dependent)
- Rendering: 2-4 minutes
- **Total:** 15-25 minutes for complete 60-second video

---

#### Q: How much does it cost per video?
**A:** Depends on AI provider and usage:
- **Google AI (Gemini):** Free tier (60 req/min)
- **Whisk (Image gen):** Free (requires login refresh every few days)
- **HeyGen (Avatar):** ~$0.20-0.50 per avatar (subscription)
- **Total:** ~$0.20-0.50 per video (mostly HeyGen cost)

**Cost breakdown:**
- Script analysis: $0 (Google AI free tier) or ~$0.05 (Claude/OpenAI)
- Image generation: $0 (Whisk free)
- Avatar generation: $0.20-0.50 (HeyGen)
- Rendering: $0 (local)

---

#### Q: Can I use my own images?
**A:** Yes! Press `U` on any scene in storyboard editor to upload custom image. Recommended 16:9 aspect ratio (1920x1080). Supports PNG, JPG, WebP. Max 10MB.

---

#### Q: What video formats are supported?
**A:**
- **Output:** MP4 (H.264 codec, AAC 48kHz audio)
- **Input avatars:** MP4 only (H.264 codec, AAC 48kHz audio)
- **Input images:** PNG, JPG, WebP (16:9 recommended)

---

### Setup & Configuration

#### Q: How do I get a Whisk API token?
**A:**
1. Open https://labs.google.com/whisk in browser
2. Press F12 → Switch to Network tab
3. Generate a test image in Whisk UI
4. Find request to "generateImage" in network log
5. Click request → Headers tab
6. Copy "Authorization" header (entire value: "Bearer ya29.a0...")
7. Paste in Settings page → WHISK API TOKEN field
8. Save settings
9. Restart workers

Token expires every ~1-7 days. Refresh when image generation fails with 401 errors.

---

#### Q: Why 48kHz audio for avatars?
**A:** Remotion requires exact audio sample rate match for lip sync. 48kHz is video standard (DVD, Blu-ray, YouTube). Mismatched sample rates cause:
- Audio drift (out of sync)
- Pitch changes
- Stuttering/gaps

HeyGen exports 48kHz by default. If using different avatar source, re-encode:
```bash
ffmpeg -i input.mp4 -ar 48000 -c:v copy -c:a aac output.mp4
```

---

#### Q: What happens if I regenerate too many times?
**A:** System has ban detection to protect against Whisk rate limits:
- >5 failed regenerations in 5 minutes → Queue pauses automatically
- Wait ~5 minutes for cooldown
- Resume queue manually via UI
- Consider uploading custom images instead of regenerating

**Why it happens:**
- Whisk enforces undocumented rate limits
- Too many rapid requests = temporary ban
- System pauses to avoid permanent ban

---

#### Q: Can I cancel a job mid-render?
**A:** Yes, but render will complete current frame before stopping.

**Steps:**
1. Go to broadcasts list
2. Find job with status `rendering`
3. Click "Cancel" button
4. Confirm cancellation
5. Current frame finishes, then render stops
6. Job marked as `cancelled`

**Notes:**
- Partial video may exist in tmp/ directory
- All scene images preserved
- Can view storyboard editor to see progress

---

### AI Providers

#### Q: How do I change AI providers?
**A:**
1. Go to Settings page
2. Select AI Provider dropdown (Google/Claude/OpenAI/Groq)
3. Enter corresponding API key
4. Click "Save All Settings"
5. Restart workers:
   ```bash
   STOP.bat
   START.bat
   ```

**Recommendation:** Use Google AI (free tier, 60 req/min, good quality).

---

#### Q: What if my script is too short/long?
**A:**
- **Minimum:** 100 characters (enforced by validation)
- **Maximum:** ~2000 characters (results in ~8 scenes max)
- **Recommended:** 500-1500 characters for 6-8 scenes

**Too short (<100 chars):**
- Error: "Script too short"
- Solution: Add more content

**Too long (>2000 chars):**
- AI truncates to ~8 scenes
- Not ideal for 60s video (transitions too fast)
- Solution: Split into multiple shorter scripts

---

### Performance & Optimization

#### Q: Can I run multiple jobs simultaneously?
**A:** Yes! Queue processes jobs in parallel with configurable concurrency:
- Analysis queue: 2 concurrent jobs
- Image queue: 2-5 concurrent scenes (per job)
- Render queue: 1 job at a time (sequential)

**Example:** Can analyze 2 jobs while generating images for 3 other jobs.

**Limitations:**
- Render queue sequential (only 1 video renders at once)
- Too many parallel operations → system slowdown
- Whisk concurrency >5 → ban risk

---

#### Q: How do I backup my videos?
**A:**
1. **Manual backup:**
   - Copy `C:\Users\konra\ObsidianNewsDesk\videos\` to external drive
   - Copy `C:\Users\konra\ObsidianNewsDesk\avatars\` (reusable avatars)

2. **Database backup:**
   ```bash
   docker exec obsidian_news_postgres pg_dump -U postgres obsidian_news > backup.sql
   ```

3. **Restore database:**
   ```bash
   docker exec -i obsidian_news_postgres psql -U postgres obsidian_news < backup.sql
   ```

**Recommended schedule:**
- Weekly backup of videos (if long-term storage needed)
- Monthly database backup
- Keep 2-3 most recent avatars for reuse

---

#### Q: Can I use different avatar voices?
**A:** Yes! HeyGen offers multiple avatars with different:
- Voices (male/female, accents, tones)
- Appearances (age, ethnicity, clothing)
- Expressions (professional, friendly, serious)

**Steps:**
1. Click "LAUNCH HEYGEN BROWSER" in storyboard editor
2. Select different avatar from HeyGen library
3. Generate with same avatar script
4. Download new MP4
5. Upload to job

**Tip:** Save favorite avatars to reuse across jobs (upload to `public/avatars/` for quick access).

---

### Troubleshooting

#### Q: What if image generation fails?
**A:**
1. Check scene status in storyboard editor
2. Read error message (hover over red "failed" badge)
3. Common causes:
   - "Content policy violation" → Auto-sanitization attempted
   - "401 Unauthorized" → Whisk token expired (refresh token)
   - "Network error" → Check internet connection
4. Click "Regenerate" button to retry
5. If still fails after 3 attempts → Upload custom image (press `U`)

---

#### Q: How do I optimize large avatar files?
**A:** Use provided optimization script:

```bash
cd obsidian-news-desk
./scripts/optimize-avatar.sh "C:\path\to\large_avatar.mp4" "optimized_avatar.mp4"
```

**What it does:**
- Resizes to 640x360 (smaller resolution)
- Re-encodes to H.264 (web-optimized)
- Converts audio to 48kHz AAC
- Reduces file size ~90% (30MB → 3MB)
- Preserves quality for video overlay

**When to use:**
- Avatar >10MB
- Upload fails with "file too large" error
- Remotion times out loading avatar

---

#### Q: Can I customize ticker text?
**A:** Yes! Ticker headlines are editable:

1. Navigate to storyboard editor
2. Find scene you want to edit
3. Press `E` or click "Edit" button
4. Type new headline text
5. Press Enter to save (or Escape to cancel)

**Tips:**
- Keep headlines <200 characters (database limit)
- ALL CAPS for dramatic effect
- Use "BREAKING:" prefix for urgency
- Ticker scrolls all headlines in scene order

---

#### Q: What aspect ratio should custom images be?
**A:** **16:9 is recommended** (e.g., 1920x1080, 1280x720, 3840x2160).

**Why 16:9:**
- Matches final video resolution (1920x1080)
- No black bars or cropping
- Optimal for Ken Burns effect

**Other ratios:**
- **4:3** (e.g., 1024x768) → Letterboxed (black bars on sides)
- **1:1** (e.g., 1080x1080) → Cropped to 16:9 (top/bottom cut off)
- **21:9** (e.g., 2560x1080) → Pillarboxed (black bars top/bottom)

**Recommendation:** Resize all custom images to 1920x1080 before uploading.

---

#### Q: How do I update the system?
**A:**
1. Backup database and videos (see backup question above)
2. Pull latest code:
   ```bash
   cd obsidian-news-desk
   git pull origin main
   ```
3. Check `CHANGELOG.md` for breaking changes
4. Install new dependencies:
   ```bash
   npm install
   ```
5. Run database migrations (if any):
   ```bash
   npx tsx scripts/run-migration.ts migrations/001_add_reference_images.sql
   ```
6. Restart system:
   ```bash
   STOP.bat
   START.bat
   ```

**⚠️ Always backup before upgrading!**

---

#### Q: Can I use this commercially?
**A:** **Yes, but check third-party terms:**

**Obsidian News Desk:** MIT license (free commercial use)

**Third-party services:**
- **HeyGen:** Check subscription plan for commercial usage limits
- **Google AI (Gemini):** Free tier allows commercial use (verify ToS)
- **Whisk:** Check Google Labs terms (may be experimental/restricted)
- **Anthropic Claude:** Pay-as-you-go allows commercial use
- **OpenAI:** Pay-as-you-go allows commercial use

**Recommendation:** Review each service's terms for your use case.

---

#### Q: What if Docker won't start?
**A:**

**Check 1: Docker Desktop running?**
- Look for whale icon in system tray
- If not running, launch Docker Desktop app

**Check 2: Ports available?**
- PostgreSQL needs port 5432
- Redis needs port 6379
- Check for conflicts:
  ```bash
  netstat -ano | findstr :5432
  netstat -ano | findstr :6379
  ```

**Check 3: Containers exist?**
```bash
docker ps -a
```
Should show `obsidian_news_postgres` and `obsidian_news_redis`

**Fix: Recreate containers:**
```bash
docker-compose down
docker-compose up -d
```

**Check logs:**
```bash
docker-compose logs postgres
docker-compose logs redis
```

---

## 9. Advanced Usage

### State Machine Internals

**State Progression Rules:**

```typescript
// Allowed transitions
const transitions = {
  pending: ['analyzing', 'cancelled'],
  analyzing: ['generating_images', 'failed', 'cancelled'],
  generating_images: ['review_assets', 'failed', 'cancelled'],
  review_assets: ['rendering', 'cancelled'],  // Manual only
  rendering: ['completed', 'failed', 'cancelled'],
  completed: [],  // Terminal
  failed: [],     // Terminal
  cancelled: []   // Terminal
};
```

**Entry Conditions:**
- `analyzing`: Raw script must be present
- `generating_images`: Avatar script + scenes generated
- `review_assets`: All scenes must have status `completed`
- `rendering`: Avatar MP4 uploaded
- `completed`: Final video file exists

**Exit Conditions:**
- `pending`: Job added to `queue_analyze`
- `analyzing`: Scenes created in database
- `generating_images`: All scenes have `generation_status = completed`
- `review_assets`: `avatar_mp4_url` field populated
- `rendering`: `final_video_url` field populated

**State Logging:**
- Every state change updates `news_jobs.updated_at`
- Errors logged to `news_jobs.error_message`
- Metrics recorded in `job_metrics` table

---

### Queue System Architecture

**Queue Configuration:**

```typescript
// queue_analyze
{
  concurrency: 2,           // Process 2 jobs simultaneously
  attempts: 3,              // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',    // 5s, 10s, 20s delays
    delay: 5000
  }
}

// queue_images
{
  concurrency: 2-5,         // Dynamic (WHISK_CONCURRENCY)
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  },
  limiter: {                // Rate limiting
    max: 1,                 // 1 job per interval
    duration: 60000         // 60 seconds
  }
}

// queue_render
{
  concurrency: 1,           // Sequential (heavy CPU)
  attempts: 2,              // Fewer retries (long process)
  timeout: 120000           // 2 minute timeout
}
```

**Job Data Structure:**

```typescript
// queue_analyze job
{
  jobId: 'uuid',
  rawScript: 'Breaking news: ...'
}

// queue_images job (per scene)
{
  jobId: 'uuid',
  sceneId: 'uuid',
  prompt: 'Photorealistic image of...',
  referenceImages: {
    subject: 'file:///...',
    scene: 'file:///...',
    style: 'file:///...'
  }
}

// queue_render job
{
  jobId: 'uuid',
  avatarUrl: 'file:///...',
  scenes: [
    { imageUrl: '...', tickerHeadline: '...' }
  ]
}
```

**Retry Logic:**
- 1st failure: Retry after 5 seconds
- 2nd failure: Retry after 10 seconds (exponential)
- 3rd failure: Mark job as failed, log error

**Queue Monitoring:**
```bash
# Via Redis CLI
docker exec -it obsidian_news_redis redis-cli

# Check queue length
LLEN bull:queue_analyze:wait
LLEN bull:queue_images:wait
LLEN bull:queue_render:wait

# Check failed jobs
LLEN bull:queue_analyze:failed
```

---

### Database Schema Deep Dive

**`news_jobs` Table:**

```sql
CREATE TABLE news_jobs (
    id UUID PRIMARY KEY,
    status VARCHAR(50) CHECK (status IN (...)),
    raw_script TEXT NOT NULL,           -- Original user input
    avatar_script TEXT,                 -- AI-generated TTS script
    avatar_mp4_url TEXT,                -- Local file path
    final_video_url TEXT,               -- Local file path
    error_message TEXT,                 -- Last error (if failed)
    cancellation_reason TEXT,           -- User note (if cancelled)
    created_at TIMESTAMP,
    updated_at TIMESTAMP                -- Auto-updated on changes
);
```

**Indexes:**
- `idx_news_jobs_status` - Fast filtering by status
- `idx_news_jobs_created_at` - Chronological sorting
- `idx_news_jobs_script_search` - Full-text search (GIN index)

---

**`news_scenes` Table:**

```sql
CREATE TABLE news_scenes (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES news_jobs ON DELETE CASCADE,
    scene_order INTEGER NOT NULL,      -- 0, 1, 2, ... (display order)
    image_prompt TEXT NOT NULL,        -- AI generation prompt
    ticker_headline VARCHAR(200),      -- Scrolling ticker text
    image_url TEXT,                    -- Local file path
    generation_status VARCHAR(50),     -- pending|generating|completed|failed
    generation_params JSONB,           -- {seed, model, hadReferences}
    reference_images JSONB,            -- {subject, scene, style}
    whisk_request_id VARCHAR(255),     -- Whisk API workflow ID
    error_message TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(job_id, scene_order)        -- Enforce sequential ordering
);
```

**Cascade Delete:**
- Deleting job → Deletes all scenes
- Deleting scene → Deletes generation_history entries

---

**`job_metrics` Table:**

```sql
CREATE TABLE job_metrics (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES news_jobs ON DELETE CASCADE,

    -- Timing (milliseconds)
    analysis_time_ms INTEGER,
    total_image_gen_time_ms INTEGER,
    avatar_gen_time_ms INTEGER,
    render_time_ms INTEGER,
    total_processing_time_ms INTEGER,

    -- Resources
    scene_count INTEGER,
    final_video_size_bytes BIGINT,
    final_video_duration_seconds REAL,

    -- Quality
    failed_scenes_count INTEGER,
    retry_count INTEGER,

    created_at TIMESTAMP,
    UNIQUE(job_id)
);
```

**Used by:** Analytics dashboard (`/analytics` page)

---

**`generation_history` Table:**

```sql
CREATE TABLE generation_history (
    id UUID PRIMARY KEY,
    scene_id UUID REFERENCES news_scenes ON DELETE CASCADE,
    job_id UUID,                       -- Denormalized for queries
    attempt_number INTEGER,            -- 1, 2, 3...
    image_url TEXT,                    -- Result (null if failed)
    generation_params JSONB,           -- {prompt, seed, model, ...}
    whisk_request_id TEXT,             -- For debugging
    success BOOLEAN,
    error_message TEXT,
    generation_time_ms INTEGER,
    created_at TIMESTAMP
);
```

**Purpose:**
- Audit trail for all image generations
- Debug failed generations
- Analyze prompt effectiveness
- Track sanitization attempts

**Query example:**
```sql
-- Find scenes with >2 failed attempts
SELECT scene_id, COUNT(*) as failures
FROM generation_history
WHERE success = false
GROUP BY scene_id
HAVING COUNT(*) > 2;
```

---

### Remotion Pacing Logic

**Hook Pacing (0-15 seconds):**

```typescript
// Fixed 1.5s per image transition
const HOOK_DURATION = 15;  // seconds
const HOOK_TRANSITION = 1.5;  // seconds per image

const hookImages = Math.min(
  Math.floor(HOOK_DURATION / HOOK_TRANSITION),
  scenes.length
);  // Max 10 images in hook

// Hook uses first N scenes
const hookScenes = scenes.slice(0, hookImages);
```

**Body Pacing (15s+):**

```typescript
// Sentence-based transitions using Whisper transcript
const bodyScenes = scenes.slice(hookImages);
const bodyDuration = totalDuration - HOOK_DURATION;

// Parse transcript into sentences
const sentences = parseTranscriptIntoSentences(transcript);

// Assign scenes to sentences
const sceneTiming = assignScenesToSentences(
  bodyScenes,
  sentences,
  bodyDuration
);

// Result: [
//   { scene: scene1, startTime: 15.0, endTime: 22.3 },
//   { scene: scene2, startTime: 22.3, endTime: 35.1 },
//   ...
// ]
```

**Sentence Detection:**

```typescript
function parseTranscriptIntoSentences(words) {
  const sentences = [];
  let currentSentence = [];

  for (const word of words) {
    currentSentence.push(word);

    // Sentence boundary detection
    if (
      word.text.endsWith('.') ||
      word.text.endsWith('!') ||
      word.text.endsWith('?')
    ) {
      sentences.push(currentSentence);
      currentSentence = [];
    }
  }

  return sentences;
}
```

**Coverage Guarantee:**

```typescript
// Ensure no black frames (continuous scene coverage)
function assignScenesToSentences(scenes, sentences, duration) {
  const timing = [];
  const sentencesPerScene = sentences.length / scenes.length;

  for (let i = 0; i < scenes.length; i++) {
    const startSentence = Math.floor(i * sentencesPerScene);
    const endSentence = Math.floor((i + 1) * sentencesPerScene);

    const startTime = sentences[startSentence][0].start;
    const endTime = sentences[endSentence - 1][sentences[endSentence - 1].length - 1].end;

    timing.push({
      scene: scenes[i],
      startTime: startTime + HOOK_DURATION,
      endTime: endTime + HOOK_DURATION
    });
  }

  return timing;
}
```

---

### Content Policy Handling

**Sanitization Tiers:**

**Tier 1: Quick Sanitization (Rule-Based)**
```typescript
// Instant, no API call
const rules = [
  { pattern: /\b(Biden|Trump|Harris)\b/gi, replacement: 'political leader' },
  { pattern: /\b(Democrat|Republican)\b/gi, replacement: 'government official' },
  { pattern: /\bconfederate flag\b/gi, replacement: 'historical flag' },
  // ... 50+ rules
];

function quickSanitize(prompt: string): string {
  let sanitized = prompt;
  for (const { pattern, replacement } of rules) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}
```

**Tier 2: AI Sanitization (GPT-4)**
```typescript
// If quick sanitization fails, use AI rewrite
const systemPrompt = `
You are a prompt sanitizer for image generation.
Rewrite the following prompt to be content policy compliant:
- Remove specific names
- Use neutral language
- Keep visual details
- Preserve journalistic value

Attempt ${attemptNumber}/3:
${attemptNumber === 1 ? 'Make MINIMAL changes' : ''}
${attemptNumber === 2 ? 'Be more aggressive' : ''}
${attemptNumber === 3 ? 'Use abstract/generic terms' : ''}
`;

const sanitized = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: originalPrompt }
  ]
});
```

**Tier 3: Fallback Prompts (Ultra-Safe)**
```typescript
const fallbacks = [
  "Photorealistic image of the United States Capitol building exterior",
  "Professional photograph of modern government building facade",
  "Abstract visualization of political data, clean infographic style",
  "High-quality stock photo of legislative chamber interior"
];

function getFallbackPrompt(index: number): string {
  return fallbacks[index % fallbacks.length];
}
```

**Error Detection:**
```typescript
function isPolicyViolation(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  const keywords = [
    'content policy',
    'safety',
    'inappropriate',
    'violated',
    'blocked',
    'prohibited'
  ];

  return (
    (error.status === 400 || error.status === 403) &&
    keywords.some(kw => message.includes(kw))
  );
}
```

**Retry Flow:**
```typescript
async function generateImageWithSanitization(prompt: string) {
  let currentPrompt = quickSanitize(prompt);  // Tier 1

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const image = await whiskAPI.generate(currentPrompt);
      return image;
    } catch (error) {
      if (!isPolicyViolation(error)) throw error;

      if (attempt < 3) {
        currentPrompt = await sanitizePrompt(currentPrompt, error, attempt);  // Tier 2
      } else {
        currentPrompt = getFallbackPrompt(attempt);  // Tier 3
      }
    }
  }

  throw new Error('All sanitization attempts failed');
}
```

---

### Performance Tuning

**CPU-Bound Operations:**

```env
# Increase for powerful systems (12+ cores)
REMOTION_CONCURRENCY=8

# Decrease for low-end systems (4 cores or less)
REMOTION_CONCURRENCY=2
```

**Network-Bound Operations:**

```env
# Increase for fast internet, stable Whisk API
WHISK_CONCURRENCY=5

# Decrease if frequently banned
WHISK_CONCURRENCY=1
```

**Memory Optimization:**

```typescript
// Remotion cache cleanup (run weekly)
import { cleanupRemotionCache } from '@/lib/remotion/cache';

await cleanupRemotionCache({
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  maxSize: 5 * 1024 * 1024 * 1024   // 5GB
});
```

**Database Optimization:**

```sql
-- Vacuum database monthly
VACUUM ANALYZE news_jobs;
VACUUM ANALYZE news_scenes;
VACUUM ANALYZE job_metrics;

-- Reindex for performance
REINDEX TABLE news_jobs;
REINDEX TABLE news_scenes;
```

---

### Backup and Recovery

**Full System Backup:**

```bash
#!/bin/bash
# backup.sh - Run weekly

# Database
docker exec obsidian_news_postgres pg_dump -U postgres obsidian_news > backup_$(date +%Y%m%d).sql

# Videos
robocopy "C:\Users\konra\ObsidianNewsDesk\videos" "D:\Backups\ObsidianNewsDesk\videos" /MIR

# Avatars (reusable)
robocopy "C:\Users\konra\ObsidianNewsDesk\avatars" "D:\Backups\ObsidianNewsDesk\avatars" /MIR

# Configuration
cp .env .env.backup
```

**Restore Procedure:**

```bash
# 1. Stop system
STOP.bat

# 2. Restore database
docker exec -i obsidian_news_postgres psql -U postgres obsidian_news < backup_20260322.sql

# 3. Restore files
robocopy "D:\Backups\ObsidianNewsDesk\videos" "C:\Users\konra\ObsidianNewsDesk\videos" /MIR
robocopy "D:\Backups\ObsidianNewsDesk\avatars" "C:\Users\konra\ObsidianNewsDesk\avatars" /MIR

# 4. Restore config
cp .env.backup .env

# 5. Start system
START.bat
```

---

### System Upgrade Guidelines

**Pre-Upgrade Checklist:**

1. ✅ Backup database and videos
2. ✅ Read `CHANGELOG.md` for breaking changes
3. ✅ Check Node.js version compatibility
4. ✅ Note current `.env` settings

**Upgrade Steps:**

```bash
# 1. Backup
./scripts/backup.sh

# 2. Pull latest code
git pull origin main

# 3. Check for breaking changes
cat CHANGELOG.md

# 4. Install dependencies
npm install

# 5. Run migrations (if any)
npx tsx scripts/run-migration.ts migrations/001_new_feature.sql

# 6. Update .env (if needed)
# Compare .env.example with current .env

# 7. Test with single job
npm run dev
# Create test job, verify all stages work

# 8. Deploy
STOP.bat
START.bat
```

**Rollback (if upgrade fails):**

```bash
# 1. Stop system
STOP.bat

# 2. Restore database
docker exec -i obsidian_news_postgres psql -U postgres obsidian_news < backup_YYYYMMDD.sql

# 3. Restore code
git checkout <previous-commit>

# 4. Restore config
cp .env.backup .env

# 5. Reinstall dependencies
npm install

# 6. Start system
START.bat
```

---

## 10. Support & Resources

### Documentation

**User Documentation:**
- [Quick Start Guide](QUICK_START.md) - First-time setup and basic usage
- [User Guide](USER_GUIDE.md) - Daily workflows and common tasks
- [Reference Manual](REFERENCE.md) - This file (complete technical reference)

**Technical Documentation:**
- [CLAUDE.md](../CLAUDE.md) - System architecture for developers
- [CHECKPOINT.md](../CHECKPOINT.md) - Version history and changelogs
- [.env.md](../.env.md) - Environment variable detailed guide

**Feature Documentation:**
- [HOTKEYS.md](../HOTKEYS.md) - Keyboard shortcuts reference
- [CONTENT_POLICY_HANDLING.md](../CONTENT_POLICY_HANDLING.md) - Content moderation internals
- [WHISK_INTEGRATION.md](WHISK_INTEGRATION.md) - Whisk API integration guide
- [REFERENCE_IMAGES_GUIDE.md](REFERENCE_IMAGES_GUIDE.md) - Reference images tutorial
- [WHISK_TOKEN_SETUP.md](WHISK_TOKEN_SETUP.md) - Token refresh instructions

---

### External Resources

**AI Providers:**
- Google AI Studio: https://aistudio.google.com/
- Anthropic Claude: https://console.anthropic.com/
- OpenAI Platform: https://platform.openai.com/
- Groq Console: https://console.groq.com/

**Image Generation:**
- Google Whisk: https://labs.google.com/whisk
- Whisk API Docs: (Check Google Labs documentation)

**Avatar Generation:**
- HeyGen: https://heygen.com/
- HeyGen Docs: https://docs.heygen.com/

**Video Rendering:**
- Remotion: https://remotion.dev/
- Remotion Docs: https://remotion.dev/docs/
- Remotion Discord: https://remotion.dev/discord

**Queue System:**
- BullMQ: https://docs.bullmq.io/
- Redis: https://redis.io/documentation

**Database:**
- PostgreSQL: https://www.postgresql.org/docs/
- Supabase: https://supabase.com/docs (if using Supabase hosting)

---

### GitHub

**Repository:** (Replace with actual URL)
```
https://github.com/konradschrein-star/pol-production-line
```

**Issues:**
- Report bugs: https://github.com/.../issues/new?template=bug_report.md
- Feature requests: https://github.com/.../issues/new?template=feature_request.md
- View open issues: https://github.com/.../issues

**Releases:**
- Latest version: https://github.com/.../releases/latest
- All releases: https://github.com/.../releases

**Discussions:**
- Q&A: https://github.com/.../discussions/categories/q-a
- Ideas: https://github.com/.../discussions/categories/ideas

---

### Community & Support

**Getting Help:**

1. **Check Documentation:**
   - Search this reference manual (Ctrl+F)
   - Check FAQ section above
   - Review error codes section

2. **Check Logs:**
   - Worker logs: `npm run workers` (check console output)
   - Browser console: F12 → Console tab
   - Database logs: `docker-compose logs postgres`
   - Redis logs: `docker-compose logs redis`

3. **Search Issues:**
   - GitHub issues (existing solutions)
   - Error code + "Obsidian News Desk"
   - Check CHANGELOG.md for known issues

4. **Create Issue:**
   - Provide error message
   - Include relevant logs
   - Describe steps to reproduce
   - Mention environment (OS, Node version, etc.)

---

### Contact

**For architecture questions:**
- Review `CLAUDE.md` (comprehensive architecture guide)
- Check source code comments
- Create GitHub discussion

**For bug reports:**
- Create GitHub issue with:
  - Error message
  - Console logs
  - Steps to reproduce
  - System info (OS, Node version)

**For feature requests:**
- Create GitHub issue with:
  - Use case description
  - Expected behavior
  - Current workaround (if any)

---

### Version Information

**Current Version:** 1.0.0
**Release Date:** March 22, 2026
**Status:** Production Ready

**System Requirements:**
- **OS:** Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+)
- **Node.js:** 18.x or 20.x
- **Docker:** 20.10+ (Docker Desktop for Windows/Mac)
- **RAM:** 8GB minimum, 16GB recommended
- **CPU:** 4 cores minimum, 8+ cores recommended
- **Disk:** 50GB free space minimum
- **Internet:** Stable connection for API calls (image gen, AI)

**Browser Compatibility:**
- Chrome 100+
- Edge 100+
- Firefox 100+
- Safari 15.4+

---

### Changelog Highlights

**v1.0.0 (March 22, 2026):**
- ✅ Initial production release
- ✅ All 5 backend nodes operational
- ✅ Full UI implementation (35+ components)
- ✅ Whisk API integration
- ✅ Content policy auto-sanitization
- ✅ Reference image support
- ✅ Keyboard shortcuts
- ✅ Complete documentation

**Known Issues:**
- None (as of March 22, 2026)

**Planned Features (Phase 2):**
- Job-level reference library
- Automated E2E testing
- Multi-language support (i18n)
- Video templates
- Batch job creation
- Analytics export (CSV/JSON)

---

### License

**Obsidian News Desk:** MIT License

**Third-Party Services:**
- HeyGen: Check subscription terms
- Google AI: Free tier terms
- Whisk: Google Labs terms
- Anthropic Claude: API terms
- OpenAI: API terms
- Groq: Free tier terms

**Open Source Dependencies:**
- Next.js: MIT
- Remotion: MIT
- BullMQ: MIT
- TailwindCSS: MIT
- React: MIT
- PostgreSQL: PostgreSQL License
- Redis: BSD 3-Clause

See `package.json` for complete dependency list.

---

**End of Technical Reference Manual**

*For quick start instructions, see [QUICK_START.md](QUICK_START.md).*
*For daily usage workflows, see [USER_GUIDE.md](USER_GUIDE.md).*

*Document Version: 1.0.0*
*Last Updated: March 22, 2026*
