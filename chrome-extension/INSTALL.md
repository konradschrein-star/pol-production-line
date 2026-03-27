# Whisk Token Manager - Installation Guide

## Quick Install (2 minutes)

### 1. Load Extension in Chrome
```
1. Open Chrome
2. Navigate to: chrome://extensions/
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select folder: obsidian-news-desk/chrome-extension/
```

### 2. Verify Installation
- Extension should appear with green key icon
- Click extension icon to see professional popup
- Status should show "No Token" initially

### 3. Capture First Token
```
1. Visit: https://labs.google/fx/tools/whisk
2. Log into Google if needed
3. Generate any test image (any prompt works)
4. Extension automatically captures token
5. Check extension popup - should show "Token Active" with green indicator
```

## Features

### ✅ Automatic Token Capture
- Intercepts Whisk API requests
- Extracts OAuth Bearer token
- Sends to backend at `localhost:8347`
- No manual copying needed!

### ✅ Auto-Refresh (Every 50 Minutes)
- Automatically opens Whisk in background tab
- Refreshes token before expiration
- Closes tab automatically after refresh
- **Works even when Chrome is idle!**

### ✅ Background Operation
- Runs as service worker (always active)
- Doesn't require Whisk tab to be open
- Persists token across browser restarts
- Low memory footprint

### ✅ Professional UI
- Real-time status indicator
- Token preview (masked for security)
- Manual refresh button
- Connection status to backend
- Dark theme, modern design

## Permissions Explained

| Permission | Why Needed |
|------------|------------|
| `storage` | Save token across sessions |
| `tabs` | Open Whisk for auto-refresh |
| `webRequest` | Intercept API calls to capture token |
| `alarms` | Schedule auto-refresh every 50 min |
| `https://labs.google/*` | Access Whisk website |
| `https://*.googleapis.com/*` | Capture API requests |
| `http://localhost/*` | Send token to backend |

## Troubleshooting

### Extension won't load:
- Make sure all files are in the same folder
- Icons (icon16.png, etc.) must exist
- Reload extension after any file changes

### "No Token" status persists:
1. Visit https://labs.google/fx/tools/whisk
2. Generate a test image
3. Check console (F12) for errors
4. Click extension icon - should update within 2 seconds

### Token not reaching backend:
- Ensure backend is running: http://localhost:8347
- Check browser console for network errors
- Backend logs should show: "🔑 [Whisk Token] Received new token"

### Auto-refresh not working:
- Extension must stay enabled
- Check `chrome://extensions/` - service worker should be active
- Click "Inspect views: service worker" to see logs

## Manual Operations

### Force Token Refresh:
```
1. Click extension icon
2. Click "REFRESH TOKEN NOW" button
3. Wait 3-5 seconds
4. Status updates automatically
```

### Check Current Token:
```
1. Click extension icon
2. Token shown in monospace font
3. First/last 15 characters visible
4. Full token sent to backend only
```

### Reset Extension:
```
1. Go to chrome://extensions/
2. Find "Whisk Token Manager"
3. Click "Remove"
4. Re-install (Load unpacked)
5. Recapture token by visiting Whisk
```

## Development & Debugging

### View Logs:
```
1. chrome://extensions/
2. Find "Whisk Token Manager"
3. Click "Inspect views: service worker"
4. Check Console tab
```

### Test Token Capture:
```javascript
// In Whisk page console (labs.google/fx/tools/whisk)
// Check if requests are being intercepted:
fetch('https://aisandbox-pa.googleapis.com/v1/whisk:generateImage', {
  headers: { 'Authorization': 'Bearer test123' }
})
```

## Security & Privacy

- ✅ Token stays local (only sent to localhost)
- ✅ No external servers involved
- ✅ Open source (all code visible)
- ✅ No tracking or analytics
- ✅ Token encrypted in Chrome's storage
- ✅ Requires user action (visiting Whisk)

## Support

**Extension not working?**
1. Check all steps in this guide
2. Verify backend is running
3. Check browser console for errors
4. Reload extension in chrome://extensions/

**Backend not receiving token?**
- Check: http://localhost:8347/api/whisk/token
- Should return 404 GET, but POST should work
- Backend logs show token reception

---

**Ready to use!** Extension will automatically manage your Whisk tokens 24/7.
