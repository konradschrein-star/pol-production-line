# Smoke Test Checklist

**Duration:** 15 minutes
**Purpose:** Verify core workflows functional before release
**When to Run:** Before each deployment, after major changes, daily QA

---

## Prerequisites

- [ ] Docker Desktop running (check system tray for whale icon)
- [ ] System started via `START.bat` (3 command windows open)
- [ ] Browser open to http://localhost:8347
- [ ] Valid API keys in `.env` file
- [ ] At least 5GB disk space available

---

## Test 1: System Startup & Health (2 minutes)

**Objective:** Verify all services are running and communicating.

### Steps:

1. **Check Docker Containers**
   - [ ] Open terminal: `docker ps`
   - [ ] Verify `obsidian_postgres` running (port 5432)
   - [ ] Verify `obsidian_redis` running (port 6379)

2. **Check Dashboard**
   - [ ] Navigate to http://localhost:8347
   - [ ] Dashboard loads within 3 seconds
   - [ ] No error messages visible
   - [ ] System status indicator shows "ONLINE" (top-right corner)
   - [ ] Metrics display correctly (0 jobs is OK)

3. **Check Workers**
   - [ ] Worker console window shows "Worker started" messages
   - [ ] No red error text in console
   - [ ] All 4 workers active: analyze, images, avatar, render

### Expected Result:
✅ All services running, dashboard accessible, no errors

---

## Test 2: Create Broadcast - Fast Path (5 minutes)

**Objective:** Create a broadcast and verify analysis completes.

### Steps:

1. **Navigate to New Broadcast**
   - [ ] Click "NEW BROADCAST" button (or press `N`)
   - [ ] Form loads without errors
   - [ ] Text area visible and functional

2. **Submit Script**
   - [ ] Paste test script (use example below)
   - [ ] Select AI provider: **Google** (fastest for testing)
   - [ ] Click "CREATE BROADCAST"
   - [ ] Redirects to `/jobs/[uuid]` page

**Test Script (copy this):**
```
Breaking news from City Hall as Mayor announces infrastructure plan.
The ambitious $500 million project will revitalize downtown streets
over the next two years. Construction begins next month on Main Street.
Local businesses express concerns about traffic disruptions but welcome
long-term improvements. City officials promise minimal delays.
```

3. **Verify Analysis Phase**
   - [ ] Status badge shows "ANALYZING" with spinner
   - [ ] Page does NOT show errors
   - [ ] Avatar script section visible (empty initially)
   - [ ] Scene grid section visible (empty initially)

4. **Wait for Analysis Completion**
   - [ ] Wait 30-60 seconds (do NOT refresh)
   - [ ] Avatar script appears in text area
   - [ ] 6-8 scene cards appear in grid
   - [ ] Each scene card has:
     - Scene number (1, 2, 3...)
     - Image prompt text
     - Ticker headline
     - "Generating..." spinner (or completed image if fast)
   - [ ] Status changes to "GENERATING_IMAGES"

5. **Note Job ID**
   - [ ] Copy job ID from URL: `/jobs/[THIS-IS-THE-JOB-ID]`
   - [ ] Save for next test: `_________________`

### Expected Result:
✅ Job created, analysis completes in <60s, scenes appear, status advances

---

## Test 3: UI Navigation & Keyboard Shortcuts (3 minutes)

**Objective:** Verify UI responsiveness and hotkeys work.

### Steps:

1. **Broadcasts List Navigation**
   - [ ] Navigate to /broadcasts
   - [ ] Press `J` (down arrow equivalent)
   - [ ] Row highlights with blue ring
   - [ ] Press `K` (up arrow)
   - [ ] Row highlights move up
   - [ ] Press `Enter` on highlighted job
   - [ ] Opens storyboard editor for that job

2. **Storyboard Editor Navigation** (use job from Test 2)
   - [ ] Navigate to job from Test 2 (paste job ID in URL)
   - [ ] Press `→` (right arrow)
   - [ ] Scene 2 highlights with blue ring
   - [ ] Press `←` (left arrow)
   - [ ] Scene 1 highlights
   - [ ] Press `3` (number key)
   - [ ] Scene 3 highlights immediately
   - [ ] Selected scene auto-scrolls into view

3. **Help Modal**
   - [ ] Press `?` key
   - [ ] Keyboard shortcuts modal appears
   - [ ] Modal shows all available shortcuts
   - [ ] Press `Esc` to close
   - [ ] Modal disappears

4. **Page Navigation (Global)**
   - [ ] Press `D` (go to dashboard)
   - [ ] Dashboard loads
   - [ ] Press `B` (go to broadcasts)
   - [ ] Broadcasts list loads
   - [ ] Press `N` (new broadcast)
   - [ ] New broadcast form loads

### Expected Result:
✅ All navigation hotkeys work, help modal displays, no lag or errors

---

## Test 4: Settings Persistence (2 minutes)

**Objective:** Verify settings save and persist across refreshes.

### Steps:

1. **Navigate to Settings**
   - [ ] Click "Settings" in sidebar (or press `S`)
   - [ ] Settings page loads
   - [ ] All current values display correctly

2. **Change a Setting**
   - [ ] Find "AI Provider" dropdown
   - [ ] Change to different provider (e.g., Claude if currently Google)
   - [ ] Click "SAVE SETTINGS" button
   - [ ] Success toast/message appears
   - [ ] Page does NOT reload automatically

3. **Verify Persistence**
   - [ ] Refresh page (F5)
   - [ ] Settings page reloads
   - [ ] AI Provider still shows changed value
   - [ ] Navigate away to /broadcasts
   - [ ] Navigate back to /settings
   - [ ] Setting still persists

4. **Revert Setting** (cleanup)
   - [ ] Change AI Provider back to original value
   - [ ] Click "SAVE SETTINGS"
   - [ ] Success confirmation

### Expected Result:
✅ Settings save correctly, persist across refreshes and navigation

---

## Test 5: Error Handling (3 minutes)

**Objective:** Verify graceful error handling and validation.

### Steps:

1. **Form Validation - Too Short**
   - [ ] Navigate to /broadcasts/new
   - [ ] Enter only 50 characters in script field
   - [ ] Click "CREATE BROADCAST"
   - [ ] Error message appears: "Script must be at least 100 characters"
   - [ ] Form does NOT submit
   - [ ] Script text area highlights (red border or similar)

2. **Form Validation - Clear Error**
   - [ ] Add more text (100+ characters total)
   - [ ] Error message disappears automatically
   - [ ] Submit button becomes enabled
   - [ ] Red border/highlight clears

3. **API Error Handling** (optional - only if you can trigger)
   - [ ] Stop Redis: `docker stop obsidian_redis`
   - [ ] Try to create a broadcast
   - [ ] User-friendly error appears (not technical stack trace)
   - [ ] Restart Redis: `docker start obsidian_redis`
   - [ ] Create broadcast works again

4. **Empty State Handling**
   - [ ] Navigate to /broadcasts
   - [ ] If no jobs exist:
     - [ ] Empty state message displays
     - [ ] Message suggests creating first broadcast
     - [ ] "NEW BROADCAST" button visible
   - [ ] If jobs exist:
     - [ ] Table displays correctly
     - [ ] All columns populated

### Expected Result:
✅ Validation errors are clear and actionable, system handles edge cases gracefully

---

## Summary

**Tests Passed:** ___ / 5

**Critical Issues Found:**
-

**Minor Issues Found:**
-

**Smoke Test Result:** ✅ PASS / ❌ FAIL

**Notes:**
- If smoke test passes → System ready for full deployment
- If smoke test fails → Investigate issues before proceeding
- Critical issues block release; minor issues can be tracked

---

## Quick Reference: What to Look For

### ✅ Good Signs
- Pages load in <3 seconds
- No JavaScript console errors (F12 → Console tab)
- Status transitions happen automatically (analyzing → generating_images)
- Worker console shows progress messages (not errors)
- Keyboard shortcuts respond immediately
- Forms validate before submission

### ❌ Red Flags
- "System Offline" indicator
- White screen / blank page
- Console errors mentioning "undefined" or "null"
- Worker console shows red error text
- Page hangs or never updates
- Keyboard shortcuts don't work
- Settings don't persist

---

## Cleanup After Test

**If test passed:**
- [ ] Leave system running (optional)
- [ ] Delete test job from broadcasts page (optional)

**If test failed:**
- [ ] Copy error messages from browser console (F12)
- [ ] Copy error messages from worker console
- [ ] Note which test step failed
- [ ] Run `STOP.bat` to shut down cleanly
- [ ] Review logs before restarting

---

**Tested By:** _______________
**Date:** _______________
**Version/Commit:** _______________
**Environment:** ☐ Development ☐ Staging ☐ Production

**Next Steps:**
- [ ] If passed: Proceed with full test suite or deployment
- [ ] If failed: Document issues and fix before re-testing
- [ ] Update this checklist if new smoke test items needed
