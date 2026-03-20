# Obsidian News Desk v1.0 - Updated Implementation Plan

**Target Users:** You + 1 friend (2 total)
**Platform:** Windows 11 only
**Distribution:** GitHub Releases (private repo initially)
**Scope:** Personal use, no account system, no cloud storage

---

## Key Changes from Original Plan

### 1. Local Storage (No R2)

**Old:** Upload videos/images to Cloudflare R2
**New:** Store everything in local folder

**Implementation:**
```typescript
// Storage directory structure
C:\Users\konra\ObsidianNewsDesk\
├── data\                    # PostgreSQL data
├── videos\                  # Final rendered videos
│   ├── job-abc123.mp4
│   └── job-xyz789.mp4
├── images\                  # Generated scene images
│   ├── scene-001.png
│   └── scene-002.png
├── avatars\                 # Uploaded HeyGen MP4s
│   ├── job-abc123.mp4
│   └── job-xyz789.mp4
├── temp\                    # Temporary files (auto-cleanup)
└── logs\                    # Error logs
    ├── error.log
    └── worker.log
```

**Database Changes:**
```sql
-- Update schema to use local paths instead of URLs
ALTER TABLE news_jobs
  ALTER COLUMN avatar_mp4_url TYPE TEXT,
  ALTER COLUMN final_video_url TYPE TEXT;

-- Example values:
-- OLD: https://pub-xxx.r2.dev/avatars/job-123.mp4
-- NEW: C:\Users\konra\ObsidianNewsDesk\avatars\job-123.mp4
```

**Code Changes:**
```typescript
// Old R2 upload
async function uploadToR2(file: Buffer, key: string): Promise<string> {
  const s3 = new S3Client({ ... });
  await s3.putObject({ Bucket, Key: key, Body: file });
  return `https://pub-xxx.r2.dev/${key}`;
}

// New local file save
async function saveToLocal(file: Buffer, filename: string): Promise<string> {
  const baseDir = path.join(app.getPath('userData'), 'ObsidianNewsDesk');
  const videoDir = path.join(baseDir, 'videos');

  // Ensure directory exists
  await fs.ensureDir(videoDir);

  const filePath = path.join(videoDir, filename);
  await fs.writeFile(filePath, file);

  return filePath; // Return absolute path
}
```

**Frontend Changes:**
```typescript
// Old: Videos served from R2 URL
<video src={job.final_video_url} controls />

// New: Videos served via local file protocol (Electron)
// Electron main process exposes file:// protocol handler
<video src={`obsidian-file://${job.final_video_url}`} controls />

// Or serve via local HTTP server on localhost:3000/files/...
<video src={`/api/files?path=${encodeURIComponent(job.final_video_url)}`} controls />
```

**Benefits:**
- ✅ No R2 costs
- ✅ Faster (no upload time)
- ✅ Works offline
- ✅ No API key management for R2
- ✅ Direct file access (no download needed)

**Considerations:**
- ⚠️ Disk space management (user's responsibility)
- ⚠️ No automatic cleanup (add manual delete button)
- ⚠️ No cloud backup (user must backup folder manually)

---

### 2. GitHub Releases Auto-Updater

**How it works:**
1. You push new version tag to GitHub: `git tag v1.0.1 && git push --tags`
2. GitHub Actions builds Electron app and creates Release
3. User's app checks GitHub Releases API for new version
4. Downloads delta update (only changed files, ~5MB vs 150MB)
5. Prompts user to restart

**Implementation:**

**package.json:**
```json
{
  "name": "obsidian-news-desk",
  "version": "1.0.0",
  "main": "electron/main.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/obsidian-news-desk.git"
  },
  "build": {
    "appId": "com.obsidian.newsdesk",
    "productName": "Obsidian News Desk",
    "win": {
      "target": "nsis",
      "publish": {
        "provider": "github",
        "owner": "yourusername",
        "repo": "obsidian-news-desk"
      }
    }
  }
}
```

**electron/main.js:**
```javascript
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

// Check for updates on app startup
app.on('ready', () => {
  createWindow();

  // Check for updates (only in production)
  if (!app.isPackaged) return;

  autoUpdater.checkForUpdatesAndNotify();

  // Check every 6 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 6 * 60 * 60 * 1000);
});

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  // Show notification in UI
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  // Prompt user to restart
  mainWindow.webContents.send('update-ready', info);
});

// Handle restart request from renderer
ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});
```

**GitHub Actions (.github/workflows/release.yml):**
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags (v1.0.0, v1.0.1, etc.)

jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build Next.js
        run: npm run build

      - name: Build Electron app
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: dist/*.exe
```

**Release Process:**
```bash
# 1. Update version in package.json
npm version patch  # 1.0.0 → 1.0.1

# 2. Commit changes
git commit -am "Release v1.0.1"

# 3. Create and push tag
git tag v1.0.1
git push && git push --tags

# 4. GitHub Actions builds and creates release automatically

# 5. Users get update notification within 6 hours (or on next app start)
```

**No Code Signing (Windows SmartScreen):**
- Users will see: "Windows protected your PC - Unknown publisher"
- They click "More info" → "Run anyway"
- Not ideal but acceptable for 2-user personal use
- Future: Get certificate when going public

---

### 3. AutoWhisk & Google Wisk Research

**Critical Questions:**

**Q1: Does AutoWhisk need persistent cookies/login?**
- Need to test: Does AutoWhisk work without Google account login?
- If yes: No cookie persistence needed
- If no: Use Playwright's `storageState` to persist login

**Q2: What are Google Wisk rate limits?**
- Research needed: Google Wisk API documentation
- Unknown: Requests per minute? Per hour? Per day?
- Unknown: Is it per IP, per account, or per session?

**Q3: How does AutoWhisk communicate with Google Wisk?**
- Hypothesis: AutoWhisk is a browser extension that automates the Google Wisk web UI
- Need to inspect: Chrome DevTools → Network tab while AutoWhisk generates images
- Look for: API endpoints, request headers, authentication tokens

**Q4: Can we parallelize without multiple tabs?**
- Current plan: Launch 5-10 Chrome tabs, each with AutoWhisk
- Risk: If Google Wisk sees 10 concurrent requests from same IP → ban
- Alternative: Sequential generation (slower but safer)

**Ban Mitigation Strategies:**

**Strategy 1: Rate Limiting (Conservative)**
```typescript
// Generate scenes one at a time with delay
const DELAY_BETWEEN_GENERATIONS = 10000; // 10 seconds

for (const scene of scenes) {
  await generateSceneImage(scene);
  await delay(DELAY_BETWEEN_GENERATIONS);
}

// Pros: Unlikely to trigger rate limits
// Cons: 10 scenes × 30s each = 5 minutes (slower)
```

**Strategy 2: Batch Processing with Delays**
```typescript
// Process in batches of 3, with delay between batches
const BATCH_SIZE = 3;
const DELAY_BETWEEN_BATCHES = 30000; // 30 seconds

for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
  const batch = scenes.slice(i, i + BATCH_SIZE);

  // Generate batch in parallel
  await Promise.all(batch.map(scene => generateSceneImage(scene)));

  // Wait before next batch
  if (i + BATCH_SIZE < scenes.length) {
    await delay(DELAY_BETWEEN_BATCHES);
  }
}

// Pros: Faster than sequential (3 at a time)
// Cons: Still has some ban risk
```

**Strategy 3: Adaptive Rate Limiting**
```typescript
// Start aggressive, back off if errors detected
let concurrency = 5;
let delayBetweenBatches = 10000;

async function generateWithBackoff(scenes: Scene[]) {
  for (let i = 0; i < scenes.length; i += concurrency) {
    const batch = scenes.slice(i, i + concurrency);

    try {
      await Promise.all(batch.map(scene => generateSceneImage(scene)));

      // Success - maybe speed up
      if (concurrency < 10) concurrency++;
      if (delayBetweenBatches > 5000) delayBetweenBatches -= 1000;

    } catch (error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        // Rate limited - slow down
        concurrency = Math.max(1, Math.floor(concurrency / 2));
        delayBetweenBatches += 10000;

        // Retry this batch
        i -= concurrency;
      } else {
        throw error;
      }
    }

    await delay(delayBetweenBatches);
  }
}

// Pros: Automatically adapts to rate limits
// Cons: Complex logic
```

**Strategy 4: Distributed Across Time**
```typescript
// Spread generations over longer time period
const TOTAL_TIME_BUDGET = 10 * 60 * 1000; // 10 minutes
const interval = TOTAL_TIME_BUDGET / scenes.length;

for (const scene of scenes) {
  await generateSceneImage(scene);
  await delay(interval); // e.g., 10 mins / 10 scenes = 1 min per scene
}

// Pros: Very low ban risk (looks like human usage)
// Cons: Takes 10+ minutes
```

**Recommendation: Start with Strategy 2 (Batch with Delays)**
- 3 images at a time, 30s delay between batches
- Monitor for errors
- If rate limited, fall back to Strategy 1

**Detection of Rate Limiting:**
```typescript
async function generateSceneImage(scene: Scene): Promise<string> {
  try {
    const imageUrl = await autoWhiskGenerate(scene.image_prompt);
    return imageUrl;
  } catch (error) {
    // Check for rate limit indicators
    if (
      error.message.includes('rate limit') ||
      error.message.includes('too many requests') ||
      error.message.includes('429') ||
      error.message.includes('quota exceeded')
    ) {
      // Log rate limit event
      logRateLimit({ scene: scene.id, timestamp: Date.now() });

      // Update UI: "Slowing down to avoid rate limits..."
      notifyUser('Rate limit detected, slowing down generation...');

      // Exponential backoff
      const backoffDelay = Math.min(60000, 5000 * Math.pow(2, retryAttempt));
      await delay(backoffDelay);

      // Retry
      return generateSceneImage(scene);
    }

    throw error;
  }
}
```

**Research Action Items:**
1. ✅ Install AutoWhisk extension
2. ✅ Monitor Chrome DevTools Network tab during generation
3. ✅ Document API endpoints, headers, request format
4. ✅ Test: Generate 10 images in quick succession → does it fail?
5. ✅ Test: Generate 1 image per minute for 10 minutes → does it work?
6. ✅ Determine: Is login required? Which Google account?
7. ✅ Test: Persistent context saves cookies correctly

---

### 4. Cookies & Persistent Login

**Playwright Persistent Context:**
```typescript
const userDataDir = path.join(app.getPath('userData'), 'browser-data');

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  executablePath: browserPath,
  args: [`--load-extension=${extensionPath}`]
});

// First run: User logs into Google manually
// Subsequent runs: Cookies are restored, user stays logged in
```

**Storage State (Alternative):**
```typescript
// After first login, save storage state
const storageState = await context.storageState();
await fs.writeFile('storage-state.json', JSON.stringify(storageState));

// On subsequent runs, restore storage state
const context = await chromium.launchPersistentContext(userDataDir, {
  storageState: 'storage-state.json',
  // ...
});

// Pros: Explicit control over what's saved
// Cons: More manual management
```

**Do we need cookies?**
- ✅ **If AutoWhisk requires Google account login:** Yes, use persistent context
- ❌ **If AutoWhisk works without login:** No cookies needed

**Action:** Test AutoWhisk in incognito mode (no cookies) → does it work?

---

### 5. No Account System (v1)

**Implications:**
- No user registration/login UI
- No multi-user support
- No permissions system
- Config stored locally (no server-side storage)
- Each user has their own database (no shared jobs)

**Settings Page Simplification:**
```typescript
// v1: Simple local config
interface Config {
  ai_provider: 'claude' | 'google' | 'groq';
  anthropic_key?: string;
  google_key?: string;
  groq_key?: string;
  browser_path: string;
  extension_path: string;
}

// Save to: C:\Users\konra\AppData\Roaming\ObsidianNewsDesk\config.json

// v2 (future): Multi-user with cloud sync
interface User {
  id: string;
  email: string;
  api_keys: { ... };
  jobs: Job[];
}
```

**No authentication means:**
- ✅ Simpler codebase
- ✅ Faster development
- ✅ No security concerns (local app)
- ✅ No server costs
- ❌ No cloud sync between machines
- ❌ No sharing jobs with friend (each has own database)

**Workaround for sharing:**
- Export/import jobs as JSON
- Or: Share entire database file
- Or: v2 adds cloud sync

---

### 6. Windows 11 Only (Simplified Testing)

**Simplifications:**
- No Windows 10 testing needed
- No Windows 7/8 support
- Assume latest browser versions
- Assume WSL2 available (if needed for Docker)

**System Requirements (Installer Info):**
```
Minimum Requirements:
- Windows 11 (64-bit)
- 8GB RAM
- 10GB free disk space
- Chrome or Edge browser
- Internet connection (for AI APIs and image generation)

Recommended:
- 16GB RAM
- 50GB free disk space (for video storage)
- SSD (faster rendering)
```

---

## Updated Architecture

### Electron App Structure

```
obsidian-news-desk/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Bridge between main and renderer
│   └── workers/
│       ├── start-workers.js # BullMQ worker processes
│       └── database.js      # Embedded PostgreSQL
│
├── src/                     # Next.js app (unchanged)
│   ├── app/
│   ├── components/
│   └── lib/
│
├── public/
│   └── electron/
│       ├── postgresql/      # Embedded PostgreSQL binaries
│       └── redis/           # Embedded Redis binaries
│
└── dist/                    # Build output
    └── ObsidianNewsDesk-Setup.exe
```

### Data Flow (Updated for Local Storage)

```
1. User creates job
   ↓
2. Analyze worker (LLM) → generates scenes
   ↓
3. Image worker → AutoWhisk generates images
   ↓
4. Save to: C:\Users\konra\ObsidianNewsDesk\images\scene-{id}.png
   ↓
5. Database: UPDATE scenes SET image_url = 'C:\...\scene-{id}.png'
   ↓
6. User reviews scenes → uploads avatar MP4
   ↓
7. Save to: C:\Users\konra\ObsidianNewsDesk\avatars\job-{id}.mp4
   ↓
8. Render worker → Remotion renders video
   ↓
9. Save to: C:\Users\konra\ObsidianNewsDesk\videos\job-{id}.mp4
   ↓
10. User downloads video (just copy from local folder)
```

---

## Installation Flow (Simplified)

**No Admin Rights Required:**

```
1. User downloads ObsidianNewsDesk-Setup.exe from GitHub Releases
2. Runs installer (NSIS)
3. Installer extracts to: C:\Users\konra\AppData\Local\ObsidianNewsDesk\
   ├── app.asar              # Electron + Next.js bundle
   ├── postgresql/           # Embedded database
   ├── redis/                # Embedded queue
   └── node_modules/
4. Creates desktop shortcut
5. First run: Setup wizard
   a. Enter AI API keys
   b. Auto-detect browser
   c. Select AutoWhisk extension path
6. Initialize database (run schema.sql)
7. Start PostgreSQL + Redis (as child processes, not services)
8. Launch app
```

**No Windows Services (Simplified):**
- PostgreSQL runs as child process (not Windows service)
- Redis runs as child process
- When app closes, databases stop
- Faster startup (no service management)
- No admin rights needed

**Process Management:**
```javascript
// electron/main.js
const { spawn } = require('child_process');
const path = require('path');

let postgresProcess;
let redisProcess;

async function startDatabases() {
  const appPath = app.getPath('userData');

  // Start PostgreSQL
  postgresProcess = spawn(
    path.join(appPath, 'postgresql', 'bin', 'pg_ctl.exe'),
    ['start', '-D', path.join(appPath, 'data')],
    { detached: false }
  );

  // Start Redis
  redisProcess = spawn(
    path.join(appPath, 'redis', 'redis-server.exe'),
    [path.join(appPath, 'redis.conf')],
    { detached: false }
  );
}

// Graceful shutdown
app.on('before-quit', async () => {
  if (postgresProcess) postgresProcess.kill();
  if (redisProcess) redisProcess.kill();
});
```

---

## Error Reporting (Local Logs)

**No Sentry/Cloud Logging:**
- All errors logged to local files
- User can share logs manually if they need help

**Log Structure:**
```
C:\Users\konra\ObsidianNewsDesk\logs\
├── error.log         # All errors
├── worker.log        # Worker activity
├── database.log      # Database queries (optional, debug mode)
└── browser.log       # Playwright automation logs
```

**Winston Logging:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'logs', 'worker.log')
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Usage
logger.error('Image generation failed', { sceneId, error: error.message });
logger.info('Job created', { jobId, status: 'analyzing' });
```

**UI for Viewing Logs:**
- Settings page → "View Logs" button
- Opens log file in default text editor
- Or: Show last 100 lines in modal

---

## Updated Priorities for v1

### Phase 1: Core Functionality (Week 1)
1. ✅ Replace R2 with local file storage
2. ✅ Fix all file path handling (use path.join)
3. ✅ Test AutoWhisk rate limits (research)
4. ✅ Implement batch processing with delays
5. ✅ Add error logging (Winston)

### Phase 2: Electron Wrapper (Week 2)
1. ✅ Create Electron main process
2. ✅ Embed Next.js app
3. ✅ Bundle PostgreSQL + Redis (portable builds)
4. ✅ Start databases as child processes
5. ✅ Create system tray icon

### Phase 3: Installer (Week 3)
1. ✅ electron-builder configuration
2. ✅ NSIS installer script
3. ✅ First-run wizard (API keys, browser detection)
4. ✅ Desktop shortcut creation
5. ✅ Test on fresh Windows 11 VM

### Phase 4: Auto-Updater (Week 4)
1. ✅ electron-updater setup
2. ✅ GitHub Actions workflow
3. ✅ Update notification UI
4. ✅ Test update process (v1.0.0 → v1.0.1)

### Phase 5: Testing & Release (Week 5)
1. ✅ Full end-to-end testing
2. ✅ Error handling scenarios
3. ✅ AutoWhisk rate limit testing
4. ✅ Create first GitHub Release
5. ✅ Share with friend for beta testing

---

## Open Questions (Need Answers)

### Critical (Block Development)
1. **AutoWhisk Login:** Does it require Google account login? Test in incognito.
2. **Google Wisk Rate Limits:** What are the actual limits? Test with rapid generations.
3. **Cookie Persistence:** Does Playwright persistent context keep cookies correctly?

### Important (Affect Architecture)
4. **Parallel Generation Risk:** Can we run 5-10 tabs safely? Or will Google ban us?
5. **Extension Permissions:** Does AutoWhisk need special permissions? Does it work in all browser profiles?

### Nice-to-Have (Can Defer)
6. **Database Backup:** Should we auto-backup database periodically?
7. **Disk Space Warnings:** Alert user when < 10GB free space?
8. **Video Compression:** Should we compress videos to save space?

---

## Next Actions (DO NOT CODE YET)

1. **Research AutoWhisk:**
   - Install extension in Chrome/Edge
   - Generate 10 images rapidly → check for errors
   - Monitor DevTools Network tab → document API calls
   - Test incognito mode → does it need login?
   - Test persistent context → do cookies persist?

2. **Plan Mode Audit:**
   - Enter plan mode
   - Ask me to audit: "AutoWhisk integration strategy"
   - I'll create detailed implementation plan with code examples

3. **Prototype Local Storage:**
   - Create simple test: Save file to local folder
   - Serve file via Electron file:// protocol
   - Verify video player works with local paths

4. **Test GitHub Actions:**
   - Create simple workflow
   - Push tag → verify release created
   - Download artifact → verify installer works

---

## Summary of Changes

| Aspect | Original Plan | Updated v1 Plan |
|--------|---------------|-----------------|
| **Storage** | Cloudflare R2 | Local filesystem |
| **Updates** | Manual download | GitHub Releases auto-updater |
| **Code Signing** | Required ($300) | Skip (show warning) |
| **Database** | PostgreSQL service | PostgreSQL child process |
| **Redis** | Redis service | Redis child process |
| **Users** | Multi-user with accounts | Single-user (2 instances) |
| **Platform** | Windows 10/11 | Windows 11 only |
| **Admin Rights** | Required for services | Not required |
| **Cloud Features** | R2, authentication | None (all local) |
| **Telemetry** | Sentry cloud logging | Local log files |

**Development Time Estimate:**
- Phase 1: 1 week
- Phase 2: 1 week
- Phase 3: 1 week
- Phase 4: 1 week
- Phase 5: 1 week
- **Total: 5 weeks** (vs 8-10 weeks for original plan)

---

**Status:** ✅ Ready for AutoWhisk research and plan mode audit

**Next:** Research AutoWhisk internals, then enter plan mode for detailed implementation planning.
