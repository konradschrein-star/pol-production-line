# Chrome Extension Setup - Whisk Token Manager

**Location:** `C:\Program Files\Obsidian News Desk\resources\chrome-extension\`

This extension **automatically captures and refreshes** your Whisk API token every 50 minutes, so you never have to manually copy tokens again!

---

## Quick Install (2 Minutes)

### Step 1: Open Chrome Extensions

1. Open **Chrome** or **Edge** browser
2. Navigate to: `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top-right corner)

### Step 2: Load the Extension

1. Click **"Load unpacked"**
2. Navigate to and select:
   ```
   C:\Program Files\Obsidian News Desk\resources\chrome-extension\
   ```
3. Extension appears with a **green key icon** 🔑

### Step 3: Capture Your First Token

1. Visit: **https://labs.google.com/fx/tools/whisk**
2. Log into your Google account (if needed)
3. **Generate any test image** (any prompt works)
4. Extension **automatically captures** the token!

### Step 4: Verify

1. Click the **extension icon** (green key) in Chrome toolbar
2. Popup shows **"Token Active"** with green indicator
3. Token preview displays (first/last characters visible)

**Done!** ✅ Your token will now auto-refresh every 50 minutes.

---

## What It Does

### ✅ Automatic Token Capture
- Intercepts API requests to Whisk
- Extracts OAuth Bearer token
- Sends to your local backend (`localhost:8347`)
- **No manual copying needed!**

### ✅ Auto-Refresh Every 50 Minutes
- Opens Whisk in background tab
- Refreshes token before expiration
- Closes tab automatically
- **Works even when Chrome is idle!**

### ✅ Persistent Storage
- Token saved across browser restarts
- Always active (service worker)
- Low memory footprint

---

## Troubleshooting

### Extension won't load
**Error:** "Could not load extension"
**Fix:**
1. Ensure all files exist in `chrome-extension\` folder
2. Icons (icon16.png, icon48.png, icon128.png) must be present
3. Reload extension: `chrome://extensions/` → Click reload icon

### "No Token" status persists
**Fix:**
1. Visit https://labs.google.com/fx/tools/whisk
2. Generate a test image (any prompt)
3. Wait 2-3 seconds
4. Click extension icon - should show "Token Active"

### Token not reaching backend
**Check:**
1. Backend is running: http://localhost:8347
2. Open browser console (F12)
3. Look for network errors
4. Backend logs should show: "🔑 [Whisk Token] Received new token"

### Auto-refresh not working
**Check:**
1. Extension is enabled in `chrome://extensions/`
2. Service worker is active (click "Inspect views: service worker")
3. Check console logs for errors

---

## Manual Operations

### Force Token Refresh
1. Click extension icon
2. Click **"REFRESH TOKEN NOW"** button
3. Wait 3-5 seconds
4. Status updates automatically

### View Current Token
1. Click extension icon
2. Token shown in monospace font
3. First/last 15 characters visible
4. Full token sent to backend only

### Reset Extension
1. Go to `chrome://extensions/`
2. Find "Whisk Token Manager - Production"
3. Click "Remove"
4. Re-install (Load unpacked)
5. Recapture token by visiting Whisk

---

## Security & Privacy

- ✅ **Token stays local** (only sent to localhost:8347)
- ✅ **No external servers** involved
- ✅ **Open source** (all code visible in chrome-extension folder)
- ✅ **No tracking** or analytics
- ✅ **Token encrypted** in Chrome's storage
- ✅ **Requires user action** (visiting Whisk)

---

## Permissions Explained

| Permission | Why Needed |
|------------|------------|
| `storage` | Save token across browser sessions |
| `tabs` | Open Whisk for auto-refresh |
| `webRequest` | Intercept API calls to capture token |
| `alarms` | Schedule auto-refresh every 50 minutes |
| `notifications` | Optional: Notify when token refreshes |
| `https://labs.google/*` | Access Whisk website |
| `https://*.googleapis.com/*` | Capture API requests |
| `http://localhost/*` | Send token to local backend |

---

## Alternative: Manual Token Setup

If you prefer **not** to use the extension:

1. Visit: https://labs.google.com/fx/tools/whisk
2. Press **F12** → Go to **Network** tab
3. Generate a test image
4. Find request to "generateImage"
5. Click request → **Headers** tab
6. Copy full `Authorization: Bearer XXX...` value
7. Open Obsidian News Desk → **Settings** → Paste token

**Note:** Manual tokens expire every hour and must be updated.

---

## Support

**Extension Location:**
```
C:\Program Files\Obsidian News Desk\resources\chrome-extension\
```

**Debug Logs:**
1. Go to `chrome://extensions/`
2. Find "Whisk Token Manager - Production"
3. Click "Inspect views: service worker"
4. Check Console tab for logs

**Backend API:**
- Endpoint: `http://localhost:8347/api/whisk/token`
- Method: POST
- Body: `{ "token": "ya29.xxx..." }`

---

**Ready!** Your Whisk tokens will now be managed automatically 24/7. 🎉
