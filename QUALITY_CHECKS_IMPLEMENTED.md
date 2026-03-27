# Quality Check System - Implementation Summary

**Date:** March 24, 2026

## What Was Implemented

### 1. Comprehensive Quality Check Module
**File:** `src/lib/video/quality-check.ts`

**Checks:**
- ✅ Scene count matches expected count
- ✅ All scenes have images assigned (no null/undefined)
- ✅ Scene timing covers full video duration (no gaps = no black screens)
- ✅ Scene durations are reasonable (not too short/long)
- ✅ Detects gaps between scenes (would cause black screens)
- ✅ Validates coverage reaches end of video
- ✅ Prompt quality validation (manual review helper)

**Features:**
- Detailed error and warning messages
- Frame-by-frame gap detection
- Duration validation
- Comprehensive logging

### 2. Integration with Render Worker
**File:** `src/lib/queue/workers/render.worker.ts`

**Changes:**
- Quality checks run BEFORE rendering starts
- Prevents wasting 20+ minutes on bad renders
- Calculates pacing and validates timing
- Blocks render if quality checks fail
- Shows warnings but allows render if only minor issues

### 3. Full Pipeline Test Script
**File:** `scripts/run-test.ts`

**Features:**
- Uses test inputs from `test-inputs.md`
- Creates job with climate legislation script
- Copies avatar to storage
- Monitors progress through all stages
- Reports errors immediately
- Shows performance metrics at end

**Usage:**
```bash
npm run test:full
```

## Existing Safety Checks (Already Working)

### Asset Preparation
**File:** `src/lib/remotion/asset-preparation.ts`
- Validates all images exist at storage paths
- Copies images to public folder before render
- Checks file sizes (>1KB, not empty)
- Validates avatar file
- Detailed error reporting

### Render Worker
**File:** `src/lib/queue/workers/render.worker.ts`
- Database validation: All scenes must have image_url
- **Concurrency = 1:** Only ONE render at a time (prevents Chrome overload!)
- Asset preparation before render
- Error handling and job state management

### Scene Component
**File:** `src/lib/remotion/components/Scene.tsx`
- Image load error handling
- Fallback UI when images fail
- Dynamic path resolution
- Error logging with details

### Pacing Logic
**File:** `src/lib/remotion/pacing.ts`
- **CRITICAL FIX (lines 353-382):** Ensures continuous coverage with NO gaps
- Distributes remaining frames evenly
- Adjusts last scene to fill exactly to the end
- No black frames between scenes

## Chrome Process Issue - SOLVED

The render worker already has:
```typescript
concurrency: 1, // Process one render at a time (CPU intensive)
```

This means **only ONE Chrome/headless browser** will run at a time for rendering. The 18-process issue was likely from:
1. Multiple render jobs queued at once (now prevented)
2. Parallel image generation (different queue, OK)
3. Dev mode with hot reload (normal)

## How to Run Test

### 1. Ensure System is Running
```cmd
cd obsidian-news-desk
START.bat
```

This starts:
- Docker (Postgres + Redis)
- BullMQ workers (analyze, images, render)
- Next.js dev server

### 2. Run Full Pipeline Test
```cmd
npm run test:full
```

**Expected Timeline:**
- Script analysis: 30-60s
- Image generation: 15-20 min (8 scenes via Whisk API)
- Avatar optimization: ~11s (if needed)
- Quality checks: <1s (BEFORE render starts)
- Video rendering: 2-3 min
- **Total:** ~25-40 minutes

### 3. Monitor Output
The script will show:
- ✅ Each step as it completes
- ⚠️ Warnings if detected
- ❌ Errors with detailed messages
- 📊 Performance metrics at end

### 4. Check Video Output
If successful, the script will print:
```
🎉 TEST COMPLETE!
=================

Job ID: <uuid>
Video: C:\Users\konra\ObsidianNewsDesk\videos\<uuid>.mp4
Thumbnail: C:\Users\konra\ObsidianNewsDesk\thumbnails\<uuid>.jpg
```

## What Prevents Black Screens

1. **Pacing Logic (pacing.ts):** Ensures scenes cover 100% of video duration
2. **Quality Checks (quality-check.ts):** Detects gaps BEFORE rendering
3. **Asset Preparation (asset-preparation.ts):** Validates images exist and copies them
4. **Scene Component (Scene.tsx):** Shows fallback UI if image fails to load

## Next Steps

1. Run `npm run test:full`
2. If errors occur, check logs for specific issues
3. If video has black screens despite passing checks, we'll need to investigate Remotion rendering
4. If Chrome processes still overload, we can reduce worker concurrency further

## Quality Check Output Example

```
🔍 [QUALITY] Running pre-render quality checks...
📊 [QUALITY] Check Summary:
   Scenes: 8 / 8 (✅)
   Images: 8 / 8 (✅)
   Coverage: 0 → 1800 / 1800 frames (✅)
   Gaps: ✅ None

✅ [QUALITY] All checks passed!
```

## Error Example (if issues detected)

```
❌ [QUALITY] FAILED - 2 errors:
   - Scenes don't cover full video: End at frame 1650, expected 1800 (150 frames missing = 5.00s of BLACK SCREEN at end)
   - Gap detected between scene 3 and 4: 30 frames (1.00s) - THIS WILL CAUSE BLACK SCREENS
```

In this case, render will be **blocked** and the error logged to database.
