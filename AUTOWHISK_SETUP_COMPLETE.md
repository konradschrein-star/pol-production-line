# Auto Whisk Setup - Complete Solution

## Problem Summary
The browser automation was not working due to:
1. Wrong file path (`index.html` instead of `gateway.html`/`sidepanel.html`)
2. Extension not being loaded in Playwright browser
3. Fresh browser profile requiring Google login every time
4. Risk of Google account ban from multiple logins

## Complete Fix

### Changes Made

1. **Extension Loading** (`src/lib/browser/index.ts`)
   - Loads extension from actual Chrome installation
   - Uses `--load-extension` flag with correct path
   - Prevents Playwright from disabling extensions with `ignoreDefaultArgs: ['--disable-extensions']`
   - Uses persistent context at `./playwright-chrome-data` to save cookies

2. **Correct Navigation** (`src/lib/browser/auto-whisk.ts`)
   - Navigates directly to `v7.6.0/sidepanel.html` (generation page)
   - Sets language to English automatically
   - Waits for Google OAuth connection to complete
   - Detects connection timeout and instructs user to log in

3. **Google OAuth Handling** (`scripts/test-autowhisk.ts`)
   - Detects when Google login is required
   - Keeps browser open for 5 minutes for manual login
   - Saves cookies automatically when browser closes
   - No login required on subsequent runs

4. **Download Folder Fix**
   - Changed from "Wisk Downloads" to "Whisk Downloads"

## First-Time Setup

### Step 1: Install Extension
Make sure Auto Whisk is installed in **Chrome** (not Edge):
```
Extension ID: gcgblhgncmhjchllkcpcneeibddhmbbe
Location: C:\Users\{username}\AppData\Local\Google\Chrome\User Data\Default\Extensions\gcgblhgncmhjchllkcpcneeibddhmbbe
```

### Step 2: Run First Test (One-Time Login)

```bash
npm run test:autowhisk
```

**What happens:**
1. Browser opens with Auto Whisk extension loaded
2. Extension navigates to generation page
3. Clicks "Start" button
4. **Google OAuth tab opens** (first run only)
5. Script waits up to 2 minutes for connection

**If OAuth tab opens:**
1. The test will timeout with instructions
2. Browser stays open for 5 minutes
3. **Manually log into Google** in the OAuth tab
4. Complete the authorization
5. Press Ctrl+C to exit when done
6. Cookies are saved to `./playwright-chrome-data`

### Step 3: Run Test Again (No Login Needed)

```bash
npm run test:autowhisk
```

**What happens:**
1. Browser opens with saved cookies
2. NO Google login required
3. Auto Whisk connects automatically
4. Image generation starts
5. Image downloads to `Downloads/Whisk Downloads/`
6. Test completes successfully

## How It Works

### Persistent Context
- Browser profile saved at: `./playwright-chrome-data`
- **Cookies persist between runs**
- **Extensions auto-load on each run**
- **No repeated logins**

### Extension Loading
```javascript
// Extension loaded from actual Chrome installation
const extensionPath = 'C:\\Users\\{username}\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\gcgblhgncmhjchllkcpcneeibddhmbbe\\8.4.3_0';

// Launch with extension
await chromium.launchPersistentContext(userDataDir, {
  args: [
    `--load-extension=${extensionPath}`,
    `--disable-extensions-except=${extensionPath}`,
  ],
  ignoreDefaultArgs: ['--disable-extensions'],
});
```

### Google OAuth Flow
```
First Run:
1. Click Start → OAuth tab opens
2. User logs in manually
3. Cookies saved to ./playwright-chrome-data
4. Browser closed

Subsequent Runs:
1. Click Start → Auto Whisk connects using saved cookies
2. No OAuth needed
3. Image generation starts immediately
```

## Expected Test Output

### First Run (Login Required)
```
🧪 AUTO WHISK TEST
📂 Download folder: C:\Users\...\Downloads\Whisk Downloads
🚀 Launching browser...
✅ Browser launched
🔗 Navigating to Auto Whisk...
✅ Generation page loaded
🎨 Generating test image...
🌐 Setting language to English...
📝 Filling prompts...
✅ Start button clicked
⏳ Waiting for Google connection...
📊 Status: "Connecting..." (2s)
📊 Status: "Connecting..." (4s)
❌ Connection timeout - Google OAuth may be required

📋 FIRST-TIME SETUP INSTRUCTIONS:
1. A Google OAuth tab should have opened in the browser
2. Please LOG IN to your Google account in that tab
3. Complete the authorization process
4. Once logged in, the browser window will remain open
5. Your session will be saved for future runs

⏳ Keeping browser open for 5 minutes...
```

### Subsequent Runs (Logged In)
```
🧪 AUTO WHISK TEST
🚀 Launching browser...
✅ Browser launched
🔗 Navigating to Auto Whisk...
✅ Generation page loaded
🎨 Generating test image...
✅ Start button clicked
⏳ Waiting for Google connection...
📊 Status: "Connecting..." (2s)
✅ Connected to Google
✅ Final status: "Generating (1/1)"
⏳ Waiting for image download...
✅ Image downloaded: C:\Users\...\Downloads\Whisk Downloads\image.png

🎉 TEST PASSED!
📸 Generated image saved to: C:\Users\...\Downloads\Whisk Downloads\image.png
```

## Troubleshooting

### "Extension not found"
- Make sure Auto Whisk is installed in Chrome (not Edge)
- Check extension ID in `.env` matches installed extension

### "Connection timeout" every time
- Delete `./playwright-chrome-data` folder
- Run test again and log in manually
- Make sure you complete the full OAuth flow

### Browser keeps opening fresh (no saved cookies)
- Check that `playwright-chrome-data` folder exists after first run
- Make sure browser closes properly (don't force kill)
- Try deleting the folder and logging in again

### Images not downloading
- Check download folder exists: `C:\Users\{username}\Downloads\Whisk Downloads`
- Verify browser download settings don't prompt for location
- Check Auto Whisk extension settings for download folder

### "Google account login attempts" warning
- This should ONLY happen on first run
- If happening every time, cookies aren't being saved
- Delete `playwright-chrome-data` and try again
- Make sure to let browser close properly after login

## Integration with Production

Once testing works, the same approach applies to the production worker:

**Image Worker** (`src/lib/queue/workers/images.worker.ts`)
- Uses same BrowserManager with persistent context
- Loads extension from Chrome installation
- Cookies persist across all image generation jobs
- **Only one login needed for entire pipeline**

**Important:**
- First job will require manual Google login
- Keep browser open during first run to complete OAuth
- All subsequent jobs use saved cookies
- No repeated logins, no Google rate limiting

## Benefits

✅ **One-time login** - Google credentials saved permanently
✅ **No account bans** - Reuses same session for all requests
✅ **Faster execution** - No OAuth delay on subsequent runs
✅ **Production ready** - Same approach works for automated pipeline
✅ **User-friendly** - Clear instructions for first-time setup

## Next Steps

1. ✅ Test with `npm run test:autowhisk`
2. ✅ Log in manually on first run
3. ✅ Verify subsequent runs don't require login
4. ✅ Test image download completes successfully
5. → Integrate with production workers
6. → Run full pipeline end-to-end test
