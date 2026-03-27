# Extension Debugging Guide

## "Initializing Forever" Issue

### Step 1: Check Background Script Errors

1. Go to `chrome://extensions/`
2. Find "Whisk Token Manager"
3. Click **"Inspect views: service worker"** (or "background page")
4. Look for errors in the console

**Common Errors:**
- ❌ `module is not defined` → manifest.json has wrong type
- ❌ `chrome.notifications is not defined` → permission missing
- ❌ Script syntax error → check background.js

### Step 2: Check Popup Console

1. Right-click extension icon → Inspect
2. Open Console tab
3. Look for errors

**What to Look For:**
- Errors when calling `chrome.runtime.sendMessage`
- Timeout errors
- Failed to get status errors

### Step 3: Quick Fix - Remove Module Type

The manifest.json has `"type": "module"` which might be causing issues.

**Fix:**
```json
// In manifest.json, change:
"background": {
  "service_worker": "background.js",
  "type": "module"  // ← REMOVE THIS LINE
}

// To:
"background": {
  "service_worker": "background.js"
}
```

### Step 4: Reload Extension

1. Go to `chrome://extensions/`
2. Click the refresh icon (↻) on the extension
3. Close and reopen the popup

### Step 5: Test Basic Functionality

Open extension console and run:
```javascript
chrome.storage.local.get(['lastToken'], (data) => {
  console.log('Stored token:', data.lastToken ? 'YES' : 'NO');
});
```

## If Still Stuck:

Send me:
1. Screenshot of background script console
2. Screenshot of popup console
3. Any error messages you see
