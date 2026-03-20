# Phase 4: Storyboard Bridge API - Documentation

The Storyboard Bridge API provides REST endpoints for human-in-the-loop review and editing of automated content before final rendering.

## Overview

**Purpose:** Enable manual review and refinement of AI-generated content
**State Required:** Job must be in `review_assets` status
**Next Step:** After approval, upload avatar and compile for rendering

## API Endpoints

### 1. GET /api/jobs/[id]

Fetch complete job details with all scenes.

**Request:**
```bash
GET /api/jobs/{job_id}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "uuid",
    "status": "review_assets",
    "raw_script": "...",
    "avatar_script": "...",
    "avatar_mp4_url": null,
    "final_video_url": null,
    "created_at": "2026-03-20T...",
    "updated_at": "2026-03-20T..."
  },
  "scenes": [
    {
      "id": "uuid",
      "job_id": "uuid",
      "scene_order": 1,
      "image_prompt": "...",
      "ticker_headline": "...",
      "image_url": "https://...",
      "generation_status": "completed",
      "created_at": "2026-03-20T..."
    }
  ]
}
```

**Use Case:** Display job in storyboard editor UI

---

### 2. PATCH /api/jobs/[id]/scenes/[scene_id]

Update scene ticker headline.

**Request:**
```bash
PATCH /api/jobs/{job_id}/scenes/{scene_id}
Content-Type: application/json

{
  "ticker_headline": "NEW HEADLINE TEXT"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticker headline updated",
  "scene_id": "uuid",
  "ticker_headline": "NEW HEADLINE TEXT"
}
```

**Validation:**
- `ticker_headline` required, must be string
- Maximum 200 characters
- Scene must belong to job

**Use Case:** Edit ticker text in storyboard editor

---

### 3. POST /api/jobs/[id]/scenes/[scene_id]/regenerate

Re-queue a scene for image generation (e.g., if user doesn't like the AI-generated image).

**Request:**
```bash
POST /api/jobs/{job_id}/scenes/{scene_id}/regenerate
```

**Response:**
```json
{
  "success": true,
  "message": "Scene re-queued for generation",
  "scene_id": "uuid",
  "status": "pending"
}
```

**Behavior:**
- Resets scene `generation_status` to `pending`
- Clears `image_url`
- Re-queues to `queue_images`
- New image will be generated via Auto Whisk

**Constraints:**
- Job must be in `generating_images` or `review_assets` state

**Use Case:** Regenerate unsatisfactory images

---

### 4. POST /api/jobs/[id]/scenes/[scene_id]/upload

Manually upload a custom image to replace the AI-generated one.

**Request:**
```bash
POST /api/jobs/{job_id}/scenes/{scene_id}/upload
Content-Type: multipart/form-data

image: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "scene_id": "uuid",
  "image_url": "https://...",
  "file_name": "custom.png",
  "file_size": 123456
}
```

**Validation:**
- Field name must be `image`
- Allowed types: PNG, JPEG, WebP
- Maximum size: 10MB

**Behavior:**
- Uploads to R2: `scenes/{scene_id}.{ext}`
- Updates scene `image_url`
- Sets `generation_status` to `completed`

**Use Case:** Use custom/stock images instead of AI-generated

---

### 5. POST /api/jobs/[id]/launch-browser

Open browser to HeyGen for avatar video generation.

**Request:**
```bash
POST /api/jobs/{job_id}/launch-browser
```

**Response:**
```json
{
  "success": true,
  "message": "Browser launched",
  "browser": "edge",
  "url": "https://app.heygen.com/create",
  "avatarScript": "Cleaned script for TTS...",
  "instructions": [
    "1. Paste the avatar script into HeyGen",
    "2. Configure voice settings (48kHz, H.264)",
    "3. Generate the avatar video",
    "4. Download the MP4 file",
    "5. Upload via POST /api/jobs/{id}/compile"
  ]
}
```

**Behavior:**
- Executes OS-specific command to open browser
- Windows: `start edge "url"`
- macOS: `open -a "Microsoft Edge" "url"`
- Linux: `microsoft-edge "url" &`

**Requirements:**
- Job must be in `review_assets` state
- Browser type from `DEFAULT_BROWSER` env var (default: edge)

**Use Case:** Generate avatar video with human voiceover

---

### 6. POST /api/jobs/[id]/compile

Upload HeyGen avatar MP4 and queue job for final rendering.

**Request:**
```bash
POST /api/jobs/{job_id}/compile
Content-Type: multipart/form-data

avatar_mp4: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Avatar uploaded and job queued for rendering",
  "job_id": "uuid",
  "avatar_url": "https://...",
  "status": "rendering",
  "file_name": "avatar.mp4",
  "file_size": 5242880
}
```

**Validation:**
- Field name must be `avatar_mp4`
- Must be `video/mp4`
- Maximum size: 100MB
- All scenes must have `image_url` (no missing images)
- Job must be in `review_assets` state

**Behavior:**
- Uploads to R2: `avatars/{job_id}.mp4`
- Updates job `avatar_mp4_url`
- Changes status: `review_assets` → `rendering`
- Queues to `queue_render`

**Use Case:** Final step before video rendering

---

## Workflow Example

```bash
# 1. Create and process job (Phase 2 + 3)
./test-phase3.sh
# → Job reaches review_assets status

# 2. Fetch job for review
curl http://localhost:3000/api/jobs/{id}

# 3. Edit ticker headlines
curl -X PATCH http://localhost:3000/api/jobs/{id}/scenes/{scene_id} \
  -H "Content-Type: application/json" \
  -d '{"ticker_headline": "BREAKING: NEW HEADLINE"}'

# 4. Regenerate unsatisfactory image
curl -X POST http://localhost:3000/api/jobs/{id}/scenes/{scene_id}/regenerate

# 5. Upload custom image
curl -X POST http://localhost:3000/api/jobs/{id}/scenes/{scene_id}/upload \
  -F "image=@custom.png"

# 6. Launch browser for avatar
curl -X POST http://localhost:3000/api/jobs/{id}/launch-browser
# → Browser opens to HeyGen
# → User generates avatar video manually
# → User downloads avatar.mp4

# 7. Upload avatar and queue render
curl -X POST http://localhost:3000/api/jobs/{id}/compile \
  -F "avatar_mp4=@avatar.mp4"
# → Job status: rendering
# → Queued to Phase 5 (Remotion render)
```

---

## Testing

**Automated Test:**
```bash
# First, create a job that reaches review_assets
./test-phase3.sh

# Then test all API endpoints
./test-phase4.sh <job-id>
```

**Manual Testing:**
```bash
# Start services
npm run workers  # Terminal 1
npm run dev      # Terminal 2

# Create job
JOB_ID=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"raw_script": "..."}' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# Wait for review_assets status
# Then use endpoints above
```

---

## Error Handling

**Common Errors:**

**404 - Job/Scene Not Found**
```json
{
  "error": "Job not found"
}
```

**400 - Invalid State**
```json
{
  "error": "Job must be in review_assets state to compile",
  "currentStatus": "generating_images"
}
```

**400 - Validation Error**
```json
{
  "error": "ticker_headline must not exceed 200 characters"
}
```

**400 - Missing Images**
```json
{
  "error": "All scenes must have images before compiling",
  "total": 6,
  "with_images": 4,
  "missing": 2
}
```

**500 - Server Error**
```json
{
  "error": "Failed to upload image",
  "details": "R2 connection timeout"
}
```

---

## Security Considerations

**File Upload Validation:**
- Type validation (MIME type check)
- Size limits (10MB images, 100MB videos)
- No executable files accepted
- Files stored in isolated R2 bucket

**Access Control:**
- No authentication in current version (2-user local setup)
- For production: Add JWT/session auth
- Validate job ownership per user

**Input Validation:**
- All text inputs sanitized
- SQL injection prevented via parameterized queries
- File paths validated to prevent directory traversal

---

## Frontend Integration

**React Example:**
```typescript
// Fetch job
const response = await fetch(`/api/jobs/${jobId}`);
const { job, scenes } = await response.json();

// Update ticker
await fetch(`/api/jobs/${jobId}/scenes/${sceneId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ticker_headline: newHeadline })
});

// Upload image
const formData = new FormData();
formData.append('image', imageFile);
await fetch(`/api/jobs/${jobId}/scenes/${sceneId}/upload`, {
  method: 'POST',
  body: formData
});

// Compile
const avatarFormData = new FormData();
avatarFormData.append('avatar_mp4', avatarFile);
await fetch(`/api/jobs/${jobId}/compile`, {
  method: 'POST',
  body: avatarFormData
});
```

---

## Database State Transitions

```
Jobs Table:
review_assets → rendering (via /compile)

Scenes Table:
completed → pending (via /regenerate)
pending/generating → completed (via /upload)
```

---

## Next Steps

With Phase 4 complete, the API layer is ready for:
- **Phase 5:** Remotion render worker implementation
- **Phase 6:** Frontend UI to consume these endpoints
- **Phase 7:** End-to-end testing

The API provides all necessary CRUD operations for human review workflow.
