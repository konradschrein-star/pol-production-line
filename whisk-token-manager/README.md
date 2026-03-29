# Whisk Token Manager Extension

Simple Chrome extension that automatically captures OAuth tokens from Whisk API requests and sends them to your local backend.

## Installation

1. Create a simple icon (or download one):
   - Create `icon.png` (128x128px) in this directory
   - Or use any PNG image and rename it to `icon.png`

2. Load extension in Chrome:
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select this folder: `obsidian-news-desk/whisk-token-manager`

3. Verify it's working:
   - Go to https://labs.google.com/whisk
   - Generate a test image
   - Check browser console (F12) for "[Whisk Token Manager] New token detected!"
   - Check your backend logs for "🔑 [Whisk Token] Received new token from extension"

## How It Works

1. Extension monitors ALL requests to `aisandbox-pa.googleapis.com` (Whisk API)
2. When it sees an Authorization header with a Bearer token, it captures it
3. Checks if token is different from last saved token
4. POSTs new token to `http://localhost:8347/api/whisk/token`
5. Backend receives token, updates `.env`, and workers use it immediately

## Troubleshooting

**Extension not detecting tokens:**
- Make sure you're logged into Google/Whisk in the same browser
- Check `chrome://extensions/` - extension should show no errors
- Open browser console on Whisk page and look for extension logs

**Tokens not reaching backend:**
- Make sure backend is running at `http://localhost:8347`
- Check CORS is allowed (should be, API endpoint allows `*`)
- Check browser console for fetch errors

**Extension ID:**
After loading, Chrome will assign an ID like `abcdefghijklmnop`. You can find it at `chrome://extensions/`.

Update your `.env`:
```
AUTO_WHISK_EXTENSION_ID=<your-new-extension-id>
```
