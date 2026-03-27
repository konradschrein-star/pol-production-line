# Extension Testing Guide v1.6.2

## Quick Test (5 minutes)

### Step 1: Reload Extension
```
1. Go to edge://extensions/
2. Find "Whisk Token Manager - Production"
3. Verify version shows "1.6.2"
4. Click 🔄 Reload button
```

### Step 2: Open Service Worker Console
```
1. On edge://extensions/ page
2. Enable "Developer mode" toggle
3. Find extension → Click "service worker" link
4. Console window opens → Keep it open
```

### Step 3: Test Token Capture
```
1. Open new tab: https://labs.google/fx/tools/whisk/project
2. Type prompt: "sunset over mountains"
3. Click Generate button
4. Wait for image (~15 seconds)
```

### Step 4: Check Results

**In Service Worker Console, you should see:**
```
🔍 Intercepted request to Whisk API
✅ Found Bearer token (length: XXX)
📤 Sending token to backend...
✅ Token saved successfully
```

**Verify token was saved:**
```bash
cd obsidian-news-desk
cat .env | grep WHISK_API_TOKEN
```

Should output:
```
WHISK_API_TOKEN=ya29.a0Aa7MYipjZ...
```

---

## Advanced Test: Auto-Refresh (2 minutes)

### Test Auto-Trigger Feature

1. **Click extension icon** in browser toolbar
2. **Click "🔄 Refresh Now" button**
3. **Watch for:**
   - Background tab opens to Whisk
   - Prompt auto-types
   - Generate button auto-clicks
   - Tab closes after token captured

**Expected:** Completes in ~20-30 seconds without manual intervention.

---

## Troubleshooting

### ❌ No console messages in service worker
**Problem:** Extension not intercepting requests
**Fix:**
1. Check manifest permissions in `edge://extensions/`
2. Ensure "Site access" is set to "On all sites"
3. Reload extension and try again

### ❌ "Failed to save token" error
**Problem:** Backend not running
**Fix:**
```bash
cd obsidian-news-desk
npm run dev
```
Then test again.

### ❌ Content script messages not appearing
**Problem:** URL still doesn't match
**Fix:**
1. Verify you're on: `https://labs.google/fx/tools/whisk/project`
2. NOT: `https://labs.google.com/...` (with .com)
3. Check browser console (F12) on Whisk page for any errors

---

## Success Criteria

✅ Extension version is 1.6.2
✅ Service worker console shows token interception messages
✅ Token is saved to `.env` file
✅ Token starts with `ya29.`
✅ Auto-refresh feature works without manual intervention
✅ No 401 errors when generating images in production

---

## Next Steps After Testing

### If Tests Pass ✅
1. Test with real production job (create broadcast in News Desk)
2. Monitor for 401 errors during image generation
3. Verify auto-refresh alarm works (wait 50 minutes or reduce interval for testing)

### If Tests Fail ❌
1. Capture service worker console output → save to file
2. Capture page console output (F12) → save to file
3. Check `edge://extensions/` → Site access permissions
4. Report findings for further debugging

---

## Quick Reference

**Whisk URL:** `https://labs.google/fx/tools/whisk/project`
**API Endpoint:** `https://aisandbox-pa.googleapis.com/v1/whisk:generateImage`
**Token Format:** `Bearer ya29.a0Aa...` (OAuth 2.0)
**Backend Endpoint:** `http://localhost:8347/api/whisk/token`
**Extension Version:** 1.6.2

---

**IMPORTANT:** The URL fix was the critical blocker. If the extension still doesn't work after this fix, it indicates a deeper Manifest v3 permissions issue that will require additional debugging.
