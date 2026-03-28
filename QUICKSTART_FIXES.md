# Quick Start: Fixing Obsidian News Desk Issues

**Last Updated:** March 28, 2026

## TL;DR - Just Fix Everything

If you just want the app working right now:

```cmd
cd obsidian-news-desk
FIX_ALL.bat
```

This will automatically:
- ✅ Add missing database columns
- ✅ Fix authentication (no more 401 errors)
- ✅ Allow Google Fonts (no more CSP violations)
- ✅ Fix Docker healthcheck
- ✅ Clean up stale processes on startup
- ✅ Restart all services

Then open: **http://localhost:8347**

---

## What Was Wrong?

During initial setup on a fresh laptop, these issues were discovered:

### 🔴 Critical (Blocking)
1. **401 Unauthorized on all API calls** - Middleware required Bearer tokens even for browser requests
2. **Missing database columns** - `render_logs`, `completed_at`, scene tracking columns
3. **Image generation failures** - Missing `reference_images` column

### 🟡 Medium (Annoying)
4. **Google Fonts blocked** - CSP policy too strict
5. **Stale worker processes** - Port conflicts from old sessions
6. **Docker log spam** - Healthcheck using wrong database name

### 🟢 Low (Quality of Life)
7. **No render progress** - Couldn't see frame count during rendering
8. **Failed job recovery** - Jobs stuck in failed state after schema fixes

---

## What Got Fixed?

### Database Schema Fixes
- ✅ Added `completed_at` timestamp to `news_jobs`
- ✅ Added `render_logs` JSONB to `news_jobs` (for progress tracking)
- ✅ Added `job_metadata` JSONB to `news_jobs`
- ✅ Added scene tracking columns:
  - `sentence_text` - Links scene to specific narration
  - `narrative_position` - Story arc position (hook/body/conclusion)
  - `shot_type` - Camera framing
  - `visual_continuity_notes` - Notes for consistency
  - `reference_images` - Whisk API reference URLs
  - `generation_params` - Generation settings
  - `whisk_request_id` - API tracking ID

### Code Fixes
- ✅ **Middleware** (`src/middleware.ts`) - Allow same-origin browser requests without Bearer token
- ✅ **Security Headers** (`src/lib/security/headers.ts`) - Allow Google Fonts in CSP
- ✅ **Docker** (`docker-compose.yml`) - Fixed PostgreSQL healthcheck database name
- ✅ **Startup** (`START.bat`) - Kill stale Node processes before starting

### Recovery Fixes
- ✅ Reset jobs that failed due to missing columns
- ✅ Reset scenes stuck in failed state

---

## Manual Steps (If Needed)

If `FIX_ALL.bat` doesn't work for some reason, apply fixes individually:

### Option A: Individual Scripts

```cmd
cd obsidian-news-desk

# 1. Database only
scripts\apply-critical-fixes.bat

# 2. Code only
node scripts\patch-code-fixes.js

# 3. Restart
STOP.bat
START.bat
```

### Option B: Fully Manual (See Details)

For complete manual instructions, see:
- **FIXES_IMPLEMENTATION_PLAN.md** - Detailed implementation guide
- **CLAUDE.md** - Project documentation

---

## Verification Checklist

After running fixes, verify:

### ✅ Web UI
- [ ] Navigate to http://localhost:8347
- [ ] No "Unauthorized" errors in browser console
- [ ] No "Failed to fetch jobs" errors
- [ ] No CSP violations for Google Fonts
- [ ] Jobs table loads with data (or empty if no jobs yet)

### ✅ New Broadcast
- [ ] Click "New Broadcast"
- [ ] Can select AI provider (OpenAI/Google/etc.)
- [ ] Can paste script and submit
- [ ] Job appears in table with status "analyzing"
- [ ] After ~30s, status changes to "generating_images"
- [ ] After ~15-20 min, status changes to "review_assets"

### ✅ Image Generation
- [ ] All scenes show generated images (or pending/generating status)
- [ ] No column errors in Docker logs
- [ ] Check: `docker logs obsidian-postgres --tail 50`
- [ ] Should see no "column does not exist" errors

### ✅ Rendering
- [ ] Upload avatar MP4
- [ ] Click "Compile & Render"
- [ ] Status changes to "rendering"
- [ ] Progress indicator shows:
  - Current frame / Total frames
  - Percentage complete
  - Estimated time remaining
- [ ] After ~2-3 minutes, status changes to "completed"
- [ ] Final video downloads successfully

### ✅ Docker Logs
- [ ] Check: `docker logs obsidian-postgres --tail 20`
- [ ] No "FATAL: database 'obsidian' does not exist" errors
- [ ] Healthcheck should use `obsidian_news` database

---

## Troubleshooting

### Still getting 401 errors?
- Check that `src/middleware.ts` has the `isBrowserRequest` logic
- Run: `node scripts\patch-code-fixes.js` again
- Restart: `STOP.bat && START.bat`

### Still missing columns?
- Run: `scripts\apply-critical-fixes.bat` again
- Check: `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "\d news_jobs"`
- Should see `render_logs`, `job_metadata`, `completed_at`

### Port 8347 already in use?
- Kill all Node: `taskkill /F /IM node.exe /T`
- Check Docker: `docker compose down && docker compose up -d`
- Restart: `START.bat`

### Image generation still failing?
- Check Whisk token in `.env`: `WHISK_API_TOKEN=ya29.XXX`
- Token expires hourly — see CLAUDE.md for refresh process
- Run: `docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "\d news_scenes"`
- Should see `reference_images` column

### Workers not processing jobs?
- Check workers are running: `docker exec obsidian-redis redis-cli -a obsidian_redis_password ping`
- Should return: `PONG`
- Check queue: `docker exec obsidian-redis redis-cli -a obsidian_redis_password KEYS '*'`
- Restart workers: Kill node processes, then run `START.bat`

---

## What's Next?

After fixes are applied and verified:

1. **Generate API Keys** (if not already done):
   - OpenAI: https://platform.openai.com/api-keys
   - Whisk: See CLAUDE.md token refresh process
   - Update `.env` with keys

2. **First Production Run**:
   - Submit a short test script (30-60 seconds of content)
   - Wait through full pipeline (~25-40 minutes)
   - Verify final video quality

3. **Production Workflow**:
   - See CLAUDE.md "Daily Workflow" section
   - Use storyboard editor for QA
   - Optimize avatars if >10MB

---

## Files Created by This Fix

- ✅ `FIXES_IMPLEMENTATION_PLAN.md` - Detailed fix documentation
- ✅ `FIX_ALL.bat` - One-click fix script (RECOMMENDED)
- ✅ `scripts/apply-critical-fixes.bat` - Database-only fixes
- ✅ `scripts/patch-code-fixes.js` - Code-only patches
- ✅ `QUICKSTART_FIXES.md` - This file

---

## Support

If issues persist after applying all fixes:

1. Check existing documentation:
   - `CLAUDE.md` - Full project documentation
   - `FIXES_IMPLEMENTATION_PLAN.md` - Detailed fix explanations

2. Check Docker logs:
   ```cmd
   docker logs obsidian-postgres --tail 100
   docker logs obsidian-redis --tail 100
   ```

3. Check database state:
   ```cmd
   docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "\d news_jobs"
   docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "\d news_scenes"
   ```

4. Nuclear option (full reset):
   ```cmd
   STOP.bat
   docker compose down -v
   docker compose up -d
   npm run init-db
   npm run migrate
   START.bat
   ```
   ⚠️ **WARNING:** This deletes all jobs and videos!
