# Whisk Token Extension - Quick Start

## ⚡ 5-Minute Setup

### Step 1: Install Extension (2 minutes)

1. Open Chrome and go to: `chrome://extensions/`
2. Toggle **"Developer mode"** ON (top-right corner)
3. Click **"Load unpacked"**
4. Navigate to and select this folder:
   ```
   C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\chrome-extension
   ```
5. You should see **"Whisk Token Auto-Refresh"** appear in your extensions list

### Step 2: Capture Initial Token (3 minutes)

1. Open a new tab and go to: https://labs.google/fx/tools/whisk
2. Sign in with your Google account (if not already signed in)
3. Generate any test image:
   - Type any prompt (e.g., "a cat")
   - Click generate
   - Wait for image to load
4. **Done!** The extension automatically captured your token

### Step 3: Verify It's Working

1. Click the extension icon (puzzle piece) in Chrome toolbar
2. Find "Whisk Token Auto-Refresh" and click it
3. You should see:
   - ✅ **"Token Active"** with green status
   - Token preview: `ya29.a0ATkoCc...`
   - Last updated timestamp

## 🎯 How It Works

### Automatic Token Capture:
- **Listens** for Whisk API requests in the background
- **Extracts** the OAuth token from request headers
- **Sends** token to your local backend at `localhost:8347`
- **Refreshes** automatically every 50 minutes

### On-Demand Refresh (NEW):
- Backend detects **401 Unauthorized** error
- Triggers extension to refresh token
- Extension opens Whisk in background tab
- Captures new token automatically
- Sends to backend
- Backend retries failed request

## 🔧 Troubleshooting

### "No Token" Status
**Solution:** Visit https://labs.google/fx/tools/whisk and generate a test image

### Backend Not Receiving Token
**Check:**
1. Is the backend running? (`npm run dev` in obsidian-news-desk)
2. Open `chrome://extensions/` → Click "service worker" link → Check console for errors

### Token Keeps Expiring
**This is normal!** Google tokens expire after ~1 hour. The extension:
- Auto-refreshes every 50 minutes (proactive)
- Refreshes on-demand when backend gets 401 errors (reactive)

## 🚀 Daily Usage

**You don't need to do anything!** Just keep:
1. Chrome running (extension works in background)
2. Stay logged into Google in Chrome
3. The extension handles everything automatically

**Optional:** Pin the extension to your toolbar to easily check status

## 🔒 Privacy & Security

- ✅ Token stays 100% local (only sent to `localhost:8347`)
- ✅ No external servers or third parties
- ✅ Open source code (check `background.js`)
- ✅ Extension only accesses `labs.google.com/whisk`

## 🎛️ Advanced

### Manual Refresh:
```javascript
// Open browser console and run:
chrome.runtime.sendMessage(
  'YOUR_EXTENSION_ID',
  { action: 'refreshNow' },
  (response) => console.log('Refreshed:', response)
);
```

### Check Token:
Click extension icon → see current token status

### Disable Auto-Refresh:
1. Go to `chrome://extensions/`
2. Find "Whisk Token Auto-Refresh"
3. Toggle OFF

---

**Need Help?** Check the main README.md or contact support.
