# Phase 3 Testing Instructions

## 🎯 Quick Start - Browser Testing

### Step 1: Build the Wizard

```bash
cd obsidian-news-desk
npm run electron:wizard
```

**Expected Output:**
```
✓ 39 modules transformed.
wizard-styles.css   17.41 kB │ gzip:   3.84 kB
wizard-react.js    442.41 kB │ gzip: 112.08 kB
✓ built in 3-4s
```

### Step 2: Open Test Page

**File Path:**
```
C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\electron\src\installer\pages\wizard-test.html
```

**Or use this URL in your browser:**
```
file:///C:/Users/konra/OneDrive/Projekte/20260319%20Political%20content%20automation/obsidian-news-desk/electron/src/installer/pages/wizard-test.html
```

### Step 3: Run Automated Tests

**In the test panel (right side), click:**

1. ✅ **"Test All Components Render"**
   - Verifies all 7 React steps render without errors
   - Check test log for green checkmarks

2. ✅ **"Test State Synchronization"**
   - Verifies `window.wizardData` exists
   - Verifies all mounting functions available

3. ✅ **"Trigger Error (Test Boundary)"**
   - Tests error boundary displays instead of blank screen

### Step 4: Manual Navigation Test

**Click the navigation buttons:**
- Click "Next →" to go through all pages
- Click "← Back" to return
- Use "Jump to X" buttons in test panel

**Expected Behavior:**
- All 7 pages should render correctly:
  1. Welcome (static intro)
  2. Prerequisites (Docker status)
  3. Storage (disk space + validation)
  4. API Config (multi-provider keys)
  5. Database (service verification)
  6. Installation (progress bar + logs)
  7. Complete (success summary)

### Step 5: Test Validation

**Go to Page 3 (API Config):**
1. Select "OpenAI" provider
2. Enter fake key: `sk-test1234567890`
3. Click "Test Connection"
4. Should see:
   - Button changes to "⏳ Testing..."
   - After 1 second: ✓ "Valid" (mock always returns valid)

**Go to Page 2 (Storage):**
1. Should see disk space: "50.0 GB free of 100.0 GB"
2. Click "Validate" button
3. Should see: ✓ "Success: Storage path is valid"

---

## 🔍 What to Look For

### ✅ Success Indicators

**Visual:**
- [ ] All pages have rounded corners (8-12px)
- [ ] Dark theme colors (gray-800 backgrounds)
- [ ] Status colors work (green=success, red=error, blue=info)
- [ ] No broken styles (Tailwind CSS loaded)

**Functional:**
- [ ] Navigation works (Back/Next buttons)
- [ ] Progress bar updates as you navigate
- [ ] Test panel logs show IPC calls
- [ ] Error boundary works (click "Trigger Error")

**Console:**
- [ ] No red errors in browser DevTools (F12)
- [ ] React mounting functions logged
- [ ] IPC mock calls logged

### ❌ Failure Indicators

**If you see:**
- Blank pages → React components not rendering
- Broken styles → Tailwind CSS not loaded
- Console errors → TypeScript/React errors
- "window.mountX is not a function" → Bundle not loaded

---

## 🧪 Advanced Testing (Optional)

### Test Offline Support

1. **Disconnect from internet**
2. **Refresh wizard-test.html**
3. **Verify:** All styles still work (CSS is local, not CDN)

### Test Error Recovery

1. **Open browser console (F12)**
2. **Type:** `throw new Error('Manual test error')`
3. **Press Enter**
4. **Verify:** Error boundary displays (not blank screen)

### Test IPC Mock Responses

**In browser console, test IPC calls:**
```javascript
// Test disk space
await window.electronAPI.config.getDiskSpace('C:\\test')
// Should return: { free: 50GB, total: 100GB }

// Test API validation
await window.electronAPI.config.validateAPIKey('openai', 'sk-test1234567890')
// Should return: { valid: true } (mocked)

// Check all IPC handlers exist
console.log(window.electronAPI)
```

---

## 🚀 Full Electron Testing (After Browser Tests Pass)

**Only proceed if browser tests pass!**

### Build + Run Electron

```bash
npm run electron:wizard
npm run electron:compile
npm run electron
```

### What Should Happen

1. **Splash screen appears** (3-5 seconds)
2. **Wizard window opens** (same as browser version)
3. **Real IPC calls work:**
   - Docker check detects actual Docker
   - Storage path checks real disk space
   - API validation makes real HTTP requests

### Expected Differences from Browser

| Feature | Browser (Mock) | Electron (Real) |
|---------|----------------|-----------------|
| Docker Status | Always "running" | Actual detection |
| Disk Space | Fixed 50GB/100GB | Real drive space |
| API Validation | Always valid | Real API test |
| Storage Validation | Always valid | Real write check |

---

## 📊 Test Results Template

**Copy this and fill it out:**

```
## Phase 3 Test Results

**Date:** [DATE]
**Tester:** [YOUR NAME]
**Environment:** [Browser name + version]

### Browser Tests
- [ ] Build completed without errors
- [ ] Test page loaded successfully
- [ ] All 7 pages rendered correctly
- [ ] Navigation worked (Back/Next)
- [ ] State synchronization test passed
- [ ] Error boundary test passed
- [ ] Tailwind CSS loaded (no broken styles)
- [ ] Console had no errors

### Validation Tests
- [ ] Storage validation showed disk space
- [ ] API validation showed spinner → checkmark
- [ ] IPC calls logged in test panel

### Offline Test
- [ ] Disconnected from internet
- [ ] Refreshed page
- [ ] Styles still worked (CSS is local)

### Issues Found
[List any problems, errors, or unexpected behavior]

### Screenshots
[Attach screenshots if helpful]

### Overall Assessment
[ ] ✅ PASS - Ready for Electron testing
[ ] ⚠️ PARTIAL - Some issues found (details above)
[ ] ❌ FAIL - Critical issues blocking progress
```

---

## 🆘 Troubleshooting

### Issue: "Cannot read property 'render' of undefined"

**Cause:** React bundle not loaded

**Fix:**
1. Verify `electron/dist/installer/wizard-react.js` exists
2. Check browser console for 404 errors
3. Rebuild: `npm run electron:wizard`

### Issue: "Tailwind classes not working"

**Cause:** CSS not loaded or path incorrect

**Fix:**
1. Verify `electron/dist/installer/wizard-styles.css` exists
2. Check Network tab (F12) for CSS 404
3. Rebuild: `npm run electron:wizard`

### Issue: "window.electronAPI is undefined"

**Expected:** This is normal in browser (IPC doesn't exist outside Electron)

**Result:** Mock API is provided by wizard-test.html

**Check:** Look for "Mock Electron API ready" in test log

### Issue: Pages not rendering

**Debug:**
1. Open browser console (F12)
2. Check for React errors
3. Verify: `window.mountWelcomeStep()` exists
4. Manually test: `window.mountWelcomeStep()` in console

---

## ✅ Success Criteria

**Phase 3 is approved when:**

1. ✅ Browser tests pass (all checkmarks)
2. ✅ No console errors
3. ✅ All 7 pages render correctly
4. ✅ Tailwind CSS works offline
5. ✅ Error boundary displays on crash

**Optional (Week 4):**
- ⏳ Electron integration tests pass
- ⏳ Clean VM testing complete

---

**Last Updated:** March 27, 2026
**Test Page:** `electron/src/installer/pages/wizard-test.html`
**Documentation:** `docs/PHASE3_REVIEW_RESPONSE.md`
