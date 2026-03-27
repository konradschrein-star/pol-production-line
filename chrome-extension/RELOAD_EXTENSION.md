# Extension Reload Guide - FIXED VERSION

## The Problem

The extension popup wasn't working properly:
- Buttons didn't respond to clicks
- No error logs visible
- "View Logs" didn't work

## The Fix

I've created a **fixed version** with:
- ✅ Better error handling and debugging
- ✅ Timeout protection (no hanging)
- ✅ Debug info panel showing extension status
- ✅ Clearer error messages
- ✅ Proper background console access

## How to Reload the Extension

### Step 1: Open Extension Manager

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Make sure "Developer mode" is ON (toggle in top-right)

### Step 2: Find the Extension

Look for **"Whisk Token Manager - Production"**

### Step 3: Reload

Click the **circular refresh icon** (↻) on the extension card

### Step 4: Verify It's Working

1. Click the extension icon in your toolbar
2. You should see the popup with:
   - Status indicator (green or red dot)
   - Token display area
   - Debug info at the bottom showing "Extension: OK"

### Step 5: Check for Errors

If the popup shows:
- "Extension: ERROR" → Background script failed to load
- "Background: No Response" → Background script isn't running
- "Backend: Offline" → Application not running (run START.bat)

## Debugging Steps

### If Extension Still Doesn't Work:

1. **Check Service Worker:**
   - Go to `chrome://extensions/`
   - Find "Whisk Token Manager"
   - Look for "service worker" link (it might say "Inspect views")
   - Click it to open the console
   - Look for errors in red

2. **Check Permissions:**
   - Make sure the extension has these permissions:
     - storage
     - tabs
     - webRequest
     - scripting
     - alarms
     - notifications

3. **Common Issues:**

   **Issue: "service worker (inactive)"**
   - Solution: Click the extension icon to wake it up
   - Or click the "service worker" link to activate it

   **Issue: Popup shows blank screen**
   - Solution: Right-click extension icon → "Inspect popup"
   - Check console for errors
   - Look for JavaScript errors

   **Issue: Buttons don't work**
   - Solution: Check popup console (right-click icon → Inspect popup)
   - Look for event listener errors

## Testing the Fixed Extension

After reloading, test these features:

### 1. Status Display
- Should show "Token Active" (green) or "No Token" (red)
- Should show last update time
- Should show backend connection status

### 2. Copy Button
- Click "Copy" button
- Should say "✓ Copied" for 2 seconds
- Paste somewhere to verify token copied

### 3. Show/Hide Button
- Click "Show/Hide"
- Token should alternate between masked (●●●) and full text

### 4. Refresh Now
- Click "🔄 Refresh Now"
- Should say "⏳ Refreshing..." then open Whisk in background
- After ~5 seconds should say "✓ Refreshed"

### 5. Test Backend
- Make sure application is running (START.bat)
- Click "🔗 Test Backend"
- Should say "✓ Connected" (green) if backend is online

### 6. Error Log
- Should show "✓ No errors logged" if everything is working
- If there are errors, they'll appear with timestamps

### 7. Debug Info (Bottom of Popup)
- Should show:
  ```
  Extension: OK
  Background: Connected
  Backend: Connected (or Offline)
  Errors: 0
  ```

## Quick Test Script

Run this in the popup console (right-click icon → Inspect popup):

```javascript
// Test 1: Check Chrome APIs
console.log('Chrome runtime:', chrome.runtime ? 'OK' : 'MISSING');
console.log('Chrome storage:', chrome.storage ? 'OK' : 'MISSING');

// Test 2: Check background connection
chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  console.log('Background response:', response);
  console.log('Has token:', response?.token ? 'YES' : 'NO');
});

// Test 3: Check storage
chrome.storage.local.get(['lastToken'], (data) => {
  console.log('Stored token:', data.lastToken ? 'EXISTS' : 'NONE');
});
```

Expected output:
```
Chrome runtime: OK
Chrome storage: OK
Background response: {hasToken: true, lastUpdate: 1234567890, token: "ya29..."}
Has token: YES
Stored token: EXISTS
```

## If Nothing Works - Nuclear Option

1. Go to `chrome://extensions/`
2. Find "Whisk Token Manager"
3. Click **"Remove"**
4. Close all Chrome windows
5. Reopen Chrome
6. Go to `chrome://extensions/`
7. Enable "Developer mode"
8. Click "Load unpacked"
9. Select the `chrome-extension/` folder
10. Extension should reinstall fresh

## Still Having Issues?

Check these files exist in `chrome-extension/` folder:
- ✅ manifest.json
- ✅ background.js
- ✅ popup-enhanced-fixed.html
- ✅ popup-enhanced-fixed.js
- ✅ icon16.png, icon48.png, icon128.png

If any are missing, the extension won't work properly.
