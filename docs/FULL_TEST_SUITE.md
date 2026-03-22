# Full Test Suite

**Duration:** 2-3 hours
**Purpose:** Comprehensive validation of all features and edge cases
**When to Run:** Before major releases, quarterly regression testing, after significant refactoring

---

## Prerequisites

- [ ] Docker Desktop running
- [ ] All workers started (`START.bat` - 3 windows open)
- [ ] Valid API keys configured in `.env`
- [ ] Browser with DevTools knowledge (F12)
- [ ] HeyGen account logged in and ready
- [ ] At least 10GB disk space free
- [ ] Stable internet connection (for API calls)
- [ ] 2-3 hours of uninterrupted time

---

## Test 1: Complete Workflow - Happy Path (30 minutes)

**Objective:** Create a broadcast from start to finish with no errors.

### Setup
- [ ] Navigate to http://localhost:8347
- [ ] Dashboard loads without errors
- [ ] Metrics display (0 jobs is OK)
- [ ] Open browser DevTools (F12 → Console tab)
- [ ] Clear console

### Phase A: Create Broadcast (2 minutes)

1. **Navigate to Form**
   - [ ] Click "NEW BROADCAST" button
   - [ ] URL changes to `/broadcasts/new`
   - [ ] Form renders completely
   - [ ] No console errors

2. **Submit Script**
   - [ ] Paste test script below
   - [ ] Select AI provider: **Google** (recommended)
   - [ ] Click "CREATE BROADCAST"
   - [ ] Redirects to `/jobs/[uuid]`
   - [ ] Page loads storyboard editor

**Test Script (200 words):**
```
Good evening. Tonight we examine the unprecedented climate legislation
moving through Congress. The Clean Energy Acceleration Act represents
the most ambitious environmental policy in decades, with a proposed
budget of $800 billion over ten years.

Senate leaders are divided along partisan lines. Supporters argue the
bill will create millions of green jobs while reducing carbon emissions
by 50 percent by 2035. Critics warn of economic disruption and rising
energy costs for American families.

Environmental groups are celebrating, calling it a generational victory.
The Sierra Club and Natural Resources Defense Council have mobilized
grassroots campaigns supporting swift passage. Meanwhile, industry
lobbyists from fossil fuel sectors are pushing for amendments to delay
implementation timelines.

Key provisions include tax credits for renewable energy infrastructure,
stricter emission standards for vehicles, and funding for climate
adaptation in vulnerable communities. The bill also establishes a new
federal agency to oversee the transition to clean energy.

Lawmakers face a tight deadline as the current legislative session ends
in three weeks. Both chambers must reconcile differences before a final
vote. We'll continue monitoring this developing story.
```

3. **Note Job ID**
   - [ ] Copy job ID from URL: `_________________________`
   - [ ] Save for tracking throughout test

### Phase B: Analysis (1 minute)

4. **Verify Analysis Phase**
   - [ ] Status badge shows "ANALYZING" with spinner icon
   - [ ] Avatar script section visible (placeholder text)
   - [ ] Scene grid section visible (empty initially)
   - [ ] Page polls for updates (check Network tab - requests every 3s)
   - [ ] No console errors
   - [ ] Wait 30-60 seconds (do NOT refresh)

5. **Analysis Completion**
   - [ ] Avatar script appears in text area
   - [ ] Avatar script contains news content (read first sentence)
   - [ ] Avatar script length: 150-250 words
   - [ ] 6-8 scene cards appear in grid
   - [ ] Scene cards numbered sequentially (1, 2, 3...)
   - [ ] Each scene card displays:
     - Scene number badge
     - Image prompt (descriptive text)
     - Ticker headline (concise text)
     - Status: "Generating..." with spinner
   - [ ] Status badge changes to "GENERATING_IMAGES"
   - [ ] No console errors

### Phase C: Image Generation (15 minutes)

6. **Monitor Image Generation**
   - [ ] Scene cards show "Generating..." spinners
   - [ ] Worker console shows Whisk API requests
   - [ ] First image appears within 2 minutes
   - [ ] Each image appears one by one
   - [ ] Images load and display correctly (no broken thumbnails)
   - [ ] Each completed scene shows:
     - Full image preview
     - "COMPLETED" badge (green)
     - Image matches scene context
   - [ ] All scenes complete within 15 minutes
   - [ ] No scenes show "FAILED" status
   - [ ] Status badge changes to "REVIEW_ASSETS"
   - [ ] No "Queue Paused" warning appears

7. **Image Quality Check**
   - [ ] Click each scene to view full-size image
   - [ ] Images are clear and high-resolution
   - [ ] Images match their prompts contextually
   - [ ] No duplicate or identical images
   - [ ] No corrupted or distorted images
   - [ ] No inappropriate content (check safety filters)

### Phase D: Scene Review & Editing (5 minutes)

8. **Edit Ticker Headline**
   - [ ] Click scene 1 (or press `1`)
   - [ ] Scene highlights with blue ring
   - [ ] Press `E` (edit headline)
   - [ ] Headline input field appears and focuses
   - [ ] Type: "BREAKING: CLIMATE BILL ADVANCES"
   - [ ] Press `Enter` (or click SAVE)
   - [ ] Headline saves successfully
   - [ ] New headline displays on scene card
   - [ ] Refresh page (F5)
   - [ ] Navigate back to job
   - [ ] Edited headline persists

9. **Regenerate Scene**
   - [ ] Click scene 2 (or press `2`)
   - [ ] Press `R` (regenerate)
   - [ ] Confirmation dialog appears
   - [ ] Dialog shows scene number and warning
   - [ ] Click "CONFIRM"
   - [ ] Scene status changes to "Generating..."
   - [ ] Original image removed
   - [ ] Wait ~90 seconds
   - [ ] New image appears
   - [ ] New image is DIFFERENT from original
   - [ ] Scene status shows "COMPLETED"

10. **Reference Images** (if implemented)
    - [ ] Click scene 3
    - [ ] Expand "Reference Images" section
    - [ ] Click "Add Subject Reference"
    - [ ] Upload test image (PNG/JPG, <5MB)
    - [ ] Subject thumbnail appears
    - [ ] Badge shows "1 active reference"
    - [ ] Click "Regenerate"
    - [ ] Wait ~90 seconds
    - [ ] New image reflects reference influence
    - [ ] Hover over reference thumbnail
    - [ ] Click X to remove reference
    - [ ] Reference removed
    - [ ] Badge updates to "0 active"

### Phase E: Avatar Generation (5 minutes)

11. **Launch HeyGen Browser**
    - [ ] Scroll to "AVATAR GENERATION" section
    - [ ] Click "LAUNCH HEYGEN BROWSER" button
    - [ ] New browser window/tab opens
    - [ ] HeyGen.com loads successfully
    - [ ] If login required, sign in

12. **Copy Avatar Script**
    - [ ] Return to storyboard editor tab
    - [ ] Scroll to top (avatar script section)
    - [ ] Click in avatar script text area
    - [ ] Select all text (Ctrl+A)
    - [ ] Copy to clipboard (Ctrl+C)

13. **Generate Avatar in HeyGen**
    - [ ] Switch to HeyGen browser tab
    - [ ] Navigate to "Instant Avatar" or latest version
    - [ ] Paste script into script field (Ctrl+V)
    - [ ] Select voice: "Professional Newscast" or similar
    - [ ] Verify audio settings: **48kHz sample rate** (CRITICAL)
    - [ ] Click "Generate Video"
    - [ ] Wait 2-3 minutes for generation
    - [ ] Download MP4 file
    - [ ] Note file location: `_________________________`
    - [ ] Check file size (should be 20-60MB)

14. **Upload Avatar**
    - [ ] Return to storyboard editor tab
    - [ ] Scroll to "AVATAR GENERATION" section
    - [ ] Drag downloaded MP4 to upload zone (or click "SELECT FILE")
    - [ ] Upload progress bar appears
    - [ ] Progress reaches 100%
    - [ ] Green checkmark appears
    - [ ] Status badge changes to "RENDERING"
    - [ ] Upload takes <30 seconds

### Phase F: Rendering (3 minutes)

15. **Monitor Rendering**
    - [ ] Status badge shows "RENDERING" with spinner
    - [ ] Worker console shows Remotion render logs
    - [ ] Progress indicator visible (if implemented)
    - [ ] No error messages in worker console
    - [ ] Wait 2-4 minutes (do NOT close page)

16. **Rendering Completion**
    - [ ] Status badge changes to "COMPLETED" with checkmark
    - [ ] Final video preview appears
    - [ ] Video player loads
    - [ ] Play button visible
    - [ ] "DOWNLOAD FINAL VIDEO" button active

### Phase G: Final Video Review (3 minutes)

17. **Preview Video Inline**
    - [ ] Click play button in video player
    - [ ] Video plays smoothly (no buffering)
    - [ ] Audio plays clearly
    - [ ] Check: Scene images transition correctly
    - [ ] Check: No black frames between transitions
    - [ ] Check: Avatar visible in bottom-right corner
    - [ ] Check: Avatar green screen removed (no green halo)
    - [ ] Check: Ticker scrolls at bottom
    - [ ] Check: Ticker headlines readable
    - [ ] Check: Audio synced with avatar lip movement
    - [ ] Check: Video ends cleanly (no abrupt cut)

18. **Download Video**
    - [ ] Click "DOWNLOAD FINAL VIDEO" button
    - [ ] MP4 file downloads to browser downloads folder
    - [ ] Open video in VLC or Windows Media Player
    - [ ] Video plays correctly in external player
    - [ ] Right-click video → Properties → Details
    - [ ] Verify resolution: **1920x1080**
    - [ ] Verify frame rate: **30 fps**
    - [ ] Verify codec: **H.264 / AVC**
    - [ ] Verify audio: **AAC, 48kHz**
    - [ ] File size: 15-30 MB (for 60s video)

19. **Verify Database Entry**
    - [ ] Navigate to /broadcasts
    - [ ] Job appears in list
    - [ ] Status shows "COMPLETED"
    - [ ] Created timestamp accurate
    - [ ] Script preview visible (first ~100 chars)
    - [ ] Click job row
    - [ ] Opens to storyboard editor (completed state)

### Expected Result:
✅ PASS - Complete workflow from script to final video in 25-30 minutes

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 2: Keyboard Shortcuts - Comprehensive (10 minutes)

**Objective:** Test all keyboard shortcuts across all pages.

### Global Shortcuts (all pages)

1. **Help Modal**
   - [ ] Press `?` on any page
   - [ ] Help modal appears with overlay
   - [ ] Modal lists all available shortcuts
   - [ ] Shortcuts grouped by category
   - [ ] Press `Esc` to close
   - [ ] Modal disappears

### Dashboard Page

2. **Navigation from Dashboard**
   - [ ] Navigate to http://localhost:8347
   - [ ] Press `N` (new broadcast)
   - [ ] Redirects to /broadcasts/new
   - [ ] Press `B` (broadcasts list)
   - [ ] Redirects to /broadcasts
   - [ ] Press `D` (dashboard)
   - [ ] Returns to dashboard
   - [ ] Press `S` (settings)
   - [ ] Redirects to /settings

### Broadcasts List Page

3. **List Navigation - J/K Keys**
   - [ ] Navigate to /broadcasts
   - [ ] Ensure at least 3 jobs exist
   - [ ] Press `J` (down)
   - [ ] First row highlights
   - [ ] Press `J` again
   - [ ] Second row highlights
   - [ ] Press `J` again
   - [ ] Third row highlights
   - [ ] Press `K` (up)
   - [ ] Second row highlights
   - [ ] Press `K` again
   - [ ] First row highlights

4. **List Navigation - Arrow Keys**
   - [ ] Press `↓` (down arrow)
   - [ ] Next row highlights (same as J)
   - [ ] Press `↑` (up arrow)
   - [ ] Previous row highlights (same as K)

5. **List Actions**
   - [ ] Press `J` to select a job
   - [ ] Press `Enter`
   - [ ] Opens job in storyboard editor
   - [ ] Press browser back button
   - [ ] Returns to broadcasts list
   - [ ] Selected row still highlighted
   - [ ] Press `N` (new broadcast)
   - [ ] Redirects to /broadcasts/new

### Storyboard Editor Page

6. **Scene Navigation - Arrow Keys**
   - [ ] Open any job in storyboard editor
   - [ ] Press `→` (right arrow)
   - [ ] Scene 2 highlights with blue ring
   - [ ] Press `→` again
   - [ ] Scene 3 highlights
   - [ ] Press `←` (left arrow)
   - [ ] Scene 2 highlights
   - [ ] Press `←` again
   - [ ] Scene 1 highlights

7. **Scene Navigation - Number Keys**
   - [ ] Press `3` (number key)
   - [ ] Scene 3 highlights immediately
   - [ ] Press `1`
   - [ ] Scene 1 highlights
   - [ ] Press `8` (if 8 scenes exist)
   - [ ] Scene 8 highlights
   - [ ] Press `9` (if only 6 scenes)
   - [ ] Nothing happens (no error)

8. **Scene Actions**
   - [ ] Press `2` (select scene 2)
   - [ ] Press `E` (edit headline)
   - [ ] Headline input field appears and focuses
   - [ ] Type: "TEST HEADLINE EDIT"
   - [ ] Press `Enter`
   - [ ] Headline saves
   - [ ] Press `R` (regenerate)
   - [ ] Confirmation dialog appears
   - [ ] Press `Esc` to cancel
   - [ ] Dialog closes, no regeneration
   - [ ] Press `R` again
   - [ ] Click "CONFIRM" in dialog
   - [ ] Scene regenerates

9. **Input Protection**
   - [ ] Press `E` on scene 1 (edit mode)
   - [ ] Type "jjjkkkrrr" in headline field
   - [ ] Verify: Text appears in input (NOT interpreted as shortcuts)
   - [ ] Verify: Scene does NOT navigate or regenerate
   - [ ] Press `Esc` to cancel edit
   - [ ] Now press `J` (outside input)
   - [ ] Verify: Scene 2 highlights (shortcut works outside input)

### Settings Page

10. **Settings Shortcuts**
    - [ ] Navigate to /settings
    - [ ] Press `D` (dashboard)
    - [ ] Redirects to dashboard
    - [ ] Press `S` (settings)
    - [ ] Returns to settings

### Expected Result:
✅ All keyboard shortcuts work correctly, no conflicts, input protection active

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 3: Bulk Operations & Multi-Job Workflow (10 minutes)

**Objective:** Test system under load with multiple concurrent jobs.

### Setup
- [ ] Ensure system is idle (no jobs running)
- [ ] Worker console visible

### Create Multiple Jobs

1. **Create 3 Jobs Simultaneously**
   - [ ] Open 3 browser tabs to /broadcasts/new
   - [ ] Paste test script in all 3 tabs (use script from Test 1)
   - [ ] Change AI provider in each:
     - Tab 1: Google
     - Tab 2: Claude (if available)
     - Tab 3: Groq (if available)
   - [ ] Click "CREATE BROADCAST" in all 3 tabs rapidly
   - [ ] All 3 redirect to storyboard editor
   - [ ] Note all 3 job IDs:
     1. `_________________________`
     2. `_________________________`
     3. `_________________________`

2. **Monitor Concurrent Processing**
   - [ ] Worker console shows all 3 jobs queued
   - [ ] Jobs process in order (first submitted processes first)
   - [ ] No race conditions or conflicts
   - [ ] All 3 jobs reach "ANALYZING" status
   - [ ] All 3 complete analysis within 2 minutes
   - [ ] All 3 transition to "GENERATING_IMAGES"
   - [ ] Images generate for all jobs (15-20 min total)

3. **Queue Management**
   - [ ] Navigate to /broadcasts
   - [ ] All 3 jobs visible in list
   - [ ] Status badges show current state
   - [ ] Jobs don't interfere with each other
   - [ ] Check worker console for errors (should be none)

### Bulk Deletion (if implemented)

4. **Delete Multiple Jobs**
   - [ ] Navigate to /broadcasts
   - [ ] Select first job (checkbox if implemented)
   - [ ] Select second job
   - [ ] Click "DELETE SELECTED" (if bulk delete exists)
   - [ ] Confirm deletion
   - [ ] Jobs removed from list
   - [ ] Database updated (verify with page refresh)

### Expected Result:
✅ System handles multiple concurrent jobs without conflicts or errors

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 4: Settings & Configuration (10 minutes)

**Objective:** Test all settings changes and persistence.

### AI Provider Configuration

1. **Change AI Provider**
   - [ ] Navigate to /settings
   - [ ] Note current AI provider: `_____________`
   - [ ] Change to different provider
   - [ ] Click "SAVE SETTINGS"
   - [ ] Success message appears
   - [ ] Refresh page (F5)
   - [ ] Setting persists
   - [ ] Create new broadcast with new provider
   - [ ] Verify analysis uses new provider (check worker logs)

### Rendering Configuration

2. **Remotion Settings**
   - [ ] Navigate to /settings
   - [ ] Find "REMOTION_CONCURRENCY" setting
   - [ ] Change from 4 to 2
   - [ ] Click "SAVE SETTINGS"
   - [ ] Success confirmation
   - [ ] Verify persistence (refresh page)
   - [ ] Create a job and render
   - [ ] Check worker logs: Verify concurrency=2 used

3. **Storage Paths**
   - [ ] Navigate to /settings
   - [ ] Verify STORAGE_PATH displays current value
   - [ ] Change to temporary test path (e.g., `C:\Temp\ObsidianTest`)
   - [ ] Click "SAVE SETTINGS"
   - [ ] Warning appears (if path doesn't exist)
   - [ ] Revert to original path
   - [ ] Save again

### API Keys (Read-Only)

4. **API Key Display**
   - [ ] Navigate to /settings
   - [ ] Find API key fields
   - [ ] Verify keys are masked (e.g., `***************abc123`)
   - [ ] Keys are NOT shown in plain text
   - [ ] Cannot edit keys directly in UI (must use .env file)

### Reset to Defaults (if implemented)

5. **Reset Configuration**
   - [ ] Change multiple settings
   - [ ] Click "RESET TO DEFAULTS" button (if exists)
   - [ ] Confirm reset
   - [ ] All settings revert to defaults
   - [ ] Page refreshes
   - [ ] Default values displayed

### Expected Result:
✅ Settings save correctly, persist across sessions, apply to new jobs

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 5: Error Scenarios & Recovery (15 minutes)

**Objective:** Verify graceful error handling and system resilience.

### Form Validation Errors

1. **Script Too Short**
   - [ ] Navigate to /broadcasts/new
   - [ ] Enter exactly 99 characters
   - [ ] Click "CREATE BROADCAST"
   - [ ] Error message: "Script must be at least 100 characters"
   - [ ] Form does NOT submit
   - [ ] Field highlights (red border)

2. **Script Too Long** (if limit exists)
   - [ ] Enter 5000+ characters
   - [ ] Click "CREATE BROADCAST"
   - [ ] Error or warning appears (if limit enforced)
   - [ ] Otherwise, submits successfully

3. **Empty Form**
   - [ ] Clear all fields
   - [ ] Click "CREATE BROADCAST"
   - [ ] Error: "Script is required"
   - [ ] Error: "AI provider is required"
   - [ ] Form does NOT submit

### API Errors

4. **Invalid Whisk Token**
   - [ ] Stop system (`STOP.bat`)
   - [ ] Edit `.env`: Change WHISK_API_TOKEN to invalid value
   - [ ] Start system (`START.bat`)
   - [ ] Create a broadcast
   - [ ] Analysis completes
   - [ ] Image generation starts
   - [ ] Worker console shows "401 Unauthorized" errors
   - [ ] Scene cards show "FAILED" status
   - [ ] User-friendly error in UI: "Image generation failed"
   - [ ] Revert `.env` to valid token
   - [ ] Restart system

5. **Database Connection Loss** (destructive - skip in production)
   - [ ] Create a broadcast (let it reach generating_images)
   - [ ] Stop Postgres: `docker stop obsidian_postgres`
   - [ ] Wait for next database query
   - [ ] Worker console shows connection errors
   - [ ] UI shows "System Offline" indicator
   - [ ] Start Postgres: `docker start obsidian_postgres`
   - [ ] Workers reconnect automatically
   - [ ] Job resumes processing
   - [ ] UI shows "System Online" again

6. **Redis Queue Failure** (destructive - skip in production)
   - [ ] Create a broadcast
   - [ ] Stop Redis: `docker stop obsidian_redis`
   - [ ] Worker console shows connection errors
   - [ ] New jobs cannot be created (submit button disabled or error)
   - [ ] Start Redis: `docker start obsidian_redis`
   - [ ] Workers reconnect
   - [ ] Job creation works again

### Upload Errors

7. **Invalid Avatar Format**
   - [ ] Create a broadcast (reach review_assets)
   - [ ] Try to upload non-MP4 file (e.g., .txt, .jpg)
   - [ ] Error: "Invalid file format. Please upload MP4."
   - [ ] Upload does NOT proceed

8. **Avatar File Too Large** (if limit enforced)
   - [ ] Create or find a 200MB+ MP4 file
   - [ ] Try to upload
   - [ ] Error or warning: "File too large, please optimize"
   - [ ] Upload may fail or take very long

### Network Interruption

9. **Network Disconnect During Image Generation**
   - [ ] Create a broadcast
   - [ ] Wait until 2-3 images complete
   - [ ] Disconnect internet (Wi-Fi off or unplug Ethernet)
   - [ ] Remaining scenes fail to generate
   - [ ] Worker console shows network errors
   - [ ] Reconnect internet
   - [ ] Click "REGENERATE" on failed scenes
   - [ ] Scenes regenerate successfully

### Expected Result:
✅ All errors handled gracefully, system recovers without data loss

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 6: Analytics & Reporting (5 minutes)

**Objective:** Verify analytics page displays accurate metrics.

### Dashboard Metrics

1. **Metrics Accuracy**
   - [ ] Navigate to /analytics (or dashboard)
   - [ ] Note "Total Broadcasts" count
   - [ ] Create a new broadcast
   - [ ] Return to analytics
   - [ ] Total Broadcasts increased by 1
   - [ ] "Completed Today" shows correct count
   - [ ] "In Progress" shows jobs currently processing
   - [ ] "Queue Status" shows pending jobs

2. **Charts & Visualizations** (if implemented)
   - [ ] Charts render without errors
   - [ ] Data points match actual job counts
   - [ ] Date filters work (if present)
   - [ ] Export functionality works (if present)

### Performance Metrics

3. **Average Processing Times**
   - [ ] Analytics page shows average times for:
     - Analysis duration
     - Image generation per scene
     - Rendering duration
   - [ ] Averages are reasonable (30-60s analysis, 90s per image, 2-4 min render)
   - [ ] Metrics update as new jobs complete

### Expected Result:
✅ Analytics display accurate data, update in real-time

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 7: Queue Resume & Persistence (10 minutes)

**Objective:** Verify jobs resume after system restart.

### Create Job and Interrupt

1. **Start Job**
   - [ ] Create a broadcast
   - [ ] Wait until status = "GENERATING_IMAGES"
   - [ ] Wait for 2-3 images to complete
   - [ ] Note job ID: `_________________________`
   - [ ] Note completed scenes: Scene ___ and Scene ___

2. **Stop System**
   - [ ] Run `STOP.bat` (graceful shutdown)
   - [ ] All windows close
   - [ ] Docker containers stop

3. **Restart System**
   - [ ] Run `START.bat`
   - [ ] All services start
   - [ ] Workers reconnect to queues

4. **Verify Resume**
   - [ ] Navigate to /jobs/[job-id]
   - [ ] Job still exists
   - [ ] Status still "GENERATING_IMAGES"
   - [ ] Completed scenes (2-3) still show images
   - [ ] Incomplete scenes resume generating
   - [ ] Wait for all scenes to complete
   - [ ] Job transitions to "REVIEW_ASSETS"
   - [ ] No duplicate images
   - [ ] No data loss

### Database Persistence

5. **Verify Database Data**
   - [ ] Stop system
   - [ ] Restart system
   - [ ] Navigate to /broadcasts
   - [ ] All jobs from previous tests still present
   - [ ] Job details intact (scripts, timestamps, statuses)
   - [ ] Images still accessible
   - [ ] Videos still downloadable

### Expected Result:
✅ Jobs resume processing after restart, no data loss

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 8: Reference Images (10 minutes)

**Objective:** Test reference image upload and usage.

### Upload References

1. **Subject Reference**
   - [ ] Create a broadcast (wait for images to generate)
   - [ ] Click scene 1
   - [ ] Expand "Reference Images" section
   - [ ] Click "Add Subject Reference"
   - [ ] Upload JPEG image (512x512+, <5MB)
   - [ ] Thumbnail appears
   - [ ] Badge shows "1 active reference"
   - [ ] Filename displayed

2. **Scene Reference**
   - [ ] Click "Add Scene Reference"
   - [ ] Upload different JPEG
   - [ ] Thumbnail appears
   - [ ] Badge updates to "2 active references"

3. **Style Reference**
   - [ ] Click "Add Style Reference"
   - [ ] Upload third JPEG
   - [ ] Badge shows "3 active references"

### Regenerate with References

4. **Test Reference Influence**
   - [ ] Click "REGENERATE" button
   - [ ] Confirm regeneration
   - [ ] Wait ~90-110 seconds (longer than text-only)
   - [ ] New image appears
   - [ ] New image reflects reference influences
   - [ ] Compare to original: Noticeable style/subject changes

### Remove References

5. **Delete References**
   - [ ] Hover over subject reference thumbnail
   - [ ] Click X button
   - [ ] Reference removed
   - [ ] Badge updates to "2 active"
   - [ ] Click X on remaining references
   - [ ] Badge shows "0 active"

### Edge Cases

6. **Invalid File Upload**
   - [ ] Try to upload .txt file
   - [ ] Error: "Invalid file format"
   - [ ] Try to upload 15MB image
   - [ ] Error: "File too large" (if limit enforced)

### Expected Result:
✅ References upload, apply to generation, and can be removed

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 9: Performance & Load Testing (10 minutes)

**Objective:** Measure system performance under normal and heavy load.

### Single Job Performance

1. **Measure Analysis Time**
   - [ ] Create broadcast with 200-word script
   - [ ] Start timer when clicking "CREATE BROADCAST"
   - [ ] Stop timer when status → "GENERATING_IMAGES"
   - [ ] Analysis time: _____ seconds (target: <60s)

2. **Measure Image Generation Time**
   - [ ] Start timer when first scene starts generating
   - [ ] Stop timer when last scene completes
   - [ ] Total time: _____ minutes (target: <15 min for 8 scenes)
   - [ ] Average per scene: _____ seconds (target: ~90-120s)

3. **Measure Rendering Time**
   - [ ] Upload avatar
   - [ ] Start timer when status → "RENDERING"
   - [ ] Stop timer when status → "COMPLETED"
   - [ ] Rendering time: _____ seconds (target: <300s / 5 min)

### Page Load Performance

4. **Dashboard Load Time**
   - [ ] Clear browser cache (Ctrl+Shift+Del)
   - [ ] Navigate to http://localhost:8347
   - [ ] Measure time to interactive (F12 → Performance tab)
   - [ ] Load time: _____ seconds (target: <3s)

5. **Broadcasts List Load Time**
   - [ ] Create 20+ jobs (if not already present)
   - [ ] Navigate to /broadcasts
   - [ ] Measure time to render table
   - [ ] Load time: _____ seconds (target: <2s for 20 jobs)

6. **Storyboard Editor Load Time**
   - [ ] Navigate to job with 8 scenes
   - [ ] Measure time to render all scene cards
   - [ ] Load time: _____ seconds (target: <2s)

### Memory & CPU Usage

7. **Monitor Resource Usage**
   - [ ] Open Task Manager (Ctrl+Shift+Esc)
   - [ ] Find Node.js processes
   - [ ] Create a job and monitor:
     - CPU usage: _____ % (should spike during render, <10% otherwise)
     - Memory usage: _____ MB (should be <1GB for workers)
   - [ ] No memory leaks (memory returns to baseline after job completes)

### Expected Result:
✅ Performance meets targets, no excessive resource usage

**Result:** ☐ PASS ☐ FAIL

**Performance Metrics Summary:**
- Analysis: _____ s (target: <60s)
- Image gen (per scene): _____ s (target: 90-120s)
- Rendering: _____ s (target: <300s)
- Dashboard load: _____ s (target: <3s)
- CPU usage (idle): _____ % (target: <10%)
- Memory usage: _____ MB (target: <1GB)

**Notes:**
-

---

## Test 10: Browser Compatibility (15 minutes)

**Objective:** Test UI functionality across different browsers.

### Chrome/Chromium-based Browsers

1. **Google Chrome**
   - [ ] Open http://localhost:8347 in Chrome
   - [ ] Dashboard renders correctly
   - [ ] All colors and styles match design system
   - [ ] Create a broadcast
   - [ ] Keyboard shortcuts work (J, K, Enter, etc.)
   - [ ] File uploads work (avatar upload)
   - [ ] Video preview plays
   - [ ] Download video works
   - [ ] No console errors (F12)

2. **Microsoft Edge**
   - [ ] Open http://localhost:8347 in Edge
   - [ ] Repeat all tests from Chrome
   - [ ] Verify identical behavior
   - [ ] No browser-specific issues

### Firefox (if available)

3. **Mozilla Firefox**
   - [ ] Open http://localhost:8347 in Firefox
   - [ ] Dashboard renders correctly
   - [ ] All interactive elements work
   - [ ] Keyboard shortcuts work
   - [ ] File uploads work
   - [ ] Video preview plays
   - [ ] Download works
   - [ ] No console errors

### Mobile/Responsive (bonus)

4. **Responsive Design** (if implemented)
   - [ ] Resize browser to 768px width
   - [ ] UI adapts to smaller screen
   - [ ] Navigation still functional
   - [ ] Tables/grids responsive
   - [ ] Forms usable on small screen

### Expected Result:
✅ System works identically in all major browsers

**Result:** ☐ PASS ☐ FAIL

**Browser Test Matrix:**

| Feature | Chrome | Edge | Firefox |
|---------|--------|------|---------|
| Dashboard Load | ☐ | ☐ | ☐ |
| Create Broadcast | ☐ | ☐ | ☐ |
| Keyboard Shortcuts | ☐ | ☐ | ☐ |
| File Upload | ☐ | ☐ | ☐ |
| Video Preview | ☐ | ☐ | ☐ |
| Download Video | ☐ | ☐ | ☐ |

**Notes:**
-

---

## Test 11: Edge Cases & Boundary Conditions (20 minutes)

**Objective:** Test unusual scenarios and boundary conditions.

### Script Length Variations

1. **Minimum Length Script** (exactly 100 characters)
   - [ ] Create script with exactly 100 characters
   - [ ] Submit broadcast
   - [ ] Analysis succeeds
   - [ ] At least 3 scenes generated
   - [ ] Rendering completes successfully

2. **Very Long Script** (2000+ words)
   - [ ] Create script with 2000+ characters
   - [ ] Submit broadcast
   - [ ] Analysis succeeds
   - [ ] Maximum 8-10 scenes generated (not 50+)
   - [ ] Excess content truncated gracefully
   - [ ] No timeout errors

3. **Script with Special Characters**
   - [ ] Create script with: `& < > " ' \ / | @ # $ % * [ ] { }`
   - [ ] Submit broadcast
   - [ ] Analysis succeeds
   - [ ] Special characters handled correctly
   - [ ] No XSS vulnerabilities
   - [ ] Characters display correctly in UI

### Ticker Headline Edge Cases

4. **Very Long Headline**
   - [ ] Edit headline to 300+ characters
   - [ ] Save headline
   - [ ] Headline truncated or wraps correctly
   - [ ] No UI breaking
   - [ ] Ticker displays without overflow

5. **Empty Headline**
   - [ ] Edit headline to empty string
   - [ ] Try to save
   - [ ] Error: "Headline cannot be empty" (or saves with default)

6. **Special Characters in Headline**
   - [ ] Edit headline to: `<script>alert("XSS")</script>`
   - [ ] Save headline
   - [ ] Headline is escaped/sanitized
   - [ ] No JavaScript execution
   - [ ] Displays as plain text

### File Upload Edge Cases

7. **Corrupt Avatar File**
   - [ ] Create a fake .mp4 file (rename .txt to .mp4)
   - [ ] Try to upload as avatar
   - [ ] Upload fails gracefully
   - [ ] Error: "Invalid video file" or similar

8. **Very Large Avatar** (100MB+)
   - [ ] Upload unoptimized 100MB+ avatar
   - [ ] Upload succeeds (may be slow)
   - [ ] OR error: "File too large, please optimize"
   - [ ] System does not crash

9. **Avatar with Wrong Audio Sample Rate**
   - [ ] Upload avatar with 44.1kHz audio (not 48kHz)
   - [ ] Upload succeeds (no validation at upload time)
   - [ ] Render completes
   - [ ] Check final video: Audio may be out of sync
   - [ ] (Document as known limitation if sync is off)

### Concurrent Actions

10. **Regenerate Multiple Scenes Rapidly**
    - [ ] Select scene 1, press R, confirm
    - [ ] Immediately select scene 2, press R, confirm
    - [ ] Immediately select scene 3, press R, confirm
    - [ ] All 3 scenes queued for regeneration
    - [ ] Worker processes all 3 without conflicts
    - [ ] All 3 complete successfully
    - [ ] No duplicate jobs or race conditions

11. **Edit Headline While Regenerating**
    - [ ] Regenerate a scene
    - [ ] While generating, press E and edit headline
    - [ ] Save headline
    - [ ] New headline saves
    - [ ] Image continues generating
    - [ ] When regeneration completes, headline persists

12. **Delete Job While Processing**
    - [ ] Create a broadcast
    - [ ] Wait until "GENERATING_IMAGES" status
    - [ ] Navigate to /broadcasts
    - [ ] Delete the job (if delete implemented)
    - [ ] Job removed from database
    - [ ] Workers stop processing (or handle missing job gracefully)
    - [ ] No orphaned files

### Database Edge Cases

13. **Duplicate Job ID** (should never happen, but test)
    - [ ] Create a broadcast
    - [ ] Note job ID
    - [ ] Try to create another job with same ID (if API allows)
    - [ ] Database constraint prevents duplicate
    - [ ] Error handled gracefully

14. **Missing Scene Data**
    - [ ] Create a broadcast
    - [ ] Manually delete a scene from database (via SQL client)
    - [ ] Refresh storyboard editor
    - [ ] UI handles missing scene gracefully
    - [ ] No crash or blank page

### Network Edge Cases

15. **Slow Network**
    - [ ] Use browser DevTools → Network tab → Throttle to "Slow 3G"
    - [ ] Create a broadcast
    - [ ] Page loads (slowly but completely)
    - [ ] Analysis completes (may take longer)
    - [ ] No timeouts or failures

16. **Upload During Network Interruption**
    - [ ] Start uploading avatar
    - [ ] Disconnect network mid-upload
    - [ ] Upload fails gracefully
    - [ ] Error: "Upload failed, please try again"
    - [ ] Reconnect network
    - [ ] Retry upload
    - [ ] Upload succeeds

### Expected Result:
✅ System handles all edge cases gracefully, no crashes or data corruption

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Test 12: Data Persistence & Recovery (10 minutes)

**Objective:** Verify data persists across restarts and survives failures.

### Hard Shutdown Recovery

1. **Forced Shutdown During Processing**
   - [ ] Create a broadcast
   - [ ] Wait until "GENERATING_IMAGES"
   - [ ] Force quit all processes (Ctrl+C in all windows)
   - [ ] Do NOT run `STOP.bat` (simulate crash)
   - [ ] Wait 10 seconds
   - [ ] Run `START.bat`
   - [ ] All services restart
   - [ ] Navigate to /broadcasts
   - [ ] Job still exists
   - [ ] Completed scenes still have images
   - [ ] Incomplete scenes resume generating
   - [ ] No corruption

### Docker Volume Persistence

2. **Docker Container Restart**
   - [ ] Note number of jobs in /broadcasts
   - [ ] Stop Docker: `docker-compose down`
   - [ ] Verify containers stopped: `docker ps` (should be empty)
   - [ ] Restart Docker: `docker-compose up -d`
   - [ ] Verify containers running: `docker ps`
   - [ ] Navigate to /broadcasts
   - [ ] All jobs still present
   - [ ] Job count unchanged
   - [ ] Data intact

3. **Docker Volume Inspection**
   - [ ] List volumes: `docker volume ls`
   - [ ] Verify volumes exist:
     - `obsidian_postgres_data`
     - `obsidian_redis_data`
   - [ ] Inspect volume: `docker volume inspect obsidian_postgres_data`
   - [ ] Mountpoint shows valid path

### File System Persistence

4. **Local Storage Persistence**
   - [ ] Navigate to `C:\Users\konra\ObsidianNewsDesk\`
   - [ ] Verify folders exist:
     - `images\` (contains scene images)
     - `avatars\` (contains avatar MP4s)
     - `videos\` (contains final videos if saved)
   - [ ] Count files in each folder
   - [ ] Stop system
   - [ ] Restart system
   - [ ] File counts unchanged
   - [ ] Files still accessible

5. **Database Backup/Restore** (advanced - optional)
   - [ ] Export database: `docker exec obsidian_postgres pg_dump -U postgres obsidian_news_desk > backup.sql`
   - [ ] Stop system
   - [ ] Delete Docker volume: `docker volume rm obsidian_postgres_data`
   - [ ] Restart system (creates fresh volume)
   - [ ] Restore database: `docker exec -i obsidian_postgres psql -U postgres obsidian_news_desk < backup.sql`
   - [ ] Navigate to /broadcasts
   - [ ] All jobs restored
   - [ ] Data intact

### Expected Result:
✅ All data persists across restarts, survives crashes, can be backed up/restored

**Result:** ☐ PASS ☐ FAIL

**Notes:**
-

---

## Summary & Reporting

### Test Results Overview

**Tests Passed:** ___ / 12

**Pass Rate:** ___ %

### Critical Issues Found

(Issues that block release or core functionality)

| # | Test | Issue Description | Severity |
|---|------|------------------|----------|
| 1 |      |                  | Critical / Major / Minor |
| 2 |      |                  |          |
| 3 |      |                  |          |

### Minor Issues Found

(Issues that don't block release but should be tracked)

| # | Test | Issue Description | Priority |
|---|------|------------------|----------|
| 1 |      |                  | High / Medium / Low |
| 2 |      |                  |          |
| 3 |      |                  |          |

### Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Script Analysis | <60s | ___ s | ☐ Pass ☐ Fail |
| Image Generation (per scene) | 90-120s | ___ s | ☐ Pass ☐ Fail |
| Video Rendering | <300s | ___ s | ☐ Pass ☐ Fail |
| Dashboard Load | <3s | ___ s | ☐ Pass ☐ Fail |
| Memory Usage (idle) | <1GB | ___ MB | ☐ Pass ☐ Fail |
| CPU Usage (idle) | <10% | ___ % | ☐ Pass ☐ Fail |

### Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | ___ | ☐ Pass ☐ Fail | |
| Edge | ___ | ☐ Pass ☐ Fail | |
| Firefox | ___ | ☐ Pass ☐ Fail | |

### Overall Assessment

**System Status:** ☐ PRODUCTION READY ☐ NEEDS FIXES ☐ MAJOR ISSUES

**Recommendation:**
- [ ] Approve for production deployment
- [ ] Fix critical issues before deployment
- [ ] Re-test after fixes
- [ ] Schedule follow-up regression test

### Next Steps

**Immediate Actions Required:**
1.
2.
3.

**Future Improvements:**
1.
2.
3.

### Test Environment

**Tested By:** _______________
**Date:** _______________
**System Version:** _______________
**Git Commit:** _______________
**Node.js Version:** _______________
**Docker Version:** _______________
**OS:** _______________

### Sign-Off

**Tester Signature:** _______________
**Date:** _______________

**QA Lead Approval:** _______________
**Date:** _______________

---

## Appendix A: Test Data

### Sample News Scripts

**Short Script (100 chars):**
```
Breaking news: Mayor announces plan. City officials confirm details. Construction begins next month.
```

**Medium Script (200 words):**
```
Good evening. Tonight we examine the unprecedented climate legislation
moving through Congress. The Clean Energy Acceleration Act represents
the most ambitious environmental policy in decades, with a proposed
budget of $800 billion over ten years.

Senate leaders are divided along partisan lines. Supporters argue the
bill will create millions of green jobs while reducing carbon emissions
by 50 percent by 2035. Critics warn of economic disruption and rising
energy costs for American families.

Environmental groups are celebrating, calling it a generational victory.
The Sierra Club and Natural Resources Defense Council have mobilized
grassroots campaigns supporting swift passage. Meanwhile, industry
lobbyists from fossil fuel sectors are pushing for amendments to delay
implementation timelines.

Key provisions include tax credits for renewable energy infrastructure,
stricter emission standards for vehicles, and funding for climate
adaptation in vulnerable communities. The bill also establishes a new
federal agency to oversee the transition to clean energy.
```

**Long Script (500+ words):**
```
Good evening and welcome to tonight's special report on the historic
climate legislation currently before Congress. The Clean Energy
Acceleration Act, introduced last month, represents the most comprehensive
environmental policy proposal in American history...

[Continue with 500+ words of news content]
```

---

## Appendix B: Known Limitations

(Document expected behaviors that are not bugs)

1. **Whisk API Rate Limiting:** Images generate with ~60s delay between each scene (API limitation)
2. **Manual Avatar Generation:** HeyGen automation not enabled by default (requires Python setup)
3. **Token Expiration:** Whisk tokens expire after ~1 hour (must refresh manually)
4. **Avatar Audio Sync:** Requires 48kHz sample rate (44.1kHz may cause sync issues)
5. **Large Avatar Files:** >10MB avatars may timeout in Remotion (use optimize-avatar.sh script)

---

## Appendix C: Troubleshooting Guide

### Common Issues During Testing

**Issue:** "Cannot connect to Redis"
- **Fix:** Run `docker ps` to verify Redis container is running
- **Fix:** Check .env REDIS_URL matches docker-compose.yml port

**Issue:** "Images stuck on Generating..."
- **Fix:** Check Whisk token hasn't expired (refresh in .env)
- **Fix:** Check worker console for 401 errors

**Issue:** "Avatar upload fails"
- **Fix:** Verify file is MP4 format
- **Fix:** Check audio sample rate is 48kHz
- **Fix:** Optimize large files with `./scripts/optimize-avatar.sh`

**Issue:** "Render timeout"
- **Fix:** Increase REMOTION_TIMEOUT in .env
- **Fix:** Check available disk space
- **Fix:** Verify ffmpeg/ffprobe installed

**Issue:** "Database connection failed"
- **Fix:** Run `docker-compose up -d` to start Postgres
- **Fix:** Verify DATABASE_URL in .env matches docker-compose.yml

---

**End of Full Test Suite**

This comprehensive test suite should be executed in its entirety before major releases. For daily testing, use the SMOKE_TEST.md checklist instead.

**Document Version:** 1.0
**Last Updated:** March 22, 2026
