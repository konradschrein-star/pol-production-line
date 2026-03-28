# Obsidian News Desk - Critical Fixes Implementation Plan

**Created:** March 28, 2026
**Status:** Ready for implementation
**Priority:** HIGH - Blocks production use

## Overview

This document outlines all critical fixes discovered during initial setup on a fresh laptop installation. These fixes address authentication, database schema, CSP policies, and rendering progress visibility.

---

## Category 1: Authentication & Security (BLOCKING)

### Fix 1.1: Allow Same-Origin Browser Requests
**File:** `src/middleware.ts`
**Line:** ~280
**Problem:** All browser requests to API routes return 401 Unauthorized because middleware requires Bearer token authentication for ALL non-public endpoints.

**Impact:** UI cannot fetch jobs, style presets, or submit new broadcasts.

**Solution:** Add same-origin request detection before authentication check.

```typescript
// BEFORE (line 280):
if (!isPublicEndpoint) {
  const isAuthenticated = verifyAuthentication(req);
  // ...
}

// AFTER:
// Allow same-origin browser requests (no Bearer token needed from the UI)
const referer = req.headers.get('referer') || '';
const origin = req.headers.get('origin') || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
const isBrowserRequest =
  referer.startsWith(appUrl) ||
  origin.startsWith(appUrl) ||
  req.headers.get('sec-fetch-site') === 'same-origin' ||
  req.headers.get('sec-fetch-mode') === 'navigate';

if (!isPublicEndpoint && !isBrowserRequest) {
  const isAuthenticated = verifyAuthentication(req);
  // ...
}
```

**Test:** After fix, navigate to http://localhost:8347 — jobs table should load without 401 errors.

---

### Fix 1.2: Allow Google Fonts in CSP
**File:** `src/lib/security/headers.ts`
**Lines:** 23, 27
**Problem:** Content Security Policy blocks Google Fonts stylesheets and font files.

**Impact:** Browser console errors, potential UI font fallback issues.

**Solution:** Add Google Fonts domains to CSP.

```typescript
// Line 23 - BEFORE:
"style-src 'self' 'unsafe-inline'", // TailwindCSS inline styles

// Line 23 - AFTER:
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // TailwindCSS + Google Fonts

// ADD NEW LINE after line 26:
"font-src 'self' https://fonts.gstatic.com", // Google Fonts files
```

**Test:** Check browser console — no CSP violations for `fonts.googleapis.com` or `fonts.gstatic.com`.

---

## Category 2: Database Schema Fixes (BLOCKING)

### Fix 2.1: Add Missing `completed_at` Column
**Table:** `news_jobs`
**Problem:** Code references `completed_at` timestamp but column doesn't exist.

**Impact:** Jobs may fail to track completion time properly.

**SQL Migration:**
```sql
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_news_jobs_completed
ON news_jobs(completed_at)
WHERE completed_at IS NOT NULL;
```

**Test Query:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'news_jobs' AND column_name = 'completed_at';
```

---

### Fix 2.2: Docker Healthcheck Using Wrong Database
**File:** `docker-compose.yml`
**Line:** 17
**Problem:** Healthcheck uses `pg_isready -U obsidian` which defaults to database named "obsidian", but actual database is "obsidian_news". Causes harmless but noisy FATAL errors in logs.

**Impact:** Log pollution, no functional impact (healthcheck still passes).

**Solution:**
```yaml
# BEFORE (line 17):
test: ["CMD-SHELL", "pg_isready -U obsidian"]

# AFTER:
test: ["CMD-SHELL", "pg_isready -U obsidian -d obsidian_news"]
```

**Test:** Check Docker logs after restart — no more `FATAL: database "obsidian" does not exist` errors.

---

## Category 3: Rendering & Progress Visibility (USER EXPERIENCE)

### Fix 3.1: Verify `render_logs` Column Exists
**Table:** `news_jobs`
**Problem:** In previous session, this column was missing, causing render worker to crash immediately.

**Current Status:** Column was added in previous session (confirmed by database query).

**Validation Query:**
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'news_jobs' AND column_name = 'render_logs';
-- Expected: render_logs | jsonb
```

**No Action Needed:** Already fixed in previous session.

---

### Fix 3.2: Scene Generation Missing Columns
**Table:** `news_scenes`
**Problem:** Code expects columns that may not exist in fresh schema.

**Columns to Validate:**
- `sentence_text` (TEXT) - Associates scene with specific narration sentence
- `narrative_position` (VARCHAR(50)) - Position in story arc (hook/body/conclusion)
- `shot_type` (VARCHAR(50)) - Camera angle/framing type
- `visual_continuity_notes` (TEXT) - Notes for visual consistency
- `reference_images` (JSONB) - Whisk API reference image URLs
- `generation_params` (JSONB) - Parameters used for generation
- `whisk_request_id` (VARCHAR(255)) - Whisk API request tracking ID

**Current Status:** All columns exist (confirmed by database query).

**Validation Query:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'news_scenes'
AND column_name IN (
  'sentence_text', 'narrative_position', 'shot_type',
  'visual_continuity_notes', 'reference_images',
  'generation_params', 'whisk_request_id'
);
-- Expected: 7 rows
```

**No Action Needed:** Already fixed in previous session.

---

## Category 4: Worker Process Management (OPERATIONAL)

### Fix 4.1: Kill Stale Worker Processes on Startup
**Problem:** Old Node.js worker processes from previous sessions may hold port 8347 or queue connections, causing conflicts.

**Solution:** Add cleanup step to START.bat script.

**PowerShell Command:**
```powershell
# Kill all node processes older than current boot session
Get-Process -Name node -ErrorAction SilentlyContinue |
  Where-Object { $_.StartTime -lt (Get-Date).Date } |
  Stop-Process -Force
```

**Alternative (simpler):** Kill all node processes before starting:
```cmd
taskkill /F /IM node.exe /T 2>nul
```

**Add to START.bat** (line 3, before Docker start):
```batch
@echo off
echo Cleaning up old Node processes...
taskkill /F /IM node.exe /T 2>nul
echo.
echo Starting Obsidian News Desk...
docker compose up -d
...
```

---

### Fix 4.2: Ensure Workers Reload Environment Variables
**Problem:** Workers started before `.env` updates don't pick up new API keys (e.g., WHISK_API_TOKEN).

**Solution:** Workers already read from `process.env` which is loaded at startup via `dotenv`. Killing and restarting workers (via Fix 4.1) ensures fresh env loading.

**No Code Change Needed:** Just operational practice — restart workers after updating `.env`.

---

## Category 5: Error Recovery & Job State Management

### Fix 5.1: Reset Failed Jobs After Schema Fixes
**Problem:** Jobs that failed due to missing columns (like `render_logs`) stay in failed state even after columns are added.

**Solution:** After applying database migrations, reset affected jobs.

**SQL Commands:**
```sql
-- Reset jobs that failed due to missing render_logs
UPDATE news_jobs
SET status = 'review_assets',
    error_message = NULL,
    render_logs = '[]'::jsonb
WHERE status = 'failed'
  AND error_message LIKE '%render_logs%';

-- Reset scenes that failed due to missing reference_images
UPDATE news_scenes
SET generation_status = 'pending',
    error_message = NULL,
    retry_count = 0,
    reference_images = NULL
WHERE generation_status = 'failed'
  AND error_message LIKE '%reference_images%';
```

---

## Category 6: Asset Flow & Storage Paths

### Fix 6.1: Verify Asset Preparation Module
**File:** `src/lib/remotion/asset-preparation.ts`
**Problem:** Black screen issues in renders were caused by Remotion not finding image files.

**Root Cause:** Images stored in `C:\Users\konra\ObsidianNewsDesk\images\` but Remotion's `staticFile()` looks in `public/images/`.

**Current Status:** Asset preparation module added March 23 (confirmed in MEMORY.md).

**Validation:** Check that module exists and is called in render worker.

```typescript
// Expected in render.worker.ts:
import { prepareAssetsForRender, validateAssetAvailability } from '@/lib/remotion/asset-preparation';

// Before rendering:
await prepareAssetsForRender(job.id);
const validation = await validateAssetAvailability(job.id);
if (!validation.isValid) {
  throw new Error(`Asset validation failed: ${validation.errors.join(', ')}`);
}
```

**No Action Needed:** Already implemented in previous session.

---

## Implementation Checklist

### Phase 1: Database Fixes (5 minutes)
- [ ] Run migration for `completed_at` column (Fix 2.1)
- [ ] Update Docker healthcheck (Fix 2.2)
- [ ] Validate all scene columns exist (Fix 3.2 validation only)
- [ ] Reset any failed jobs from missing columns (Fix 5.1)
- [ ] Restart Docker containers to apply healthcheck fix

### Phase 2: Code Fixes (10 minutes)
- [ ] Update middleware for same-origin requests (Fix 1.1)
- [ ] Update CSP headers for Google Fonts (Fix 1.2)
- [ ] Update START.bat to kill stale processes (Fix 4.1)
- [ ] Verify asset-preparation.ts exists and is integrated (Fix 6.1 validation only)

### Phase 3: Testing (10 minutes)
- [ ] Restart all services via START.bat
- [ ] Navigate to http://localhost:8347 — verify no 401 errors
- [ ] Check browser console — verify no CSP violations
- [ ] Check Docker logs — verify no "database obsidian does not exist" errors
- [ ] Submit test broadcast → verify job progresses to `generating_images`
- [ ] Wait for image generation → verify scenes generate without column errors
- [ ] Upload avatar → compile → verify render progress displays in UI
- [ ] Check final video file in `C:\Users\konra\ObsidianNewsDesk\videos\`

### Phase 4: Documentation (5 minutes)
- [ ] Update MEMORY.md with final status
- [ ] Mark this plan as COMPLETED
- [ ] Note any additional issues discovered during testing

---

## Rollback Plan

If fixes cause issues, rollback in reverse order:

1. **Revert code changes:** `git checkout src/middleware.ts src/lib/security/headers.ts docker-compose.yml START.bat`
2. **Revert database:** No need (all migrations use `IF NOT EXISTS` — safe)
3. **Restart services:** `STOP.bat && START.bat`

---

## Expected Outcome

After all fixes applied:
- ✅ UI loads without authentication errors
- ✅ Google Fonts load without CSP violations
- ✅ Jobs can be created and progress through all states
- ✅ Image generation completes successfully
- ✅ Rendering shows live progress (frame count, percentage)
- ✅ Final video renders without black screen issues
- ✅ Docker logs are clean (no spurious errors)
- ✅ Workers restart cleanly without port conflicts

**Total Implementation Time:** ~30 minutes
**Risk Level:** LOW (all changes are additive or permissive)
