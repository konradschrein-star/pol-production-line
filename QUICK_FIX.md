# Quick Fix - 5 Minutes

## Problem
Chrome extension refreshes token every **12 hours**, but token expires in **1 hour**.

## Solution
Change refresh interval to **50 minutes** (10 min safety margin).

---

## Step 1: Edit Extension Config

Open file:
```
obsidian-news-desk\chrome-extension\background.js
```

Find line 11:
```javascript
TOKEN_REFRESH_INTERVAL: 12 * 60 * 60 * 1000, // 12 hours
```

Change to:
```javascript
TOKEN_REFRESH_INTERVAL: 50 * 60 * 1000, // 50 minutes
```

Save file.

---

## Step 2: Reload Extension

### Chrome:
1. Open `chrome://extensions/`
2. Find "Whisk Token Manager - Production"
3. Click the **reload** icon (🔄)

### Edge:
1. Open `edge://extensions/`
2. Find "Whisk Token Manager - Production"
3. Click the **reload** icon (🔄)

---

## Step 3: Verify Fix

Run diagnostic:
```bash
cd obsidian-news-desk
npm run diagnose
```

Should show:
```
✅ Extension is working correctly!
   Last Token Update: <recent timestamp>
```

---

## Step 4: Wait 1 Hour & Verify Auto-Refresh

After 55 minutes, run again:
```bash
npm run diagnose
```

Should show new token timestamp (extension refreshed automatically).

---

## Avatar Codec Issue (Separate Problem)

**Why avatars fail:** HeyGen uses H.264 High Profile, Remotion needs Baseline.

**Current workaround:**
```bash
./scripts/optimize-avatar.sh input.mp4 output.mp4
```

**Better solution:** Ask HeyGen if they can export Baseline Profile directly.

---

## Done!

After extension fix, token will auto-refresh every 50 minutes.
No more manual token updates needed.
