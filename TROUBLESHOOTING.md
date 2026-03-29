# Troubleshooting Guide

## Quick Diagnosis

Run this command to check system health:

```bash
npm run health-check
```

## Common Issues & Fixes

### Issue #1: Whisk API Token Expired (401/400 Errors)

**Symptoms:**
- Image generation fails with "400 - INVALID_ARGUMENT"
- Error message: "PUBLIC_ERROR_PROMINENT_PEOPLE_FILTER_FAILED"
- 6/14 scenes fail to generate

**Root Cause:**
Whisk API tokens expire after ~1 hour. The token in `.env` is stale.

**Fix (5 minutes):**

1. Open https://labs.google.com/whisk in your browser
2. Press F12 to open Developer Tools
3. Click on the "Network" tab
4. Generate a test image on Whisk (any prompt)
5. In the Network tab, find the request named "generateImage"
6. Click on it, then click "Headers"
7. Find the "Authorization" header
8. Copy the value after "Bearer " (starts with `ya29.`)
9. Update `.env` line 50:
   ```
   WHISK_API_TOKEN=ya29.YOUR_NEW_TOKEN_HERE
   ```
10. Restart workers:
   ```bash
   npm run workers
   ```

**Verification:**
```bash
npm run test:whisk-token
```

---

### Issue #2: Avatar Format Incompatible with Remotion

**Symptoms:**
- Render fails with: "MEDIA_ELEMENT_ERROR: Format error"
- Error code 4 when playing avatar MP4
- Black screen or missing avatar in video

**Root Cause:**
Avatar MP4 from HeyGen uses codec/container settings that Chromium (Remotion's renderer) can't decode.

**Fix (10-15 minutes):**

**Option A: Re-encode Existing Avatar**

```bash
cd obsidian-news-desk
./scripts/optimize-avatar.sh "C:\Users\konra\ObsidianNewsDesk\avatars\YOUR_AVATAR.mp4" "optimized-avatar.mp4"
```

This creates a web-optimized version:
- 640x360 resolution
- H.264 baseline codec
- ~2-3MB file size
- FastStart flag enabled

**Option B: Download Fresh Avatar**

1. Go to https://heygen.com
2. Generate new avatar with same script
3. Download MP4
4. Run optimization script (Option A) if file > 10MB

**Upload to System:**

1. Open storyboard editor in browser
2. Click "Upload Avatar" button
3. Select optimized MP4 file
4. Click "COMPILE & RENDER"

**Verification:**

Check that avatar plays in browser:
```bash
# Open in default browser
start public/avatars/optimized-avatar.mp4
```

If it plays smoothly in browser, it will work in Remotion.

---

### Issue #3: Assets Not Found During Render (404 Errors)

**Symptoms:**
- Black screens in rendered video
- Console errors: "Failed to load resource: 404 (Not Found)"
- URL shows `/public/images/...` instead of `/images/...`

**Root Cause:**
Assets weren't copied from storage to `public/` folder, or Next.js dev server stopped.

**Fix:**

**Step 1: Verify Assets Exist**

```bash
# Check source images exist
ls "C:\Users\konra\ObsidianNewsDesk\images" | head -10

# Check public folder (should be empty before render)
ls obsidian-news-desk/public/images
```

**Step 2: Check Dev Server**

```bash
# Dev server must be running for Remotion to access /images/
curl http://localhost:8347/images/test.jpg
```

If 404: Dev server is not running. Start it:
```bash
npm run dev
```

**Step 3: Manual Asset Test**

Copy a test image to public folder:
```bash
cp "C:\Users\konra\ObsidianNewsDesk\images\SOME_IMAGE.jpg" obsidian-news-desk/public/images/test.jpg
```

Then access in browser:
```
http://localhost:8347/images/test.jpg
```

Should display the image. If 404: Next.js config issue.

**Step 4: Check Asset Preparation Logs**

When render starts, you should see:
```
🔍 [ASSET-PREP] Starting validation for job abc-123
📁 [ASSET-PREP] Ensured public images directory exists
✅ Copied to: public/images/scene123.jpg
```

If you don't see these logs, asset preparation didn't run.

**Verification:**

After clicking "COMPILE & RENDER", check:
```bash
# Should show copied images
ls obsidian-news-desk/public/images

# Should show copied avatar
ls obsidian-news-desk/public/avatars
```

---

### Issue #4: Insufficient Disk Space

**Symptoms:**
- Render fails with "Insufficient disk space"
- Error: "Available: 200MB, Required: 500MB"

**Fix:**

Free up at least 500MB in `C:\Users\konra\ObsidianNewsDesk\`

**Check Space:**
```bash
npm run disk-space
```

**Clean Old Videos:**
```bash
# Delete videos older than 7 days
npm run clean-old-videos
```

Or manually delete in File Explorer:
- `C:\Users\konra\ObsidianNewsDesk\videos\` - Final rendered videos
- `C:\Users\konra\ObsidianNewsDesk\temp\` - Temporary render files
- `obsidian-news-desk\tmp\` - Additional temp files

---

### Issue #5: Database Connection Failed

**Symptoms:**
- "ECONNREFUSED" errors
- "Connection timeout" errors
- Can't create new broadcasts

**Fix:**

**Check Docker Status:**
```bash
docker ps
```

Should show:
- `obsidian-postgres` on port 5432
- `obsidian-redis` on port 6379

If not running:
```bash
cd obsidian-news-desk
START.bat
```

**Test Connection:**
```bash
npm run test:db
```

---

### Issue #6: Workers Not Processing Jobs

**Symptoms:**
- Job stuck in "analyzing" or "generating_images" state
- No progress for 5+ minutes
- No logs in workers window

**Fix:**

**Restart Workers:**

1. Close workers terminal window
2. Open new CMD:
   ```bash
   cd obsidian-news-desk
   npm run workers
   ```

**Check Queue Status:**
```bash
npm run queue-status
```

Should show active workers:
- analyze: 1 worker
- images: 3 workers
- render: 1 worker

**Clear Stuck Jobs:**
```bash
npm run queue-clear
```

⚠️ Warning: This cancels all active jobs!

---

## System Health Checks

### Daily Startup Checklist

Before creating a new broadcast:

1. ✅ Docker containers running:
   ```bash
   docker ps
   ```

2. ✅ Dev server running:
   ```bash
   # Visit in browser
   http://localhost:8347
   ```

3. ✅ Workers running:
   ```bash
   # Check workers terminal shows:
   # [Worker] analyze: Ready
   # [Worker] images: Ready (3x)
   # [Worker] render: Ready
   ```

4. ✅ Disk space adequate:
   ```bash
   npm run disk-space
   ```

5. ✅ Whisk token valid:
   ```bash
   npm run test:whisk-token
   ```

### End-to-End Test

Run full system test:

```bash
npm run test:simple
```

Expected output:
- ✅ Job created
- ✅ AI analysis complete (30-60s)
- ✅ Images generated (15-20 min)
- ✅ Assets prepared
- ✅ Video rendered
- ✅ Final MP4 in videos/ folder

---

## Debug Mode

Enable verbose logging:

```bash
# .env
DEBUG=true
VERBOSE_LOGGING=true
```

Then restart workers:
```bash
npm run workers
```

Logs will show detailed asset preparation, Remotion render steps, and API calls.

---

## Getting Help

If issues persist:

1. Check logs:
   ```bash
   tail -100 logs/workers.log
   ```

2. Export job data:
   ```bash
   npm run export-job <job-id>
   ```

3. Report issue with:
   - Job ID
   - Error message
   - Steps to reproduce
   - System info: `npm run system-info`

---

## Emergency Recovery

### Reset Everything

If system is completely broken:

```bash
# Stop all services
STOP.bat

# Clear all data (⚠️ DESTRUCTIVE)
npm run reset-database

# Restart
START.bat
```

### Backup Before Reset

```bash
# Backup database
npm run db-backup

# Backup videos
xcopy "C:\Users\konra\ObsidianNewsDesk\videos" "C:\Users\konra\Backup\videos" /E /I
```
