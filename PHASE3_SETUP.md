# Phase 3: Playwright Image Generator - Setup Guide

## Prerequisites

Before running Phase 3, you need to install the Auto Whisk Chrome extension in your browser.

### Step 1: Install Auto Whisk Extension

**Option A: Chrome/Edge (Recommended)**
1. Open Chrome or Edge browser
2. Visit: https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/gedfnhdibkfgacmkbjgpfjihacalnlpn
3. Click "Add to Chrome" (works for Edge too)
4. Extension ID: `gedfnhdibkfgacmkbjgpfjihacalnlpn`

**Option B: Manual Installation (If needed)**
1. Download the extension from the Chrome Web Store
2. Extract to a folder
3. Open `chrome://extensions/` or `edge://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked"
6. Select the extension folder

### Step 2: Configure Google Account

Auto Whisk uses Google's Imagen AI which requires authentication:

1. Open the Auto Whisk extension
2. Click on the extension icon in browser toolbar
3. Sign in with your Google account
4. Grant necessary permissions

**Important:** The first time you run the automation, it may need manual login. After that, Playwright will save the session in `./playwright-data/` directory.

### Step 3: Verify Downloads Folder

Auto Whisk saves generated images to:
```
<UserDownloads>/Wisk Downloads/
```

For example:
- Windows: `C:\Users\<username>\Downloads\Wisk Downloads\`
- macOS: `/Users/<username>/Downloads/Wisk Downloads/`
- Linux: `/home/<username>/Downloads/Wisk Downloads/`

The folder will be created automatically when the first image is generated.

### Step 4: Update R2 Public URL

In `.env`, update the R2_PUBLIC_URL:
```bash
R2_PUBLIC_URL=https://your-actual-r2-domain.r2.dev
```

To find your R2 public URL:
1. Go to Cloudflare Dashboard
2. Navigate to R2 → Your Bucket
3. Settings → Public Access
4. Enable public access if not already enabled
5. Copy the public URL

## How Phase 3 Works

### Architecture

```
┌─────────────────┐
│  Images Worker  │
│  (BullMQ)       │
└────────┬────────┘
         │
         ├─► 1. Launch Browser (Playwright)
         │
         ├─► 2. Navigate to Auto Whisk Extension
         │
         ├─► 3. Fill Prompt + Start Generation
         │
         ├─► 4. Monitor Downloads Folder (chokidar)
         │      └─► Watch: ~/Downloads/Wisk Downloads/
         │
         ├─► 5. Upload to R2 (S3 SDK)
         │      └─► URL: R2_PUBLIC_URL/scenes/{sceneId}.png
         │
         └─► 6. Update Database
             └─► scene.image_url = R2 URL
             └─► scene.generation_status = 'completed'
```

### Key Components

**1. Browser Manager** (`src/lib/browser/index.ts`)
- Launches Chromium with Playwright
- Manages browser context and pages
- Handles cleanup

**2. Auto Whisk Automation** (`src/lib/browser/auto-whisk.ts`)
- Navigates to extension page (`chrome-extension://{id}/index.html`)
- Fills prompt textarea
- Sets image count and aspect ratio
- Clicks "Start" button
- Waits for generation completion

**3. Folder Monitor** (`src/lib/browser/folder-monitor.ts`)
- Uses `chokidar` to watch downloads folder
- Detects new .png/.jpg files
- Emits events when files appear
- Handles race conditions

**4. R2 Upload** (`src/lib/storage/r2.ts`)
- Uploads images to Cloudflare R2
- Uses AWS S3 SDK (R2 is S3-compatible)
- Returns public URL

**5. Images Worker** (`src/lib/queue/workers/images.worker.ts`)
- Processes one scene at a time (concurrency: 1)
- Orchestrates the full pipeline
- Updates database throughout process
- Advances job to `review_assets` when all scenes complete

### Process Flow

For each scene:
1. Status: `pending` → `generating`
2. Launch browser + start folder monitor
3. Navigate to Auto Whisk
4. Trigger image generation
5. Wait for file to appear in Downloads
6. Upload file to R2
7. Update database with image URL
8. Status: `generating` → `completed`
9. Clean up: delete local file, close browser

When all scenes complete:
- Job status: `generating_images` → `review_assets`
- Human can now review and approve/edit images

## Testing Phase 3

### Prerequisites
- Phase 2 must be working (run `./test-phase2.sh` first)
- Auto Whisk extension installed
- Google account signed in to extension
- R2 public URL configured

### Manual Test

**Terminal 1: Start Workers**
```bash
cd obsidian-news-desk
npx tsx scripts/start-workers.ts
```

**Terminal 2: Start Next.js**
```bash
npm run dev
```

**Terminal 3: Create a Job**
```bash
# Create job via API (this will trigger Phase 2)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "raw_script": "Breaking news: Federal Reserve announces major policy shift. Chair Powell signals potential pause in rate hikes. Inflation has cooled to 3.2 percent from 9.1 percent peak. Markets rally on the news with S&P 500 gaining 2.3 percent."
  }'

# Get the job ID from response, then monitor progress
```

**Terminal 4: Monitor Database**
```bash
# Replace JOB_ID with actual ID
JOB_ID="your-job-id-here"

# Watch scenes table
watch -n 2 "docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \"SELECT scene_order, generation_status, LEFT(image_url, 50) as image_url FROM news_scenes WHERE job_id = '$JOB_ID' ORDER BY scene_order;\""
```

### Expected Behavior

**Phase 2 (AI Analysis):**
- Job created: status = `pending`
- AI analyzes script: status = `analyzing`
- Scenes created in database (4-8 scenes)
- Scenes queued: status = `generating_images`

**Phase 3 (Image Generation):**
- For each scene:
  - Browser window opens (visible)
  - Navigates to Auto Whisk extension
  - Fills prompt automatically
  - Clicks "Start" button
  - Waits for image generation
  - Image appears in Downloads folder
  - Uploads to R2
  - Updates database with URL
  - Browser closes
- When all complete: job status = `review_assets`

### Troubleshooting

**Issue: Extension not found**
- Ensure Auto Whisk is installed
- Check extension ID in `.env` matches: `gedfnhdibkfgacmkbjgpfjihacalnlpn`
- Try opening `chrome://extensions/` to verify

**Issue: Google authentication required**
- Open Auto Whisk extension manually
- Sign in with Google account
- Run automation again (session will be saved)

**Issue: Download not detected**
- Check Downloads folder path is correct
- Ensure Auto Whisk is configured to save to "Wisk Downloads" subfolder
- Check folder permissions

**Issue: R2 upload fails**
- Verify R2 credentials in `.env`
- Check R2_PUBLIC_URL is correct
- Test R2 connection manually

**Issue: Browser crashes or hangs**
- Reduce concurrency (already set to 1)
- Increase timeouts in worker
- Check system resources (RAM, CPU)

**Issue: Images wrong aspect ratio**
- Check Auto Whisk settings in extension
- Verify aspect ratio parameter in code (should be "16:9")

## Performance

- **Single scene:** ~30-60 seconds (depending on Auto Whisk/Imagen speed)
- **Typical job (6 scenes):** ~5-10 minutes total (sequential processing)
- **Concurrency:** Set to 1 (one browser instance at a time)
- **Rate limiting:** 10 jobs per minute (configurable)

## Security Notes

- Browser automation requires non-headless mode (headless=false)
- Playwright saves session data in `./playwright-data/`
- Add `playwright-data/` to `.gitignore` (already done)
- R2 credentials stored in `.env` (git-ignored)
- Google account used with Auto Whisk has access to Imagen AI

## Next Steps

After Phase 3 is working:
1. **Phase 4:** Build Storyboard Bridge API (human review interface)
2. **Phase 5:** Implement Remotion video rendering
3. **Phase 6:** Convert frontend UI mockups
4. **Phase 7:** End-to-end testing

## Files Created in Phase 3

```
src/lib/browser/
├── index.ts              # Browser manager
├── auto-whisk.ts         # Auto Whisk automation
└── folder-monitor.ts     # Download folder monitoring

src/lib/storage/
└── r2.ts                 # R2 upload client

src/lib/queue/workers/
└── images.worker.ts      # Images worker (UPDATED)
```
