# Whisk Token Auto-Refresh Extension

This Chrome extension automatically captures your Whisk OAuth token and sends it to the Obsidian News Desk backend.

## Installation

1. **Open Chrome Extensions:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)

2. **Load Extension:**
   - Click "Load unpacked"
   - Select this folder: `chrome-extension/`

3. **Verify Installation:**
   - You should see "Whisk Token Auto-Refresh" in your extensions list
   - Click the extension icon to see the popup

## Usage

### First Time Setup:

1. **Visit Whisk:**
   - Go to https://labs.google/fx/tools/whisk
   - Log into your Google account if needed

2. **Generate a Test Image:**
   - Enter any prompt and generate an image
   - The extension will automatically capture the OAuth token

3. **Verify Token Captured:**
   - Click the extension icon
   - You should see "Token Active" with a green indicator
   - Token preview shows first/last characters

### How It Works:

- **Automatic Capture:** Intercepts API requests to `aisandbox-pa.googleapis.com` and extracts the Authorization header
- **Auto-Send:** Sends token to `http://localhost:8347/api/whisk/token`
- **Auto-Refresh:** Every 50 minutes, opens Whisk in background to refresh the token
- **Persistent Storage:** Saves token in extension storage

### Troubleshooting:

**"No Token" status:**
- Visit https://labs.google/fx/tools/whisk
- Generate a test image
- Check browser console (F12) for errors

**Token not sending to backend:**
- Ensure the backend is running on `localhost:8347`
- Check Network tab in DevTools for failed requests to `/api/whisk/token`

**Token expiring:**
- Extension automatically refreshes every 50 minutes
- Manually visit Whisk to force a refresh

## Privacy & Security

- Token stays local (only sent to your local backend at `localhost:8347`)
- No external servers involved
- Source code is fully transparent (check `background.js`)

## Development

**Testing:**
```javascript
// Open browser console on Whisk page
// Check if token is being captured:
chrome.runtime.sendMessage({ action: 'getToken' }, (response) => {
  console.log('Current token:', response.token);
});
```

**Debugging:**
- Go to `chrome://extensions/`
- Find "Whisk Token Auto-Refresh"
- Click "Inspect views: service worker"
- Check console for logs
