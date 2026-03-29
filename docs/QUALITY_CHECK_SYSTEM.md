# Quality Check System Enhancement - Implementation Guide

**Date:** March 29, 2026
**Status:** ✅ Phases 1-4 Complete (Phase 5 Optional)

## Overview

The Quality Check System Enhancement adds comprehensive error visibility and manual intervention capabilities to the Obsidian News Desk. While the backend already had robust error handling, users previously couldn't see errors or intervene when automation failed. This implementation bridges that gap.

---

## What Was Implemented

### ✅ Phase 1: Enhanced Scene-Level Error Display (MVP)

**Problem Solved:** Users saw "Generation Failed" with no explanation or recovery options.

**Components Added:**
- **Database Migration** (`007_add_scene_error_tracking.sql`)
  - New columns: `error_category`, `sanitization_attempts`, `last_error_code`
  - Index on `error_category` for performance

- **Error Categorization** (`src/lib/errors/categorization.ts`)
  - Maps errors to 6 categories: `policy_violation`, `timeout`, `api_error`, `rate_limit`, `auth_error`, `unknown`
  - Provides user-friendly messages and actionable solutions

- **SceneErrorPanel Component** (`src/components/broadcast/SceneErrorPanel.tsx`)
  - Expandable error panel in SceneCard
  - Shows error category, sanitization attempts, generation history
  - Provides "Edit & Retry", "Upload Image", "View History" actions

- **API Endpoint** (`/api/jobs/:id/scenes/:scene_id/errors`)
  - Returns detailed error information and generation history

**Worker Updates:**
- `images.worker.ts` now categorizes errors and updates database with:
  - Error category (for color-coded badges)
  - Sanitization attempt counter (tracks AI retry count)
  - Last error code (for detailed debugging)

### ✅ Phase 2: Manual Intervention Prompts

**Problem Solved:** After 3 failed sanitization attempts, scenes were dead-ended with no recovery path.

**Components Added:**
- **PromptInterventionModal** (`src/components/broadcast/PromptInterventionModal.tsx`)
  - Auto-shows when scenes reach max sanitization attempts
  - Step-by-step wizard for editing problematic prompts
  - Shows all attempted prompts with explanations
  - Three action paths: "Edit & Retry", "Upload Image", "Skip Scene"

- **WhiskTokenRefreshWizard** (`src/components/system/WhiskTokenRefreshWizard.tsx`)
  - Step-by-step guide with screenshots
  - Token validation before saving
  - Updates `.env` file automatically

- **API Endpoints:**
  - `POST /api/jobs/:id/scenes/:scene_id/edit-and-retry` - Manual prompt edit + reset attempts
  - `POST /api/system/test-whisk-token` - Validates token before saving
  - `POST /api/system/update-whisk-token` - Updates `.env` with new token

### ✅ Phase 3: Error Recovery UI

**Problem Solved:** Users had to cancel entire jobs to retry single failed scenes.

**Components Added:**
- **Enhanced SceneCard Retry Buttons**
  - Failed scenes show "Retry" (primary) and "Edit & Retry" (secondary) buttons
  - Regular scenes keep standard "Regenerate" button

- **BulkRetryPanel** (`src/components/broadcast/BulkRetryPanel.tsx`)
  - Shows when 2+ scenes fail
  - One-click retry for all failed scenes
  - Option to reset prompts (undo sanitization)
  - Progress indicator during retry
  - Shows error breakdown by category

- **API Endpoint:**
  - `POST /api/jobs/:id/scenes/bulk-retry` - Retries multiple scenes at once

### ✅ Phase 4: Proactive Health Dashboard

**Problem Solved:** Users didn't know about token expiration or rate limits until errors occurred.

**Components Added:**
- **SystemHealthWidget** (`src/components/system/SystemHealthWidget.tsx`)
  - Persistent widget in top-right corner (collapsible)
  - Polls `/api/system/health` every 30 seconds
  - Shows:
    - Whisk token age/expiration
    - Rate limit usage (requests/hour)
    - Error rate (last 24 hours)
    - Disk space usage
    - Service status (Postgres, Redis, Workers)
  - Browser notifications for critical issues
  - One-click token refresh

- **API Endpoint:**
  - `GET /api/system/health` - Returns comprehensive health metrics

### ⏳ Phase 5: Enhanced Notifications (Optional)

**Status:** Not implemented (optional enhancement)

**What It Would Add:**
- Persistent error toasts (don't auto-dismiss)
- Action buttons in toasts ("Fix Now", "View Details")
- Browser notifications for background events

---

## File Structure

```
obsidian-news-desk/
├── src/
│   ├── lib/
│   │   ├── errors/
│   │   │   └── categorization.ts          # NEW: Error categorization logic
│   │   ├── queue/workers/
│   │   │   └── images.worker.ts           # MODIFIED: Error tracking
│   │   └── db/migrations/
│   │       └── 007_add_scene_error_tracking.sql  # NEW: Database migration
│   │
│   ├── components/
│   │   ├── broadcast/
│   │   │   ├── SceneCard.tsx              # MODIFIED: Integrated SceneErrorPanel
│   │   │   ├── SceneErrorPanel.tsx        # NEW: Error display panel
│   │   │   ├── PromptInterventionModal.tsx  # NEW: Manual intervention wizard
│   │   │   └── BulkRetryPanel.tsx         # NEW: Bulk retry panel
│   │   └── system/
│   │       ├── SystemHealthWidget.tsx     # NEW: Health dashboard
│   │       └── WhiskTokenRefreshWizard.tsx  # NEW: Token refresh wizard
│   │
│   └── app/api/
│       ├── jobs/[id]/scenes/
│       │   ├── [scene_id]/
│       │   │   ├── errors/route.ts        # NEW: Error details endpoint
│       │   │   └── edit-and-retry/route.ts  # NEW: Manual retry endpoint
│       │   └── bulk-retry/route.ts        # NEW: Bulk retry endpoint
│       └── system/
│           ├── health/route.ts            # NEW: Health metrics endpoint
│           ├── test-whisk-token/route.ts  # NEW: Token validation endpoint
│           └── update-whisk-token/route.ts  # NEW: Token update endpoint
│
└── docs/
    └── QUALITY_CHECK_SYSTEM.md            # This file
```

---

## Database Changes

### New Columns in `news_scenes`

```sql
-- Error categorization
error_category VARCHAR(50)          -- 'policy_violation', 'timeout', 'api_error', etc.

-- Sanitization tracking
sanitization_attempts INTEGER DEFAULT 0  -- Counter for AI retry attempts (max 3)

-- Error code mapping
last_error_code VARCHAR(50)         -- Maps to ErrorCode enum
```

### Migration Applied

```bash
# Already executed on March 29, 2026
# Updated 111 existing failed scenes with error_category = 'unknown'
```

---

## How to Use

### For Users (Video Production Workflow)

#### 1. **Scene-Level Error Inspection**

When a scene fails:
1. Open the storyboard editor (`/jobs/:id`)
2. Look for the red "Generation Failed" badge on the scene
3. Click to expand the **SceneErrorPanel**
4. Review:
   - Error category (Policy Violation, Timeout, etc.)
   - Sanitization attempts (X of 3)
   - Actionable suggestions ("What can I do?")
5. Choose action:
   - **Edit & Retry:** Opens prompt editor
   - **Upload Image:** Opens file picker
   - **View History:** Shows all generation attempts

#### 2. **Manual Prompt Intervention**

When max sanitization attempts reached (3/3):
1. **PromptInterventionModal** automatically appears
2. Review original prompt + all sanitized versions
3. Edit the prompt manually:
   - Remove political names (e.g., "Donald Trump" → "government official")
   - Remove controversial terms
   - Use generic descriptions
4. Click "Try Again with Manual Edit"
5. Scene resets to pending and re-queues

**Example Fix:**
```
❌ Original: "Donald Trump giving speech at rally with American flag"
✅ Edited:   "Political leader giving speech at outdoor event with flag"
```

#### 3. **Bulk Retry Failed Scenes**

When multiple scenes fail:
1. **BulkRetryPanel** appears above storyboard
2. Shows error breakdown (e.g., "3 policy violations, 2 timeouts")
3. Optional: Check "Reset prompts to original" (undoes sanitization)
4. Click "Retry All X Failed Scenes"
5. Progress bar shows retry status
6. Page refreshes when complete

**Estimated Time:** ~2-3 minutes per scene

#### 4. **System Health Monitoring**

Top-right corner widget shows:
- **🟢 Green:** All systems operational
- **🟡 Yellow:** Warning (token expires soon, rate limit approaching)
- **🔴 Red:** Critical (token expired, service down)

Click to expand for details:
- **Whisk Token:** Shows minutes until expiration
- **Rate Limit:** Shows % of hourly quota used
- **Error Rate:** Shows % of scenes failed (24h)
- **Services:** Postgres, Redis, Workers status

**When Token Expires:**
1. Widget shows 🔴 "Critical"
2. Click "Refresh Token"
3. **WhiskTokenRefreshWizard** opens
4. Follow 5-step guide to get new token
5. Paste + Test + Save

### For Developers

#### Error Categorization

```typescript
import { categorizeError, getErrorDetails } from '@/lib/errors/categorization';

const error = new Error('Content policy violation');
const category = categorizeError(error);  // Returns 'policy_violation'

const details = getErrorDetails(category, 3);
console.log(details.userMessage);  // User-friendly message
console.log(details.solution);     // Actionable next steps
console.log(details.canRetry);     // false (max attempts reached)
```

#### API Usage

**Get Error Details:**
```typescript
const response = await fetch(`/api/jobs/${jobId}/scenes/${sceneId}/errors`);
const data = await response.json();

// Returns:
// {
//   current_error: { message, code, category, solution },
//   sanitization_attempts: 3,
//   generation_history: [ {...}, {...} ],
//   can_retry: false
// }
```

**Manual Retry:**
```typescript
const response = await fetch(
  `/api/jobs/${jobId}/scenes/${sceneId}/edit-and-retry`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      new_prompt: 'edited prompt text',
      reset_attempts: true,  // Reset sanitization counter
    }),
  }
);
```

**Bulk Retry:**
```typescript
const response = await fetch(`/api/jobs/${jobId}/scenes/bulk-retry`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scene_ids: ['uuid1', 'uuid2'],  // Optional: defaults to all failed
    reset_prompts: false,           // Optional: undo sanitization
  }),
});
```

---

## Testing Guide

### Manual Testing Checklist

#### ✅ Phase 1: Scene Error Display

1. **Create job with policy-violating prompt:**
   ```
   Raw script: "Today Donald Trump announced new tariffs..."
   ```

2. **Wait for 3 sanitization attempts:**
   - Worker logs show: "Content policy violation detected"
   - Worker logs show: "Rewriting prompt to be policy-compliant..."
   - After 3 attempts: "Failed after 3 sanitization attempts"

3. **Verify SceneErrorPanel:**
   - Red "Generation Failed - Policy Violation" badge
   - Click to expand
   - Shows "3 of 3 attempts used (max reached)"
   - "What can I do?" section with suggestions
   - "Edit & Retry" and "Upload Image" buttons visible

4. **Check API endpoint:**
   ```bash
   curl http://localhost:8347/api/jobs/{jobId}/scenes/{sceneId}/errors
   ```
   - Returns `generation_history` with 3 attempts
   - Returns `can_retry: false`

#### ✅ Phase 2: Manual Intervention

5. **Verify PromptInterventionModal auto-shows:**
   - Navigate to `/jobs/:id`
   - Modal should automatically appear for scene with 3 failed attempts
   - Shows original prompt + all sanitized versions
   - Edit prompt field is pre-populated

6. **Test manual edit:**
   - Remove political reference (e.g., change "Trump" to "government official")
   - Click "Try Again with Manual Edit"
   - Scene should reset to `pending`
   - Check database: `sanitization_attempts` should be `0`

7. **Test token refresh wizard:**
   - Manually expire token (comment out WHISK_API_TOKEN in `.env`)
   - Create new job
   - After auth errors, click "Refresh Token" in health widget
   - WhiskTokenRefreshWizard should open
   - Follow steps to paste new token
   - Test token validation

#### ✅ Phase 3: Bulk Retry

8. **Create job with 3+ failing scenes:**
   - Use multiple policy-violating prompts
   - Wait for all to fail

9. **Verify BulkRetryPanel:**
   - Panel should appear above storyboard
   - Shows "3 Scenes Failed"
   - Shows error breakdown badges
   - Shows estimated time (~8 minutes for 3 scenes)

10. **Test bulk retry:**
    - Click "Retry All 3 Failed Scenes"
    - Check worker logs: All 3 scenes should be re-queued
    - Job status should update to `generating_images`

11. **Test SceneCard retry buttons:**
    - Failed scene should show "Retry" and "Edit & Retry" buttons (not "Regenerate")
    - Click "Retry" → scene re-queues with same prompt
    - Click "Edit & Retry" → prompt editor opens

#### ✅ Phase 4: Health Dashboard

12. **Verify SystemHealthWidget:**
    - Widget should appear in top-right corner
    - Shows 🟢 "All Systems" when healthy
    - Click to expand

13. **Check health metrics:**
    - Whisk Token: Should show estimated age/expiration
    - Rate Limit: Should show request count (check against `generation_history` table)
    - Error Rate: Should show failed % (check against `news_scenes` table)
    - Services: All should show "connected" or "running"

14. **Test critical alerts:**
    - Simulate token expiration (comment out WHISK_API_TOKEN)
    - Widget should turn 🔴 "Critical"
    - "Refresh Token" button should appear
    - Browser notification should fire (if permissions granted)

15. **Test polling:**
    - Keep widget open for 30+ seconds
    - Should auto-refresh (check "Updated" timestamp)

---

## Performance Impact

### Database
- **3 new columns** in `news_scenes` (minimal storage overhead)
- **1 new index** on `error_category` (improves query performance)
- **No impact on existing queries** (columns are optional)

### API
- **5 new endpoints** (called on-demand, not in hot path)
- **Health endpoint polling:** Every 30 seconds (lightweight queries)

### Worker
- **Additional database writes:** 2 extra UPDATE queries per error (negligible)
- **No impact on generation speed**

---

## Migration Instructions

### For Existing Deployments

1. **Run database migration:**
   ```bash
   cd obsidian-news-desk
   cat src/lib/db/migrations/007_add_scene_error_tracking.sql | \
     docker exec -i obsidian-postgres psql -U obsidian -d obsidian_news
   ```

2. **Restart workers** (to load updated `images.worker.ts`):
   ```bash
   npm run workers:restart
   ```

3. **No restart needed for Next.js dev server** (hot reload)

4. **Verify migration:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'news_scenes'
   AND column_name IN ('error_category', 'sanitization_attempts', 'last_error_code');
   ```

### Rollback Plan

If issues occur:

```sql
-- Rollback database changes
BEGIN;
ALTER TABLE news_scenes DROP COLUMN error_category;
ALTER TABLE news_scenes DROP COLUMN sanitization_attempts;
ALTER TABLE news_scenes DROP COLUMN last_error_code;
COMMIT;
```

---

## Known Limitations

1. **Token Age Estimation:**
   - Whisk tokens expire after ~1 hour, but we can't know exact age without metadata
   - Health widget estimates based on recent auth errors
   - Inaccurate if token was just refreshed

2. **Disk Space (Windows):**
   - Node.js can't easily get filesystem stats on Windows
   - Health endpoint returns placeholder values
   - Consider platform-specific implementation or external monitoring

3. **Worker Status Detection:**
   - Heuristic based on recent job activity
   - May show "stopped" if no jobs are processing
   - Does not detect crashed workers

4. **Browser Notifications:**
   - Requires user permission (first-time prompt)
   - Won't work if browser is closed
   - Consider adding email/Slack notifications for production

---

## Future Enhancements (Phase 5+)

### Optional Improvements

1. **Enhanced Toast System:**
   - Persistent error toasts with action buttons
   - Rich content support (code snippets, formatted errors)

2. **Email/Slack Notifications:**
   - Alert on critical failures
   - Daily health digest

3. **Prompt History:**
   - Track all prompt versions
   - "Revert to previous" button

4. **Error Analytics:**
   - Dashboard showing error trends
   - Most common policy violations
   - Prompt success rates

5. **Auto-Recovery:**
   - Automatic prompt simplification after 2 failures
   - Fallback to generic templates

---

## Support

**Documentation:** See `/docs` folder for additional guides
**Issues:** Report bugs at GitHub issues (if applicable)
**Questions:** Contact development team

**Last Updated:** March 29, 2026
**Version:** 1.0.0
