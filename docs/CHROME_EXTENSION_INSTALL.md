# Chrome Extension Installation Guide

**Obsidian News Desk - Whisk Token Manager Extension**

This guide walks you through installing the Whisk Token Manager Chrome extension that was bundled with your Obsidian News Desk installation. This extension automatically captures and refreshes OAuth tokens from Google Whisk, eliminating the need for manual token updates.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Google Chrome or Microsoft Edge** installed on your system
- ✅ **Obsidian News Desk** installed via the Windows installer
- ✅ **Google Account** with access to Google Labs (labs.google.com)

---

## Installation Steps

### Step 1: Open Chrome Extensions Page

**[Screenshot placeholder: Chrome address bar with chrome://extensions/ typed]**

1. Open **Google Chrome** (or Microsoft Edge)
2. In the address bar, type: `chrome://extensions/`
3. Press **Enter**

The Chrome Extensions management page will open.

---

### Step 2: Enable Developer Mode

**[Screenshot placeholder: Developer mode toggle in top-right corner highlighted]**

1. Look in the **top-right corner** of the page
2. Find the **"Developer mode"** toggle switch
3. Click the toggle to **enable** Developer mode
4. Additional buttons will appear below the toggle

> **Note:** Developer mode is required to load unpacked extensions. This is a standard Chrome feature and does not pose any security risk when loading trusted extensions.

---

### Step 3: Load the Extension

**[Screenshot placeholder: "Load unpacked" button and folder selection dialog]**

1. Click the **"Load unpacked"** button (it appears after enabling Developer mode)
2. A file browser dialog will open
3. Navigate to the extension directory:
   ```
   C:\Program Files\Obsidian News Desk\resources\chrome-extension\
   ```
4. Click **"Select Folder"** (do NOT open individual files, select the entire folder)

Chrome will load the extension and add it to your browser.

---

### Step 4: Verify Installation

**[Screenshot placeholder: Extension card showing Whisk Token Manager with green key icon]**

After loading, you should see a new extension card with:

- **Name:** "Whisk Token Manager - Production"
- **Version:** 2.0.0 (or later)
- **Icon:** Green key symbol
- **Status:** "Enabled" with blue toggle switch

If you see any errors, refer to the [Troubleshooting](#troubleshooting) section below.

---

### Step 5: Pin the Extension (Optional but Recommended)

**[Screenshot placeholder: Extension icon pinned to Chrome toolbar]**

1. Click the **puzzle piece icon** in the Chrome toolbar (top-right)
2. Find "Whisk Token Manager - Production" in the list
3. Click the **pin icon** next to it
4. The extension icon will appear directly in your toolbar for easy access

---

### Step 6: Capture Your First Token

**[Screenshot placeholder: Whisk website with test image generation]**

Now that the extension is installed, capture your first token:

1. Visit: **https://labs.google.com/fx/tools/whisk**
2. **Log in** to your Google account (if not already logged in)
3. **Generate any test image** (subject/style doesn't matter)
4. Wait 2-3 seconds for the image to generate

The extension automatically captures the OAuth token in the background.

---

### Step 7: Confirm Token is Active

**[Screenshot placeholder: Extension popup showing "Token Active" with green indicator]**

1. Click the **extension icon** in your Chrome toolbar (green key)
2. A popup window appears showing:
   - **Status:** "Token Active" with green dot
   - **Token Preview:** First and last characters of token (e.g., "ya29...xyz")
   - **Last Refresh:** Timestamp of when token was captured
   - **Next Refresh:** Countdown to automatic refresh (12 hours)

**Success!** Your token is now active and will automatically refresh every 12 hours.

---

## How It Works

### Automatic Token Refresh

The extension operates on a **12-hour refresh cycle**:

1. **Initial Capture:** Token is captured when you visit Whisk and generate an image
2. **Background Refresh:** Every 12 hours, the extension:
   - Opens Whisk in a background tab
   - Waits for auth session endpoint to respond
   - Captures fresh token automatically
   - Closes the background tab
3. **Failure Recovery:** If refresh fails (network issues, etc.), the extension retries with exponential backoff

### Token Storage

- Tokens are stored **locally** in Chrome's encrypted storage (chrome.storage.sync)
- Tokens are **automatically sent** to Obsidian News Desk backend at `http://localhost:8347/api/whisk/token`
- No tokens are sent to external servers (except Google's official Whisk API)

### What Gets Captured

The extension monitors this specific endpoint:
```
https://labs.google.com/fx/api/auth/session
```

When this endpoint returns a response containing an `access_token`, the extension:
1. Extracts the token
2. Stores it locally
3. Sends it to your local Obsidian News Desk instance
4. Schedules the next refresh alarm (12 hours)

---

## Troubleshooting

### Extension Won't Load

**Error:** "Could not load extension"

**Solutions:**
- Verify all files exist in the chrome-extension folder:
  ```bash
  dir "C:\Program Files\Obsidian News Desk\resources\chrome-extension\"
  ```
  Should show ~23 files including manifest.json, background.js, etc.
- Try removing and re-adding the extension:
  1. Click "Remove" on the extension card
  2. Reload using "Load unpacked" button
- Check Chrome console for errors:
  1. Click "Errors" button on extension card
  2. Look for specific error messages

---

### No Token Captured After Generating Image

**Symptoms:**
- Extension popup shows "No token captured yet"
- Status indicator is yellow/red

**Solutions:**
1. **Wait longer:** Token capture can take 2-5 seconds after image generation
2. **Check network requests:**
   - Open Chrome DevTools (F12)
   - Go to **Network** tab
   - Generate another image
   - Look for request to `labs.google.com/fx/api/auth/session`
   - If missing, you may not be logged in to Google
3. **Verify Whisk access:**
   - Ensure you can access https://labs.google.com/fx/tools/whisk
   - Some Google accounts may not have Whisk access (requires Google Labs enrollment)
4. **Reload extension:**
   - Go to chrome://extensions/
   - Click the **reload icon** on the extension card
   - Try generating an image again

---

### Backend Not Receiving Token

**Symptoms:**
- Extension shows "Token Active"
- Obsidian News Desk still shows token errors or 401 responses

**Solutions:**
1. **Verify backend is running:**
   - Open http://localhost:8347 in browser
   - Should see Obsidian News Desk dashboard
   - If not running, start via `START.bat`
2. **Check extension console logs:**
   - Go to chrome://extensions/
   - Click "Service Worker" link under extension
   - Look for network errors when sending token to localhost
3. **Manually trigger token send:**
   - Click extension icon
   - Click "Refresh Token" button in popup
   - Watch console for success/error messages
4. **Check firewall settings:**
   - Ensure Chrome can access localhost:8347
   - Check Windows Firewall for blocked connections

---

### Token Expired or Invalid

**Symptoms:**
- Image generation fails with 401 Unauthorized
- Extension shows old timestamp on "Last Refresh"

**Solutions:**
1. **Manual refresh:**
   - Click extension icon
   - Click "Refresh Token" button
   - Wait 5-10 seconds
   - Generate test image on Whisk
2. **Clear storage and re-capture:**
   - Go to chrome://extensions/
   - Click "Remove" on extension
   - Re-add using "Load unpacked"
   - Visit Whisk and generate new image
3. **Check auto-refresh alarms:**
   - Right-click extension icon → Inspect popup
   - In console, type: `chrome.alarms.getAll(console.log)`
   - Should show alarm named "refreshWhiskToken"
   - If missing, extension may need to be reloaded

---

### Extension Stopped Working After Chrome Update

**Symptoms:**
- Extension was working, now shows errors
- Chrome updated to new version

**Solutions:**
1. **Reload extension:**
   - chrome://extensions/ → Click reload icon
2. **Re-install extension:**
   - Remove extension
   - Re-add using "Load unpacked"
3. **Check Manifest V3 compatibility:**
   - Extension uses Manifest V3 (required for Chrome 127+)
   - If Chrome version is very old, update Chrome first

---

## Manual Alternative (If Extension Doesn't Work)

If you cannot get the extension working, you can manually update tokens:

### Manual Token Capture

1. Visit **https://labs.google.com/fx/tools/whisk**
2. Open **Chrome DevTools** (F12)
3. Go to **Network** tab
4. Generate a test image
5. Find the request to `generateImage` or `auth/session`
6. Click on it, go to **Headers** tab
7. Find the `Authorization` header
8. Copy the token (starts with "Bearer ya29...")
9. In Obsidian News Desk:
   - Open **Settings** page
   - Paste token in "Whisk API Token" field
   - Click "Save"

**Note:** Manual tokens expire after ~1 hour and must be refreshed frequently. The extension automates this process.

---

## Security & Privacy

### Data Collection

The extension does **NOT** collect or transmit:
- ❌ Your Google credentials or passwords
- ❌ Any data to third-party servers
- ❌ Your browsing history
- ❌ Any personal information

### What Is Sent

The extension **ONLY** sends:
- ✅ OAuth access tokens to `http://localhost:8347` (your local machine)
- ✅ Tokens are used exclusively for Whisk API authentication

### Permissions Explained

The extension requires these permissions:

| Permission | Purpose |
|------------|---------|
| `storage` | Store tokens locally in Chrome's encrypted storage |
| `tabs` | Open Whisk in background tabs for auto-refresh |
| `webRequest` | Monitor requests to Whisk auth session endpoint |
| `scripting` | (Reserved for future features, not currently used) |
| `alarms` | Schedule 12-hour refresh cycle |
| `notifications` | (Optional) Notify user of refresh errors |

All permissions are **standard** for browser extensions and follow Chrome's security best practices.

---

## Uninstallation

If you need to remove the extension:

1. Go to `chrome://extensions/`
2. Find "Whisk Token Manager - Production"
3. Click **"Remove"** button
4. Confirm removal

**Note:** After uninstalling, you will need to manually update tokens via the Settings page in Obsidian News Desk.

---

## Next Steps

✅ **Extension installed and active!**

You can now return to the **Obsidian News Desk Setup Wizard** to continue configuration.

Or start creating your first broadcast:
1. Open Obsidian News Desk: http://localhost:8347
2. Click "New Broadcast"
3. Paste your news script
4. Click "Analyze & Generate"

The extension will automatically provide fresh tokens for image generation.

---

## Support

If you encounter issues not covered in this guide:

1. **Check logs:**
   - Extension console: chrome://extensions/ → Click "Service Worker"
   - Backend logs: Check terminal window running `START.bat`

2. **Verify installation:**
   - Run validation script: `npm run test:extension` (from obsidian-news-desk directory)

3. **Report issues:**
   - GitHub: https://github.com/konradschrein-star/pol-production-line/issues
   - Include: Chrome version, OS version, error messages, console logs

---

**Part of Phase 2, Task 2.3: Chrome Extension Packaging**
**Obsidian News Desk Desktop Installer Project**
