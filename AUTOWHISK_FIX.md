# Auto Whisk Browser Extension Fix

## Problem
The browser automation was opening the Auto Whisk **gateway/launcher page** (version selector) instead of the actual **generation page** (sidepanel with prompt input and controls).

## Solution
Updated the navigation flow to:
1. Navigate to the gateway page (`chrome-extension://{id}/index.html`)
2. Click on the **Version 7.6.0 (API)** button (`id="btn-v760"`)
3. Wait for the generation page to load

## Changes Made

### 1. Updated Navigation (`src/lib/browser/auto-whisk.ts`)
**Function:** `navigateToAutoWhisk()`
- Added automatic click on Version 7.6.0 (API) button after gateway page loads
- Added proper wait for generation page to load

### 2. Updated Element Selectors (`src/lib/browser/auto-whisk.ts`)
**Function:** `generateImages()`
- Changed to use exact element IDs from the generation page HTML:
  - `#prompts` - Textarea for image prompts
  - `#aspectRatioSelector` - Dropdown for aspect ratio (16:9, 4:3, etc.)
  - `#imageCountSelector` - Dropdown for image count (1-4)
  - `#mainActionButton` - Start button
- Added aspect ratio mapping:
  - `16:9` → `IMAGE_ASPECT_RATIO_LANDSCAPE`
  - `1:1` → `IMAGE_ASPECT_RATIO_SQUARE`
  - `9:16` → `IMAGE_ASPECT_RATIO_PORTRAIT`
  - `4:3` → `IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE`
  - `3:4` → `IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR`

### 3. Updated Status Detection (`src/lib/browser/auto-whisk.ts`)
**Function:** `waitForGenerationComplete()`
- Changed to check `#liveStatus` element by ID
- Added multi-language support (English "Ready", Vietnamese "Sẵn sàng")
- Added status logging for better debugging

### 4. Created Test Script (`scripts/test-autowhisk.ts`)
Standalone test that:
- Launches browser with Auto Whisk extension
- Navigates to generation page
- Generates a single test image with prompt: *"A beautiful sunset over mountains, digital art style, vibrant colors"*
- Monitors download folder
- Reports success/failure

## How to Test

### Prerequisites
1. Auto Whisk extension installed in Chrome/Edge
2. Extension ID set in `.env`:
   ```
   AUTO_WHISK_EXTENSION_ID=your-extension-id-here
   ```
3. Logged into Google account in the browser profile

### Run the Test

```bash
npm run test:autowhisk
```

### Expected Output

```
🧪 ========================================
🧪 AUTO WHISK TEST
🧪 ========================================

📂 Download folder: C:\Users\...\Downloads\Wisk Downloads
👀 Folder monitor started

🚀 Launching browser...
✅ Browser launched

🔗 Navigating to Auto Whisk...
🔘 Clicking Version 7.6.0 (API) button...
✅ Generation page loaded

⏳ Starting file monitor...
🎨 Generating test image...
   Prompt: "A beautiful sunset over mountains, digital art style, vibrant colors"
   Aspect ratio: 16:9
   Image count: 1

✅ Generation triggered

⏳ Waiting for image download...
✅ Image downloaded: C:\Users\...\Downloads\Wisk Downloads\image.png

⏳ Waiting for generation to complete...
✅ Generation complete

🎉 ========================================
🎉 TEST PASSED!
🎉 ========================================

📸 Generated image saved to: C:\Users\...\Downloads\Wisk Downloads\image.png
```

## What Happens During Image Generation

1. **Browser launches** in non-headless mode (required for extensions)
2. **Gateway page opens** at `chrome-extension://{id}/index.html`
3. **Version 7.6.0 button is clicked** automatically
4. **Generation page loads** (the sidepanel interface)
5. **Prompts are filled** into `#prompts` textarea (one per line)
6. **Aspect ratio is set** to 16:9 via `#aspectRatioSelector`
7. **Image count is set** to 1 via `#imageCountSelector`
8. **Start button is clicked** (`#mainActionButton`)
9. **Download folder is monitored** for new images
10. **Status is polled** until `#liveStatus` shows "Ready"
11. **Image is saved** to local storage and database updated

## Workflow Integration

This fix applies to:
- **Node 3 (Local Asset Generator)** in `src/lib/queue/workers/images.worker.ts`
- Processes scenes from `queue_images` BullMQ queue
- Generates images via Auto Whisk browser automation
- Saves to local storage (not R2 in current config)
- Updates database with local file paths

## Troubleshooting

### Test fails at "Could not find Version 7.6.0 (API) button"
- The extension gateway page structure may have changed
- Check if button ID is still `btn-v760` in the extension HTML
- Try opening the extension manually to verify the gateway page loads

### Test fails at "Could not find prompt textarea"
- The generation page structure may have changed
- Check if textarea ID is still `prompts` in the extension HTML
- Verify that clicking the version button successfully loads the generation page

### Test fails at "Google login required"
- You need to log into Google manually in the browser profile
- The browser will stay open when login is required
- Log in and then restart the test

### Images not downloading
- Check that the download folder exists: `C:\Users\{username}\Downloads\Wisk Downloads`
- Verify browser download settings don't prompt for location
- Check extension settings for download folder configuration

## Next Steps

After successful test:
1. Run image generation workers: `npm run workers`
2. Create a new broadcast job via the UI
3. Monitor the image generation queue
4. Images will be generated one at a time with 60-second delays (ban prevention)
5. Review generated assets in the Storyboard Editor when job reaches `review_assets` state

## Reference Files

- **Extension HTML**: See `Browser extension HTML.md` and `Browser Extension Generation page.md` in project root
- **Worker Code**: `src/lib/queue/workers/images.worker.ts`
- **Browser Manager**: `src/lib/browser/index.ts`
- **Auto Whisk Module**: `src/lib/browser/auto-whisk.ts`
