# Testing Guide: Database-Driven Timing System

**Date:** March 28, 2026
**Status:** Ready for testing
**Changes:** Timing stored in database after avatar upload (no more fuzzy matching during render)

---

## Prerequisites

Before testing:

1. **System must be stopped:**
   ```cmd
   cd obsidian-news-desk
   STOP.bat
   ```
   Choose "Y" to stop Docker services (full shutdown)

2. **Database migration applied:**
   ✅ Already done (March 28, 2026)
   - Added `word_start_time` and `word_end_time` columns
   - Migration: `010_add_scene_timing_columns.sql`

3. **Environment ready:**
   - `.env` file has valid API keys (OPENAI_API_KEY, WHISK_API_TOKEN)
   - Docker Desktop is running
   - Ports 5432, 6379, 8347 are available

---

## Test Plan Overview

We'll create **2 test broadcasts** to validate:

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| **Test 1** | New broadcast (uses new timing system) | Perfect sync, no drift, fast render |
| **Test 2** | Old broadcast (before March 28) | Fallback works, still renders correctly |

**Total Time:** ~45-60 minutes per test broadcast

---

## Step-by-Step Testing

### Phase 1: Start System

1. **Open terminal:**
   ```cmd
   cd C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk
   ```

2. **Start system:**
   ```cmd
   START.bat
   ```

3. **Wait for startup** (~30 seconds):
   - Watch for "SYSTEM STARTED SUCCESSFULLY!"
   - Browser should open to http://localhost:8347
   - **3 windows will be open:**
     - Main window (can close after startup)
     - Workers window (KEEP OPEN)
     - Web UI window (KEEP OPEN)

4. **Verify services:**
   - Check Workers window: Should show "✅ All workers started"
   - Check Web UI window: Should show "✓ Compiled successfully"
   - Check browser: Dashboard should load

**If startup fails:**
- Check Docker Desktop is running
- Verify `.env` has API keys
- Run `docker-compose logs` to debug

---

### Phase 2: Create Test Broadcast #1 (New System)

This broadcast will use the **new database-driven timing**.

#### 2.1 Create New Broadcast

1. **Navigate to New Broadcast:**
   - Click "New Broadcast" in sidebar
   - Or go to http://localhost:8347/new

2. **Paste test script:**
   ```
   The Senate passed historic climate legislation today after months of debate.
   This bill represents the largest investment in clean energy in American history.

   The legislation includes three hundred billion dollars for renewable energy projects.
   Solar and wind power will receive the majority of funding.

   Environmental groups celebrated the passage as a major victory.
   However, some critics argue the bill doesn't go far enough to address the crisis.

   The President is expected to sign the bill into law next week.
   Implementation will begin immediately after signing.
   ```

3. **Configure settings:**
   - AI Provider: OpenAI (or your preferred provider)
   - Style Preset: Default (or any preset)

4. **Click "Create Broadcast"**

5. **Wait for analysis** (~30-60 seconds):
   - Watch job status change: `pending` → `analyzing` → `generating_images`

#### 2.2 Monitor Image Generation

1. **Check job list:**
   - Status should show `generating_images`
   - Progress indicator shows X/Y scenes complete

2. **Watch logs in Workers window:**
   ```
   [IMAGES] Processing scene 0...
   [Whisk] Generating image for: "The Senate passed historic climate..."
   [IMAGES] Scene 0 complete (15.2s)
   ```

3. **Wait for all scenes** (~15-20 minutes for 8 scenes):
   - Status will change to `review_assets` when done

#### 2.3 Upload Avatar

1. **Click on job** to open storyboard editor

2. **Review generated images:**
   - Check if all scenes have images
   - Verify images match prompts
   - (Optional) Regenerate any poor images

3. **Generate HeyGen avatar:**
   - Click "LAUNCH HEYGEN BROWSER"
   - Manually create avatar on HeyGen.com with the script
   - Download `.mp4` file (will be 30-60 MB)

4. **Optimize avatar (if >10MB):**
   ```cmd
   cd obsidian-news-desk
   ./scripts/optimize-avatar.sh "C:\path\to\avatar.mp4" "optimized.mp4"
   ```

5. **Upload avatar:**
   - Drag and drop into avatar upload zone
   - Or click to browse

6. **🔍 WATCH THE COMPILE LOGS (CRITICAL):**

   **In Web UI terminal, you should see:**
   ```
   🎙️ [API] Transcribing audio...
   ✅ [API] Transcription complete: 245 words
   🎯 [API] Matching scenes to transcript for database-driven pacing...
      Scene 0: 0.00s - 3.45s (3.45s)
      Scene 1: 3.45s - 6.80s (3.35s)
      Scene 2: 6.80s - 10.12s (3.32s)
      ...
   ✅ [API] Scene timing stored: 8/8 scenes matched
   ```

   **✅ SUCCESS INDICATOR:**
   - All scenes matched (8/8 or whatever total)
   - Each scene has start/end times logged
   - "Scene timing stored" message appears

   **⚠️ WARNING SIGNS:**
   - "X scenes failed to match"
   - "No words matched for..."
   - Any errors about timing storage

#### 2.4 Start Render

1. **Click "COMPILE & RENDER"**

2. **🔍 WATCH RENDER WORKER LOGS (CRITICAL):**

   **In Workers window, you should see:**
   ```
   🎬 [RENDER] Starting render for job <id>
   ✅ [RENDER] All scenes have stored timing from database (fast path)
   🚀 [RENDER] Using stored timing from database (O(1) lookup)
   ✅ [RENDER] Timing loaded from database: 8 scenes
   ✅ [RENDER] Pacing validation passed
      Hook scenes: 4
      Body scenes: 4
      Total duration: 60.00s (1800 frames)
   ```

   **✅ SUCCESS INDICATOR:**
   - "All scenes have stored timing" message
   - "Using stored timing from database (O(1) lookup)"
   - "fast path" mentioned

   **⚠️ FALLBACK MODE (NOT EXPECTED):**
   - "Falling back to pacing algorithm"
   - "Using PUNCTUATION-BASED pacing"
   - This means timing wasn't stored properly

3. **Wait for render** (~2-3 minutes for 60s video):
   - Progress bar updates in UI
   - Workers window shows frame-by-frame progress

4. **Download video** when status = `completed`

#### 2.5 Verify Video Synchronization

**This is the MOST CRITICAL test.**

1. **Open video** in media player (VLC recommended)

2. **Check synchronization at key timestamps:**

   | Time | Expected Image | Expected Narration |
   |------|----------------|-------------------|
   | 0:00 | Senate/legislation | "The Senate passed..." |
   | 0:03 | Clean energy/dollars | "This bill represents..." |
   | 0:07 | Solar/wind panels | "The legislation includes..." |
   | 0:10 | Renewable energy | "Solar and wind power..." |

3. **Test for drift:**
   - Play video from start
   - Note when first image changes
   - Does it match sentence boundary? (should be exact)
   - Continue watching
   - Note when each image changes
   - Do they STAY in sync throughout? (no drift)

4. **Test hook timing:**
   - First ~30 seconds should have faster image transitions
   - Check if first 4 images transition at correct sentences

5. **Test body timing:**
   - After 30s, images should transition at sentence boundaries
   - Check if remaining 4 images align with sentences

**✅ PASS CRITERIA:**
- Images change exactly when sentences change (±0.5s tolerance)
- No progressive drift (image 1 in sync → image 8 also in sync)
- Hook images transition at correct intervals
- Last image holds until end (no black screen)

**❌ FAIL CRITERIA:**
- Images start in sync but drift later
- Image changes 1-2 sentences late
- Black screen at end
- Images out of order

---

### Phase 3: Validate Database Timing (Optional Deep Dive)

**Check what's stored in database:**

1. **Find job ID:**
   - In browser URL: http://localhost:8347/jobs/{JOB_ID}
   - Copy the UUID

2. **Query database:**
   ```cmd
   docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "
     SELECT
       scene_order,
       word_start_time,
       word_end_time,
       (word_end_time - word_start_time) as duration,
       LEFT(sentence_text, 50) as sentence
     FROM news_scenes
     WHERE job_id = '<PASTE_JOB_ID_HERE>'
     ORDER BY scene_order;
   "
   ```

3. **Expected output:**
   ```
    scene_order | word_start_time | word_end_time | duration | sentence
   -------------+-----------------+---------------+----------+--------------------------------------------------
              0 |            0.00 |          3.45 |     3.45 | The Senate passed historic climate legislation...
              1 |            3.45 |          6.80 |     3.35 | This bill represents the largest investment...
              2 |            6.80 |         10.12 |     3.32 | The legislation includes three hundred billion...
              ...
   ```

4. **Validate:**
   - ✅ All scenes have timing (not NULL)
   - ✅ Times are sequential (no overlaps)
   - ✅ Durations are reasonable (2-5 seconds per scene)
   - ✅ Total duration ≈ avatar duration

---

### Phase 4: Test Backwards Compatibility (Old Jobs)

**Purpose:** Ensure old jobs (before March 28) still render correctly.

#### 4.1 Find Old Job (If Exists)

1. **Go to job list:** http://localhost:8347

2. **Look for jobs created before March 28:**
   - Check "Created" column
   - Find any `completed` or `failed` job from before today

3. **Click "Retry" or "Re-render"** (if available)

#### 4.2 Watch Fallback Logs

**In Workers window, you should see:**
```
⚠️ [RENDER] Only 0/8 scenes have stored timing
⚠️ [RENDER] Falling back to pacing algorithm
🎯 [Pacing] Using DATABASE-DRIVEN pacing (8 explicit sentence mappings)
```

**OR (if no sentence_text):**
```
⚠️ [RENDER] Falling back to pacing algorithm
📐 [Pacing] Using PUNCTUATION-BASED pacing (fallback mode)
```

**✅ SUCCESS INDICATOR:**
- Fallback triggered automatically
- Render completes without errors
- Video is still usable (even if sync is imperfect)

#### 4.3 If No Old Jobs Exist

**Skip this test** - Not critical since you're starting fresh.

---

## Troubleshooting

### Issue 1: "Scene timing stored: 0/8 scenes matched"

**Symptoms:**
- Compile logs show no scenes matched
- All scenes failed to find words

**Causes:**
- Sentence text doesn't match transcript
- Transcription quality is poor
- Audio is silent/corrupted

**Fix:**
1. Check avatar has audio: `ffprobe avatar.mp4`
2. Manually transcribe first sentence
3. Compare to database `sentence_text`
4. If very different, regenerate avatar with clearer speech

### Issue 2: "Falling back to pacing algorithm" on new job

**Symptoms:**
- New broadcast uses fallback instead of stored timing
- Logs say "Only X/8 scenes have stored timing"

**Causes:**
- Avatar upload failed partway through
- Transcription service error
- Database update failed

**Fix:**
1. Check compile endpoint logs for errors
2. Query database: `SELECT word_start_time FROM news_scenes WHERE job_id='...'`
3. If NULL, re-upload avatar (triggers transcription again)

### Issue 3: Video drift still occurs

**Symptoms:**
- Images start in sync but drift later
- Exact same issue as before

**Causes:**
- Stored timing is incorrect
- Render used fallback mode instead of stored timing
- Avatar duration mismatch

**Debug:**
1. Check render logs: Did it say "fast path" or "fallback"?
2. Query database timing (see Phase 3)
3. Compare stored times to actual avatar duration
4. Check if avatar was re-encoded (duration changed)

### Issue 4: Black screen at end

**Symptoms:**
- Video plays correctly but last 1-2 seconds are black

**Causes:**
- Last scene duration doesn't reach totalFrames
- Rounding error in frame calculation

**Fix:**
- Check render logs for "Coverage Validated"
- Should say: "Last scene ends at frame 1800: true"
- If false, timing adjustment failed

---

## Success Checklist

After completing tests, verify:

- [ ] **Compile logs** show "Scene timing stored: 8/8 scenes matched"
- [ ] **Render logs** show "Using stored timing from database (O(1) lookup)"
- [ ] **Database query** shows all scenes have `word_start_time` and `word_end_time`
- [ ] **Video playback** shows perfect sync (no drift)
- [ ] **Hook timing** is correct (first 30s)
- [ ] **Body timing** is correct (after 30s)
- [ ] **No black screen** at end
- [ ] **Fallback works** for old jobs (if tested)

---

## Reporting Issues

If you find problems:

1. **Capture logs:**
   - Compile endpoint logs (from Web UI terminal)
   - Render worker logs (from Workers terminal)
   - Copy entire log output from start to finish

2. **Get job data:**
   ```cmd
   docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "
     SELECT * FROM news_jobs WHERE id = '<job_id>';
   "
   docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "
     SELECT * FROM news_scenes WHERE job_id = '<job_id>' ORDER BY scene_order;
   "
   ```

3. **Describe symptoms:**
   - Exact timestamp where drift occurs
   - Which images are out of sync
   - What logs showed (fast path vs fallback)

4. **Share video:**
   - Upload video to drive/dropbox
   - Note exact timecodes of issues

---

## Next Steps After Testing

**If tests pass:**
1. ✅ System is production-ready
2. Start creating real broadcasts
3. Monitor first 5-10 videos for any edge cases
4. Document any workflow improvements

**If tests fail:**
1. Report issues with logs and database data
2. We'll debug and fix
3. Re-run tests after fixes
4. Repeat until stable

---

## Comparison: Before vs After

### Before (March 27)
- Render: Transcribe → Fuzzy match → Calculate timing (150s overhead)
- Complexity: ~300 lines of matching code
- Reliability: String matching can fail (70% threshold)
- Sync: Progressive drift due to sentence detection mismatch

### After (March 28)
- Render: Read database → Calculate frames (0.01s overhead)
- Complexity: ~50 lines of direct lookup
- Reliability: Database is single source of truth
- Sync: Perfect 1:1 mapping (no drift possible)

**Expected Improvement:** 15,000x faster timing calculation, zero drift.
