# Zero-Interaction Token Management Setup

**Goal:** Login to Whisk once, then let the extension handle everything automatically for months.

## How It Works

Your Chrome extension has built-in automatic token refresh:

1. **Every 12 hours**: Alarm triggers automatic token check
2. **On browser startup**: Checks if token expired while browser was closed
3. **Automatic background refresh**: Opens Whisk in hidden tab, captures token, sends to backend
4. **No user interaction needed**: Everything happens silently in the background

## One-Time Setup (Do This Once)

### Step 1: Install Extension (Already Done ✅)

Your extension is installed at: `chrome-extension://gcgblhgncmhjchllkcpcneeibddhmbbe`

Verify at: `chrome://extensions/`

### Step 2: Login to Whisk in Chrome

**Do this once to save your session:**

1. Open Chrome (the browser where your extension is installed)
2. Navigate to: https://labs.google.com/whisk
3. Click "Sign in with Google"
4. Complete 2FA if prompted
5. **Important:** Check "Stay signed in" or similar option
6. Generate a test image (any prompt) to verify it works
7. Close the tab - **don't sign out!**

**Chrome will remember your login for months** (typically 6+ months).

### Step 3: Verify Extension Captured Token

Check the extension captured your token:

```bash
cd obsidian-news-desk
grep WHISK_API_TOKEN .env
```

You should see a token starting with `ya29.a0AT...`

### Step 4: Test Automatic Capture

Open Chrome DevTools Console (F12) and look for:

```
[Whisk Manager] 🆕 New token detected!
[Whisk Manager] ✅ Token sent to backend successfully
```

## Automatic Behavior (No Action Needed)

### Token Expires (Every ~1 Hour)

**What happens:**
1. Extension alarm wakes up (or worker detects expiry)
2. Opens https://labs.google.com/whisk in background tab
3. Whisk API request fires automatically (you're already logged in!)
4. Extension captures Bearer token from network request
5. Sends token to `http://localhost:8347/api/whisk/token`
6. Backend updates `.env` file
7. Image generation resumes automatically

**You see:** Nothing! It all happens in the background.

**Backend logs show:**
```
🔑 [Whisk Token] Received new token from extension
✅ [Whisk Token] Token stored successfully
```

### Chrome Browser Restarts

**What happens:**
1. Service worker starts up
2. Checks last token timestamp
3. If token expired (>1 hour old), triggers refresh immediately
4. Opens background tab, captures fresh token
5. System ready within 2-3 seconds

**You see:** Nothing! Happens on browser launch.

### Session Expires (Every ~6 Months)

**What happens:**
1. Extension opens background tab
2. Whisk redirects to Google login (session expired)
3. Extension detects login page
4. **Popup notification appears:** "Whisk session expired - please login"

**You see:** Notification prompting you to login again.

**Action needed:** Click notification → Complete 2FA → Done for another 6 months.

## Troubleshooting

### Extension Not Capturing Tokens

**Check if Chrome is logged into Whisk:**

1. Open https://labs.google.com/whisk in Chrome
2. If you see login page → Login again
3. If you see Whisk interface → Already logged in ✅

**Check extension logs:**

1. Go to `chrome://extensions/`
2. Find "Whisk Token Manager"
3. Click "Inspect views: service worker"
4. Check console for errors

**Force manual refresh:**

```bash
cd obsidian-news-desk
npm run test:token-refresh
```

This will trigger extension and show detailed logs.

### Token Not Updating Backend

**Check backend API is running:**

```bash
curl http://localhost:8347/api/whisk/extension-status
```

Should return: `{"status":"ok","extensionInstalled":true}`

**Check .env file permissions:**

```bash
cd obsidian-news-desk
ls -la .env
```

File must be writable by your user.

### Image Generation Still Failing

**Check current token:**

```bash
cd obsidian-news-desk
node -e "console.log(require('dotenv').config()); console.log('Token age:', Date.now() - require('fs').statSync('.env').mtimeMs, 'ms')"
```

If token age > 1 hour, manually refresh:

1. Open Chrome
2. Visit https://labs.google.com/whisk
3. Generate test image
4. Extension should capture automatically

## Monitoring

### Extension Status

**Check if extension is active:**

```bash
# From any shell
curl http://localhost:8347/api/whisk/extension-status
```

**Check last token update:**

```bash
cd obsidian-news-desk
stat .env
```

Look at "Modify" timestamp - should be recent.

### Backend Logs

**Watch for automatic token updates:**

```bash
cd obsidian-news-desk
# Backend dev server logs show:
🔑 [Whisk Token] Received new token from extension
✅ [Whisk Token] Token stored successfully
```

### Extension Logs

**Open extension console:**

1. `chrome://extensions/`
2. "Whisk Token Manager" → "Inspect views: service worker"
3. Look for:
   ```
   [Whisk Manager] ⏰ Auto-refresh alarm triggered
   [Whisk Manager] 🌐 Opening background tab to refresh token
   [Whisk Manager] 🆕 New token detected!
   [Whisk Manager] ✅ Token sent to backend successfully
   ```

## Expected Frequency

| Event | Frequency | Action Required |
|-------|-----------|-----------------|
| Token Refresh | Every ~50 minutes | None (automatic) |
| Alarm Check | Every 12 hours | None (automatic) |
| Browser Restart | On startup | None (automatic) |
| Session Expiry | Every ~6 months | Login again (2FA) |

## Benefits of This Approach

✅ **Zero daily interaction** - Set it and forget it
✅ **No browser automation** - Uses real Chrome session
✅ **No headless browser overhead** - Extension is lightweight
✅ **Session persists for months** - Only login twice a year
✅ **Automatic recovery** - Extension retries on failures
✅ **Works with 2FA** - You only complete it manually when needed

## Security Notes

⚠️ **Chrome Profile Security:**
- Extension uses your Chrome profile (where you're logged into Google)
- Anyone with access to your Chrome profile can access your Whisk account
- Use OS-level password protection for your user account

⚠️ **Extension Permissions:**
- Extension can read network requests from `labs.google.com`
- Extension can read/write localStorage
- Extension can open tabs in the background
- All code is visible in `chrome-extension/` directory

✅ **Backend Security:**
- Tokens stored in `.env` file (not committed to git)
- Token API endpoint (`/api/whisk/token`) is public by design
- Only works when backend is running (not exposed to internet)

## Comparison: Manual vs Automatic

### Before (Manual Token Refresh)
```
1. Image generation fails (401 error)
2. Open browser
3. Go to https://labs.google.com/whisk
4. Open DevTools (F12)
5. Generate test image
6. Find network request
7. Copy Authorization header
8. Update .env file manually
9. Restart workers
10. Retry image generation

Time: 2-5 minutes every hour 😫
```

### After (Automatic with Extension)
```
1. Extension detects expiry
2. Opens background tab
3. Captures token
4. Updates backend
5. Image generation continues

Time: 0 seconds (you never notice) 😎
```

## Next Steps

✅ **Setup complete!** You're already configured.

**Optional improvements:**

1. **Increase alarm frequency** (if tokens expire faster than expected):
   - Edit `chrome-extension/background.js`
   - Change `periodInMinutes: 12 * 60` to `periodInMinutes: 30` (every 30 min)

2. **Add desktop notifications** (to know when tokens refresh):
   - Edit `chrome-extension/background.js`
   - Add `chrome.notifications.create()` after successful token send

3. **Monitor in system tray** (optional):
   - Create a small Electron app that monitors `.env` file age
   - Shows green/yellow/red indicator for token freshness

---

**You're all set! 🎉**

Your system will now run for months without manual intervention. Only action needed: login again when Chrome session expires (~6 months).
