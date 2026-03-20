# Migration Checklist - Local Storage Update

## Before You Start

This migration removes Cloudflare R2 cloud storage and switches to local filesystem storage. **No data will be lost** - this only affects NEW jobs going forward.

---

## Step 1: Update Your `.env` File

Open your `.env` file and **remove** these lines:

```bash
# DELETE THESE:
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_BUCKET=your-bucket-name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

**Ensure** these lines exist (already in `.env.example`):

```bash
# Auto Whisk Extension ID
AUTO_WHISK_EXTENSION_ID=gedfnhdibkfgacmkbjgpfjihacalnlpn

# Persistent context directory (saves Google login)
PLAYWRIGHT_USER_DATA_DIR=./playwright-data
```

---

## Step 2: Install Dependencies

No new dependencies needed! All required packages (`fs/promises`, `path`) are built into Node.js.

---

## Step 3: Test Worker Startup

```bash
cd obsidian-news-desk
npm run workers
```

**Expected Output:**
```
🚀 Starting BullMQ workers...
📁 Initializing local storage...
✅ [Storage] images directory ready: C:\Users\konra\ObsidianNewsDesk\images
✅ [Storage] avatars directory ready: C:\Users\konra\ObsidianNewsDesk\avatars
✅ [Storage] videos directory ready: C:\Users\konra\ObsidianNewsDesk\videos
✅ [Storage] temp directory ready: C:\Users\konra\ObsidianNewsDesk\temp
✅ [Storage] Local storage initialized
```

**Check Filesystem:**
```bash
dir C:\Users\konra\ObsidianNewsDesk
```

You should see:
```
├── images\
├── avatars\
├── videos\
└── temp\
```

---

## Step 4: First Google Login (If Needed)

When workers start, the browser will check your Google login status:

**If logged in:**
```
✅ [Browser] Google login verified - user is logged in
```

**If NOT logged in:**
```
⚠️ [Browser] NOT logged into Google!
   Please log in manually in the browser window.
   The browser will remain open for manual login.
```

**Action Required:**
1. Log into Google in the browser window
2. Cookies will be saved automatically to `./playwright-data/`
3. Next time workers start, you'll stay logged in

---

## Step 5: Test Image Generation

Create a test job with 1-2 scenes:

```bash
# Via API or UI:
POST /api/jobs
{
  "raw_script": "Test script here..."
}
```

**Monitor Logs:**
```
🖼️ [IMAGES] Starting image generation for scene abc123
...
💾 [IMAGES] Saved to local storage: C:\Users\konra\ObsidianNewsDesk\images\abc123.png
✅ [IMAGES] Scene abc123 processing complete
⏳ [IMAGES] Waiting 60s before next generation (ban prevention)...
```

**Verify File Saved:**
```bash
dir C:\Users\konra\ObsidianNewsDesk\images
```

You should see `abc123.png`

---

## Step 6: Update Frontend Components (If Applicable)

If you have custom React components displaying images/videos, update them:

### Image Display

**Before:**
```tsx
<img src={scene.image_url} alt="Scene" />
```

**After:**
```tsx
<img
  src={`/api/files?path=${encodeURIComponent(scene.image_url)}`}
  alt="Scene"
/>
```

### Video Display

**Before:**
```tsx
<video src={job.final_video_url} controls />
```

**After:**
```tsx
<video
  src={`/api/files?path=${encodeURIComponent(job.final_video_url)}`}
  controls
/>
```

### Avatar Display

**Before:**
```tsx
<video src={job.avatar_mp4_url} autoPlay loop />
```

**After:**
```tsx
<video
  src={`/api/files?path=${encodeURIComponent(job.avatar_mp4_url)}`}
  autoPlay
  loop
/>
```

---

## Step 7: Verify Frontend Display

1. Start Next.js dev server: `npm run dev`
2. Open job in Storyboard Editor
3. Verify images display correctly
4. Check browser Network tab - should see requests to `/api/files?path=...`

---

## Step 8: Test Full Pipeline

Create a job with 3-4 scenes and run the full pipeline:

1. **Analyzing** → AI generates scenes
2. **Generating Images** → 60s delay between each (3-4 minutes total)
3. **Review Assets** → Manual QA
4. **Upload Avatar** → Save to `C:\Users\konra\ObsidianNewsDesk\avatars\`
5. **Rendering** → Remotion renders video
6. **Completed** → Final video saved to `C:\Users\konra\ObsidianNewsDesk\videos\`

**Verify All Files:**
```bash
dir C:\Users\konra\ObsidianNewsDesk\images
dir C:\Users\konra\ObsidianNewsDesk\avatars
dir C:\Users\konra\ObsidianNewsDesk\videos
```

---

## Troubleshooting

### ❌ Error: "LOCALAPPDATA environment variable not found"

**Cause:** Running in WSL or Linux
**Solution:** Run workers in Windows PowerShell or CMD

### ❌ Error: "Extension not found: gedfnhdibkfgacmkbjgpfjihacalnlpn"

**Cause:** Auto Whisk extension not installed
**Solution:**
1. Open Edge/Chrome
2. Install from: https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/gedfnhdibkfgacmkbjgpfjihacalnlpn
3. Restart workers

### ❌ Worker stuck in "paused" state

**Cause:** Captcha or login prompt detected
**Solution:**
1. Check worker logs for error
2. Log into Google manually in browser
3. Restart workers: `npm run workers`

### ❌ Images not displaying in frontend

**Cause:** Using old R2 URLs instead of local paths
**Solution:**
1. Check database - `image_url` should be `C:\Users\konra\...` not `https://...`
2. Update frontend components to use `/api/files` API
3. Clear browser cache

### ❌ "Access Denied" when accessing `/api/files`

**Cause:** Security check blocking unauthorized paths
**Solution:**
- Only paths starting with `C:\Users\konra\ObsidianNewsDesk\` are allowed
- Check database for correct paths

---

## Rollback Plan (If Needed)

If you need to rollback to R2:

1. **Restore `.env` variables:**
   ```bash
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=...
   R2_ENDPOINT=...
   R2_PUBLIC_URL=...
   ```

2. **Git revert changes:**
   ```bash
   git log --oneline
   git revert <commit-hash>
   ```

3. **Restart workers:**
   ```bash
   npm run workers
   ```

---

## Success Checklist

- [ ] `.env` updated (R2 variables removed)
- [ ] Workers start successfully
- [ ] Storage directories created at `C:\Users\konra\ObsidianNewsDesk\`
- [ ] Google login working (persistent cookies)
- [ ] Single scene generation works (60s delay observed)
- [ ] Images saved to local filesystem
- [ ] Database contains local paths (not URLs)
- [ ] Frontend displays images via `/api/files`
- [ ] Full pipeline completes (analyzing → rendering → completed)
- [ ] Final video playable

---

## Next Steps After Migration

1. **Monitor disk space** - Add manual cleanup when needed
2. **Test ban detection** - Verify graceful pause on captcha
3. **Test error recovery** - Verify retries work correctly
4. **Document queue resume** - Add instructions for resuming paused queue
5. **Add queue resume API** - Future enhancement for easier recovery

---

**Migration Status:** Ready to execute
**Estimated Time:** 30 minutes
**Risk Level:** Low (no data loss, easy rollback)

---

*Last Updated: 2026-03-20*
