# Obsidian News Desk - End-to-End Testing Checklist

**Purpose:** Verify all system components work correctly before release

**Version:** 1.0 Production
**Last Updated:** March 22, 2026

---

## Prerequisites

Before starting tests, ensure:

- [ ] Docker Desktop running
- [ ] All workers started (START.bat)
- [ ] Valid API keys configured (.env)
- [ ] Browser with Whisk extension logged in
- [ ] HeyGen account ready
- [ ] At least 10GB free disk space

---

## Test 1: Complete Workflow (Happy Path)

**Objective:** Create a broadcast from start to finish with no errors.

**Estimated Time:** 20-25 minutes

### 1.1 System Startup

- [ ] Navigate to http://localhost:8347
- [ ] Dashboard loads without errors
- [ ] Metrics display correctly (0 jobs is OK)
- [ ] "System Online" indicator visible (or similar)
- [ ] No console errors (F12)

### 1.2 Create Broadcast

- [ ] Click "NEW BROADCAST" button
- [ ] Page loads form without errors
- [ ] Select AI provider: **Google AI** (recommended for testing)
- [ ] Paste test script (150-200 words)

**Test Script:**
```
Good evening. Tonight we examine the unprecedented tech merger that's
reshaping Silicon Valley. TechCorp's acquisition of DataFlow raises
serious antitrust concerns among industry watchdogs.

Industry experts warn this consolidation could stifle innovation and
raise prices for consumers. The combined company would control over
forty percent of the cloud computing market.

Meanwhile, regulatory bodies scramble to respond. The Justice Department
has launched a preliminary investigation. International regulators
in Europe and Asia are also examining the deal.

In related news, smaller competitors are already feeling the pressure.
Three startups announced layoffs this week, citing market uncertainty.
```

- [ ] Click "CREATE BROADCAST"
- [ ] Redirects to `/jobs/[id]` (storyboard editor)
- [ ] URL contains valid job ID

### 1.3 Analysis Phase

- [ ] Status badge shows "ANALYZING" (blue spinner)
- [ ] Page polls every 3 seconds (check Network tab)
- [ ] Avatar script appears within 60 seconds
- [ ] 6-8 scene cards appear
- [ ] Status changes to "GENERATING_IMAGES"
- [ ] No errors in console

### 1.4 Image Generation Phase

- [ ] Scene cards show "Generating..." spinners
- [ ] Images appear one by one (~90s each)
- [ ] Check worker console for progress logs
- [ ] All scenes complete within 12 minutes
- [ ] Status changes to "REVIEW_ASSETS"
- [ ] No "Queue Paused" warning appears

**If Queue Paused Warning:**
- [ ] Yellow banner visible
- [ ] "RESUME QUEUE" button works
- [ ] Queue continues after resume

### 1.5 Scene Review

- [ ] Press → (right arrow) to navigate scenes
- [ ] Selected scene has blue highlight ring
- [ ] Auto-scroll works (selected scene in viewport)
- [ ] Press E to edit headline
- [ ] Type new headline, press Enter
- [ ] Headline saves successfully (green flash or success message)
- [ ] Press R to regenerate one scene
- [ ] Confirmation dialog appears
- [ ] Confirm regeneration
- [ ] Scene status changes to "PENDING"
- [ ] Wait ~90 seconds
- [ ] New image replaces old

### 1.6 Reference Images (Optional)

- [ ] Select a scene
- [ ] Click "Reference Images" to expand
- [ ] Upload subject reference (person/object photo)
- [ ] Thumbnail appears
- [ ] Upload scene reference (background photo)
- [ ] Upload style reference (artistic image)
- [ ] Badge shows "3 active references"
- [ ] Regenerate scene with references
- [ ] New image reflects reference guidance (visual check)

### 1.7 Avatar Generation

- [ ] Click "LAUNCH HEYGEN BROWSER" button
- [ ] Browser opens to https://app.heygen.com/
- [ ] Already logged in (or manually log in)
- [ ] Copy avatar script from Storyboard Editor
- [ ] Navigate to HeyGen "Instant Avatar 3.0"
- [ ] Paste script into HeyGen
- [ ] Select voice (e.g., "Professional Newscast")
- [ ] Set audio to **48kHz** ⚠️ CRITICAL
- [ ] Click "Generate Video" in HeyGen
- [ ] Wait 2-3 minutes for generation
- [ ] Download MP4 to Downloads folder
- [ ] Return to Storyboard Editor
- [ ] Drag MP4 to upload zone (or click SELECT FILE)
- [ ] Upload progress indicator appears
- [ ] Green checkmark appears when done
- [ ] Status changes to "RENDERING"

### 1.8 Rendering Phase

- [ ] Status badge shows "RENDERING" (orange spinner)
- [ ] Check worker console for render progress
- [ ] Wait 2-4 minutes
- [ ] Status changes to "COMPLETED"
- [ ] Final video preview appears at bottom

### 1.9 Download & Quality Check

- [ ] Video plays inline (click play button)
- [ ] **Check images:** Transition correctly (not stuck on one)
- [ ] **Check avatar:** Visible in bottom-right corner
- [ ] **Check green screen:** Fully removed (no green artifacts)
- [ ] **Check ticker:** Scrolls at bottom, readable
- [ ] **Check audio:** Synced with avatar lips
- [ ] **Check subtitles:** Appear and sync with audio (if implemented)
- [ ] No audio clipping or distortion
- [ ] Click "DOWNLOAD FINAL VIDEO"
- [ ] MP4 downloads successfully
- [ ] Verify file size (50-150MB typical)
- [ ] Verify resolution: **1920×1080, 30fps, H.264**
  - Windows: Right-click → Properties → Details
  - Mac: Right-click → Get Info → More Info

### 1.10 Cleanup

- [ ] Navigate to `/broadcasts`
- [ ] Job appears with "COMPLETED" status
- [ ] Click job to reopen storyboard
- [ ] All data intact
- [ ] (Optional) Delete job to clean up

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 2: Keyboard Shortcuts

**Objective:** Verify all hotkeys work correctly.

**Estimated Time:** 5 minutes

### 2.1 Broadcasts List

- [ ] Navigate to `/broadcasts`
- [ ] Press **J** to select next job
- [ ] Selected row highlights (bright background + ring)
- [ ] Press **K** to select previous job
- [ ] Selection moves up
- [ ] Press **Enter** to open selected job
- [ ] Job opens in storyboard editor
- [ ] Go back to `/broadcasts`
- [ ] Press **N** to create new broadcast
- [ ] New broadcast form loads
- [ ] Go back to `/broadcasts`
- [ ] Press **?** to show help modal
- [ ] Help modal appears with shortcuts listed
- [ ] Press **Esc** to close help modal
- [ ] Modal closes

### 2.2 Storyboard Editor

- [ ] Open any job with completed scenes
- [ ] Press **→** to select next scene
- [ ] Selected scene has blue ring
- [ ] Press **←** to select previous scene
- [ ] Selection moves left
- [ ] Press **J** to select next scene
- [ ] Press **K** to select previous scene
- [ ] Press **1** to jump to scene 1
- [ ] Scene 1 selected
- [ ] Press **5** to jump to scene 5 (if exists)
- [ ] Scene 5 selected
- [ ] Select any scene, press **E** to edit headline
- [ ] Headline input appears, cursor inside
- [ ] Type text, press **Enter** to save
- [ ] Headline saved
- [ ] Select any scene, press **R** to regenerate
- [ ] Confirmation dialog appears
- [ ] Cancel dialog
- [ ] Select any scene, press **U** to upload image
- [ ] File picker opens
- [ ] Cancel file picker
- [ ] Press **?** to show help modal
- [ ] Help modal shows shortcuts
- [ ] Press **Esc** to close

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 3: Bulk Operations

**Objective:** Verify multi-select and bulk actions work.

**Estimated Time:** 10 minutes

### 3.1 Create Test Jobs

- [ ] Create 3 test jobs (short scripts, don't wait for completion)
- [ ] All 3 jobs appear in Broadcasts list

### 3.2 Select Jobs

- [ ] Navigate to `/broadcasts`
- [ ] Select checkboxes for 2 jobs
- [ ] Bulk action toolbar appears at top
- [ ] Selected count shows "2 selected"

### 3.3 Cancel Action

- [ ] Click "CANCEL" button
- [ ] Confirmation dialog appears
- [ ] Confirm cancellation
- [ ] Jobs status changes to "cancelled"
- [ ] Jobs removed from active queues
- [ ] Check worker console: No processing for cancelled jobs

### 3.4 Delete Action

- [ ] Select 1 completed job checkbox
- [ ] Click "DELETE" button
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Job removed from list immediately
- [ ] Verify database (optional): `SELECT * FROM news_jobs WHERE id='[job_id]';` → should return no rows

### 3.5 Clear Selection

- [ ] Select multiple jobs
- [ ] Click "CLEAR SELECTION" button
- [ ] All checkboxes deselect
- [ ] Toolbar disappears

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 4: Settings

**Objective:** Verify settings save and persist across restarts.

**Estimated Time:** 10 minutes

### 4.1 Load Settings

- [ ] Navigate to `/settings`
- [ ] Page loads (wait ~2s)
- [ ] All sections visible (AI Providers, Database, Redis, Browser, Avatar, Whisk, Remotion)
- [ ] Current values populated (not all blank)
- [ ] API keys are masked (show dots: `•••••••`)

### 4.2 Modify Settings

- [ ] Change **AI_PROVIDER** to `claude`
- [ ] Enter **ANTHROPIC_API_KEY** (or fake value for test)
- [ ] Change **REMOTION_CONCURRENCY** to `2`
- [ ] Click "SAVE ALL SETTINGS"
- [ ] Success message appears: "Settings saved. Restart workers to apply changes."

### 4.3 Restart Workers

- [ ] Stop workers (Ctrl+C in terminal OR use STOP.bat)
- [ ] Wait 5 seconds
- [ ] Start workers (npm run workers OR use START.bat)
- [ ] Workers load successfully

### 4.4 Verify Persistence

- [ ] Navigate to `/settings` again
- [ ] Verify **AI_PROVIDER** is `claude`
- [ ] Verify **ANTHROPIC_API_KEY** is saved (masked)
- [ ] Verify **REMOTION_CONCURRENCY** is `2`
- [ ] Open `.env` file manually
- [ ] Verify values match

### 4.5 Revert Settings

- [ ] Change **AI_PROVIDER** back to `google`
- [ ] Change **REMOTION_CONCURRENCY** back to `1`
- [ ] Save settings
- [ ] Restart workers

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 5: Error Scenarios

**Objective:** Verify graceful error handling and helpful messages.

**Estimated Time:** 15 minutes

### 5.1 Invalid Script (Too Short)

- [ ] Navigate to `/broadcasts/new`
- [ ] Enter script with <100 characters (e.g., "Test")
- [ ] Click "CREATE BROADCAST"
- [ ] Error message appears: "Script must be at least 100 characters"
- [ ] Form does not submit
- [ ] No job created in database

### 5.2 Invalid Avatar Format

- [ ] Create valid job, wait for `review_assets`
- [ ] Try to upload PNG image as avatar (not MP4)
- [ ] Error message: "Please upload a video file (MP4)"
- [ ] Upload rejected
- [ ] Try again with valid MP4
- [ ] Upload succeeds

### 5.3 Queue Paused (Simulate)

**Note:** This test may take >5 minutes or require manual queue pause

- [ ] Create job, let it reach `generating_images`
- [ ] Wait 5+ minutes without images completing OR manually pause queue in Redis
- [ ] Yellow warning appears: "Queue appears paused"
- [ ] "RESUME QUEUE" button visible
- [ ] Click "RESUME QUEUE"
- [ ] Warning disappears
- [ ] Queue resumes processing
- [ ] Images continue generating

### 5.4 Network Failure (Simulate)

**Note:** Requires manually disconnecting internet mid-generation

- [ ] Create job, let it reach `generating_images`
- [ ] Disconnect internet after 2-3 scenes complete
- [ ] Worker retries 3 times (check console)
- [ ] After max retries, scene status shows "failed"
- [ ] Reconnect internet
- [ ] Select failed scene, click "Regenerate"
- [ ] Scene completes successfully

### 5.5 Expired Whisk Token

- [ ] Set invalid WHISK_API_TOKEN in Settings (e.g., "invalid_token_123")
- [ ] Save settings, restart workers
- [ ] Create job, wait for image generation
- [ ] Images fail with 401 error
- [ ] Queue pauses automatically
- [ ] Restore valid token in Settings
- [ ] Resume queue
- [ ] Images generate successfully

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 6: Analytics

**Objective:** Verify metrics are accurate and update correctly.

**Estimated Time:** 5 minutes

### 6.1 Baseline Metrics

- [ ] Navigate to `/analytics`
- [ ] Note current **Total Jobs** count
- [ ] Note **Completed**, **Failed** counts

### 6.2 Create Test Jobs

- [ ] Create and complete 2 broadcasts (full workflow)
- [ ] Create 1 broadcast and cancel it (status = failed or cancelled)

### 6.3 Verify Updated Metrics

- [ ] Navigate to `/analytics`
- [ ] **Total Jobs:** Increased by 3
- [ ] **Completed:** Increased by 2
- [ ] **Failed:** Increased by 1
- [ ] **Success Rate:** Calculated correctly (Completed / Total * 100)
- [ ] **Average Processing Time:** Shows reasonable value (5-20 min)
- [ ] **Jobs by Status** table shows correct counts
- [ ] All status badges display (8 statuses)

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 7: Queue Resume

**Objective:** Verify queue pause detection and resume functionality.

**Estimated Time:** 10 minutes

### 7.1 Trigger Queue Pause

- [ ] Create broadcast
- [ ] During image generation, stop Whisk browser extension
  - Chrome: Right-click extension → Remove OR disable
- [ ] Wait 5+ minutes
- [ ] Yellow "Queue Paused" warning appears in Storyboard Editor
- [ ] Worker console shows "Queue paused" or similar

### 7.2 Resume Queue

- [ ] Re-enable Whisk extension (or manually log into Whisk)
- [ ] Click "RESUME QUEUE" button in UI
- [ ] Yellow warning disappears
- [ ] Worker console shows "Queue resumed"
- [ ] Images continue generating

### 7.3 Alternative Resume Method

- [ ] Create another paused job
- [ ] Instead of UI button, restart workers:
  - Ctrl+C to stop
  - `npm run workers` to restart
- [ ] Queue automatically resumes
- [ ] Images continue

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 8: Reference Images

**Objective:** Verify reference image upload and usage.

**Estimated Time:** 10 minutes

### 8.1 Upload References

- [ ] Create broadcast, wait for `review_assets`
- [ ] Select first scene
- [ ] Click "Reference Images" to expand section
- [ ] Click "Add" under **Subject**
- [ ] Select image file (JPEG, PNG, WebP)
- [ ] Thumbnail appears
- [ ] Filename shown below thumbnail
- [ ] Click "Add" under **Scene**
- [ ] Upload scene reference
- [ ] Click "Add" under **Style**
- [ ] Upload style reference
- [ ] Badge shows **"3 active references"**

### 8.2 Regenerate with References

- [ ] Click "Regenerate" button on same scene
- [ ] Confirm dialog
- [ ] Scene status changes to "PENDING"
- [ ] Wait ~90 seconds
- [ ] New image generates
- [ ] Visual check: Image reflects reference guidance
  - Subject matches uploaded subject
  - Background/scene matches uploaded scene
  - Style/aesthetic matches uploaded style

### 8.3 Manage References

- [ ] Hover over subject reference thumbnail
- [ ] Click **X** button to remove
- [ ] Reference removed
- [ ] Badge updates to **"2 active references"**
- [ ] Re-upload subject reference
- [ ] Badge shows **"3 active references"** again

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 9: Performance

**Objective:** Measure typical performance and identify bottlenecks.

**Estimated Time:** 20 minutes

### 9.1 Timing Measurement

Create a broadcast with **8 scenes** and record timings:

- [ ] **Analysis time:** _______ seconds (should be <60s)
- [ ] **First image complete:** _______ seconds from analysis (should be <90s)
- [ ] **All images complete:** _______ minutes from first image (should be <15 min)
- [ ] **Avatar generation:** _______ minutes (HeyGen: 2-3 min)
- [ ] **Rendering time:** _______ minutes (should be <5 min)
- [ ] **Total workflow time:** _______ minutes (should be <25 min)

### 9.2 Resource Usage

During rendering, check system resources:

- [ ] Open Task Manager (Windows) or Activity Monitor (Mac)
- [ ] **CPU usage:** _______ % (typical: 50-80% on 4-core)
- [ ] **RAM usage:** _______ GB (typical: 2-4 GB)
- [ ] **Disk usage:** _______ MB/s (depends on SSD vs HDD)
- [ ] No crashes or out-of-memory errors

### 9.3 Disk Space

- [ ] **Free space before test:** _______ GB
- [ ] **Free space after test:** _______ GB
- [ ] **Disk used by video:** _______ MB (typical: 50-150 MB)
- [ ] Disk warning appears if <10GB free

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Test 10: Browser Compatibility

**Objective:** Verify UI works in all supported browsers.

**Estimated Time:** 15 minutes (5 min per browser)

### 10.1 Edge

- [ ] Open http://localhost:8347 in **Microsoft Edge**
- [ ] Dashboard loads correctly
- [ ] All buttons/forms work
- [ ] Navigation works (sidebar, top nav)
- [ ] Keyboard shortcuts work (J/K, arrows, Enter)
- [ ] Video playback works (inline preview)
- [ ] No console errors (F12)

### 10.2 Chrome

- [ ] Open http://localhost:8347 in **Google Chrome**
- [ ] Dashboard loads correctly
- [ ] All buttons/forms work
- [ ] Navigation works
- [ ] Keyboard shortcuts work
- [ ] Video playback works
- [ ] No console errors

### 10.3 Chromium

- [ ] Open http://localhost:8347 in **Chromium** (if available)
- [ ] Dashboard loads correctly
- [ ] All buttons/forms work
- [ ] Navigation works
- [ ] Keyboard shortcuts work
- [ ] Video playback works
- [ ] No console errors

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_____________________________________________

---

## Summary

**Tests Passed:** _____ / 10

**Tests Failed:** _____ / 10

---

### Critical Issues Found

List any test failures that prevent system from functioning:

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

### Minor Issues Found

List any cosmetic or non-blocking issues:

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

### Recommendations

Based on test results:

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

**Tested By:** _______________________________

**Date:** ____________________________________

**System Version:** 1.0 Production

**Environment:** Development / Staging / Production

---

## Appendix: Test Data

### Test Scripts

**Short Script (100-150 words):**
```
Breaking news from Washington today as the Senate passes landmark legislation.
The bill received bipartisan support with a final vote of 62-38. Environmental
groups are calling this a historic victory.
```

**Medium Script (150-250 words):**
```
Good evening. Tonight we examine the unprecedented tech merger that's reshaping
Silicon Valley. TechCorp's acquisition of DataFlow raises serious antitrust
concerns among industry watchdogs. Industry experts warn this consolidation
could stifle innovation and raise prices for consumers.
```

**Long Script (250-400 words):**
```
[Use script from Test 1.2 or create custom political/tech news content]
```

### Expected Timings

| Phase | Minimum | Typical | Maximum | Action if Exceeded |
|-------|---------|---------|---------|-------------------|
| Analysis | 20s | 40s | 90s | Check AI provider rate limits |
| Per Image | 30s | 60s | 120s | Check Whisk token, network |
| All Images (8) | 5 min | 10 min | 18 min | Check for queue pause |
| Rendering | 1.5 min | 3 min | 6 min | Check CPU/RAM, REMOTION_CONCURRENCY |
| **Total** | **12 min** | **18 min** | **30 min** | Overall workflow |

### Performance Baselines

**Acceptable ranges:**

- **CPU usage during render:** 40-90%
- **RAM usage:** 1-6 GB
- **Disk I/O:** 50-500 MB/s (depends on drive type)
- **Final video size:** 30-200 MB (depends on length)
- **Success rate:** >90% (completed / total jobs)

---

**End of Testing Checklist**
