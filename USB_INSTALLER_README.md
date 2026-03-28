# Obsidian News Desk - USB Installer Guide

**Portable Video Production System for Windows 11+**

This guide walks you through installing and running Obsidian News Desk on a fresh laptop from a USB drive or ZIP file. Estimated setup time: **15-30 minutes** (excluding video production testing).

---

## What's Included

This package contains a complete automated video production pipeline:

- **Next.js Web Application** - Modern React UI for broadcast management
- **PostgreSQL Database** - Job and scene data storage (via Docker)
- **Redis Queue System** - Background job processing with BullMQ (via Docker)
- **Remotion Video Renderer** - Professional-grade video compilation
- **AI-Powered Script Analysis** - GPT-4, Claude, Gemini, or Groq support
- **Google Whisk Image Generation** - Direct API integration for background images
- **HeyGen Avatar Integration** - Manual workflow for AI presenters

**Output:** High-quality 1920x1080 news broadcast videos with AI-generated visuals, avatars, and scrolling ticker.

---

## System Requirements

### Required Software

| Software | Version | Download Link | Notes |
|----------|---------|---------------|-------|
| **Windows** | 11 or 10 | N/A | Tested on Windows 11 Home 10.0.26200 |
| **Node.js** | 20.0.0+ | [nodejs.org](https://nodejs.org/) | LTS version recommended |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) | Required for Postgres + Redis |

### Hardware Recommendations

- **CPU:** 4+ cores (8+ recommended for faster rendering)
- **RAM:** 8 GB minimum (16 GB recommended)
- **Disk Space:** 10 GB free (5 GB for app, 5 GB for videos)
- **Internet:** Stable connection for API calls

### Network Requirements

The following external services must be accessible:

- `api.openai.com` (or your chosen AI provider)
- `aisandbox-pa.googleapis.com` (Google Whisk API)
- `heygen.com` (manual avatar generation)

**Firewall/Proxy Notes:** If behind a corporate firewall, ensure these domains are whitelisted.

---

## Installation Steps

### Step 1: Install Prerequisites

1. **Install Node.js 20+**
   - Download installer: https://nodejs.org/
   - Choose "LTS" (Long Term Support) version
   - Verify installation:
     ```cmd
     node --version
     ```
     Should output `v20.x.x` or higher

2. **Install Docker Desktop**
   - Download installer: https://www.docker.com/products/docker-desktop/
   - Run installer and follow setup wizard
   - **IMPORTANT:** Start Docker Desktop and wait for it to be ready (whale icon in system tray)
   - Verify installation:
     ```cmd
     docker --version
     docker ps
     ```
     Second command should show an empty container list (no errors)

### Step 2: Copy Files from USB

1. Copy the entire `obsidian-news-desk` folder from USB to your local drive
   - Recommended location: `C:\Projects\obsidian-news-desk\`
   - Or any location of your choice (avoid OneDrive/iCloud paths)

2. Open Command Prompt or PowerShell

3. Navigate to the folder:
   ```cmd
   cd C:\Projects\obsidian-news-desk
   ```

### Step 3: Install Node.js Dependencies

Run the following command to install all required npm packages:

```cmd
npm install
```

**Estimated time:** 2-5 minutes depending on internet speed

**Note:** This downloads ~500MB of dependencies including:
- Next.js framework
- Remotion video rendering engine
- Playwright browser automation
- FFmpeg video encoder (bundled)
- BullMQ queue system
- PostgreSQL and Redis clients

### Step 4: Interactive Setup Wizard

Run the first-run setup wizard to configure API keys:

```cmd
npm run first-run
```

The wizard will guide you through:

1. **AI Provider Selection** - Choose OpenAI, Google, Anthropic, or Groq
2. **OpenAI API Key** - For script analysis (required)
   - Get your key: https://platform.openai.com/api-keys
   - Format: `sk-proj-XXXXXXXXXXXX...`
   - **Validation:** Wizard tests the key immediately via API call

3. **Google Whisk API Token** - For image generation (required)
   - ⚠️ **IMPORTANT:** This token expires every ~1 hour
   - How to get token:
     1. Open https://labs.google.com/whisk in browser
     2. Press **F12** to open Developer Tools
     3. Go to **Network** tab
     4. Generate a test image on Whisk
     5. Find the `generateImage` request
     6. Click on it → **Headers** tab
     7. Scroll to **Request Headers** → find `Authorization`
     8. Copy the value after `Bearer ` (starts with `ya29.`)
   - **Validation:** Wizard tests the token immediately via API call

4. **Optional API Keys** - Google AI, Anthropic Claude, Groq (skip if not using)

5. **Security Keys** - Auto-generated random keys for API authentication

The wizard will create a `.env` file with your configuration.

---

## Starting the System

### Quick Start (Automated)

Double-click `START.bat` or run:

```cmd
START.bat
```

This will:
1. Validate system configuration
2. Start Docker containers (Postgres + Redis)
3. Wait for services to be ready
4. Initialize database schema
5. Start BullMQ workers in separate window
6. Start Next.js dev server in separate window
7. Open web browser to http://localhost:8347

**3 windows will open:**
- **This window** - Main launcher (can close after startup)
- **Workers window** - Background job processing (keep open)
- **Web UI window** - Next.js dev server (keep open)

### Manual Start (Advanced)

If you prefer manual control:

```cmd
# 1. Start Docker services
docker-compose up -d

# 2. Wait for services (30 seconds)
timeout /t 30 /nobreak

# 3. Initialize database
npm run init-db

# 4. Start workers (new terminal window)
npm run workers

# 5. Start web server (new terminal window)
npm run dev
```

Then open http://localhost:8347 in your browser.

---

## Stopping the System

### Quick Stop (Automated)

Double-click `STOP.bat` or run:

```cmd
STOP.bat
```

This will:
1. Stop Next.js dev server
2. Stop BullMQ workers
3. Stop Docker containers (Postgres + Redis)

**Data persists** - Your videos, images, and database will be preserved.

### Manual Stop (Advanced)

```cmd
# 1. Close worker and web server terminal windows (Ctrl+C)

# 2. Stop Docker containers
docker-compose down
```

---

## First Video Test

### Create Your First Broadcast

1. Open http://localhost:8347
2. Click **"New Broadcast"** button
3. Paste a news script (100-500 words recommended)
4. Click **"Submit"**

### Wait for Processing (~20 minutes)

The system will:
1. **Analyze script** (30-60 seconds) - AI extracts scenes and generates image prompts
2. **Generate images** (15-20 minutes) - Whisk API creates 8+ background images
3. **Reach review state** - Job pauses for human QA

**Progress Tracking:**
- Watch the job status badge: `analyzing` → `generating_images` → `review_assets`
- Click on the job to see individual scene progress

### Review Assets (Human QA)

When job reaches `review_assets`:

1. Click on the job to open storyboard editor
2. Review each generated image:
   - ✅ Image matches scene context
   - ✅ No distorted faces or artifacts
   - ✅ Visually consistent style
3. **Regenerate bad images:**
   - Click "Regenerate" button on any scene card
   - Or upload custom image via file picker
4. **Edit ticker headlines** if needed (click to edit)

### Generate Avatar

1. Click **"LAUNCH HEYGEN BROWSER"** button
2. System opens HeyGen in your browser
3. **Manually generate avatar** on HeyGen.com:
   - Paste the avatar script (shown in storyboard)
   - Choose voice/accent
   - Click "Generate"
   - Download `.mp4` file (30-60 MB)

4. **Optimize avatar** (if file >10MB):
   ```cmd
   cd C:\Projects\obsidian-news-desk
   .\scripts\optimize-avatar.sh "C:\Downloads\avatar.mp4" "optimized-avatar.mp4"
   ```
   Output: 640x360, ~2-3MB, web-optimized

5. **Upload avatar:**
   - Drag-drop file onto storyboard upload zone
   - Or click "Upload Avatar" button

### Compile & Render

1. Click **"COMPILE & RENDER"** button
2. Wait for rendering (~2-3 minutes per 60 seconds of video)
3. Download final video from broadcasts table

**Output Location:**
- `C:\Users\<YourName>\ObsidianNewsDesk\videos\`
- Resolution: 1920x1080 (Full HD)
- Format: MP4 (H.264)
- Typical size: 20-50 MB per minute

---

## Whisk Token Refresh (Required Every Hour)

### When to Refresh

Images will fail to generate with errors like:
- `401 Unauthorized`
- `Invalid token`
- Red error badges on scene cards

### How to Refresh

1. Open https://labs.google.com/whisk in browser
2. **F12** → Network tab
3. Generate a test image
4. Find `generateImage` request
5. Copy `Authorization` header (after "Bearer ")
6. Update `.env` file:
   ```
   WHISK_API_TOKEN=ya29.NEW_TOKEN_HERE
   ```
7. Restart workers window (Ctrl+C, then `npm run workers`)

**Automatic Refresh (Experimental):**
- Set `WHISK_TOKEN_REFRESH_ENABLED=true` in `.env`
- Requires Chrome profile with active Google login
- See `docs/WHISK_TOKEN_SETUP.md` for details

---

## Troubleshooting

### Docker Containers Won't Start

**Symptoms:**
- `docker-compose up -d` fails
- "Cannot connect to Docker daemon" error

**Fixes:**
1. Ensure Docker Desktop is running (whale icon in system tray)
2. Check WSL2 backend is enabled:
   - Docker Desktop → Settings → General → Use WSL2 backend
3. Check port conflicts:
   ```cmd
   netstat -ano | findstr :5432
   netstat -ano | findstr :6379
   ```
   If ports are in use, either stop conflicting processes or change ports in `docker-compose.yml`

### Database Connection Failed

**Symptoms:**
- "Connection refused" errors
- Web UI shows "Database unavailable"

**Fixes:**
1. Check Docker containers are running:
   ```cmd
   docker-compose ps
   ```
   Both `postgres` and `redis` should be "Up"

2. Check database logs:
   ```cmd
   docker-compose logs postgres
   ```

3. Reset database:
   ```cmd
   docker-compose down -v
   docker-compose up -d
   npm run init-db
   ```

### Image Generation Fails

**Symptoms:**
- All scenes show "Failed to generate image"
- 401 or 403 errors in workers window

**Fixes:**
1. **Token expired** - Refresh Whisk token (see section above)
2. **Invalid token format** - Ensure token starts with `ya29.`
3. **Content policy violation** - Whisk rejected prompt due to safety filters
   - Edit image prompt to be less specific
   - Avoid mentions of violence, politicians, explicit content
4. **Rate limiting** - Too many requests
   - Wait 5 minutes
   - Reduce concurrency: `IMAGES_CONCURRENCY=2` in `.env`

### Rendering Fails

**Symptoms:**
- Job stuck in `rendering` state
- "Asset not found" errors
- Black screens in output video

**Fixes:**
1. **Missing images** - Regenerate failed scenes before rendering
2. **Avatar file too large** - Optimize avatar with `optimize-avatar.sh` script
3. **Remotion timeout** - Increase timeout:
   ```
   REMOTION_TIMEOUT_MS=600000
   ```
   in `.env`, then restart workers

4. **Check asset paths:**
   ```cmd
   dir "C:\Users\<YourName>\ObsidianNewsDesk\images"
   dir "C:\Users\<YourName>\ObsidianNewsDesk\avatars"
   ```
   Files should exist and be non-zero size

### Web UI Won't Load

**Symptoms:**
- Browser shows "This site can't be reached"
- `http://localhost:8347` doesn't load

**Fixes:**
1. Check Next.js dev server is running (web UI window should show compilation output)
2. Check for port conflicts:
   ```cmd
   netstat -ano | findstr :8347
   ```
3. Try different port:
   ```cmd
   npm run dev -- -p 3000
   ```
   Then open http://localhost:3000

### Workers Not Processing Jobs

**Symptoms:**
- Jobs stuck in `pending` state
- Workers window shows no activity

**Fixes:**
1. Check Redis is running:
   ```cmd
   docker-compose exec redis redis-cli ping
   ```
   Should output `PONG`

2. Restart workers:
   - Close workers window (Ctrl+C)
   - Run `npm run workers`

3. Check worker logs for errors (workers window output)

### FFmpeg Not Found

**Symptoms:**
- "FFmpeg not found" errors during rendering
- `ffmpeg-static` installation fails

**Fixes:**
1. The app bundles FFmpeg via npm, so this should rarely happen
2. If it does, install FFmpeg manually:
   - Download from https://ffmpeg.org/download.html
   - Extract to `C:\ffmpeg\`
   - Add to PATH:
     ```cmd
     setx PATH "%PATH%;C:\ffmpeg\bin"
     ```
   - Restart terminal

---

## Storage Locations

All generated assets are stored locally (no cloud storage):

```
C:\Users\<YourName>\ObsidianNewsDesk\
├── images\           # Scene background images (JPG, ~500KB each)
├── avatars\          # HeyGen avatar MP4 files (2-60MB each)
├── videos\           # Final rendered videos (20-100MB each)
├── footage\          # Stock footage (optional, from Pexels API)
└── temp\             # Temporary render files (auto-cleaned)
```

**Customization:**
- Set `LOCAL_STORAGE_ROOT=D:\MyVideos\` in `.env` to use different drive
- Useful for external SSDs or large secondary drives

**Disk Space Management:**
- Each video project: ~50-200 MB (images + avatar + final video)
- Monitor disk usage: See "Disk Space" widget in web UI
- Clean old projects: Use bulk delete in broadcasts table

---

## Configuration Files

### `.env` - Environment Variables

**Location:** `obsidian-news-desk/.env`

**Never commit this file to git!** It contains your API keys.

**Key Settings:**

```bash
# AI Provider (openai | google | anthropic | groq)
AI_PROVIDER=openai

# API Keys (REQUIRED - Replace placeholders!)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
WHISK_API_TOKEN=ya29.YOUR_TOKEN_HERE

# Storage (Leave blank for auto-detection)
LOCAL_STORAGE_ROOT=

# Performance Tuning
IMAGES_CONCURRENCY=3          # Parallel image generation (2-8)
RENDER_CONCURRENCY=1          # Render one video at a time
REMOTION_TIMEOUT_MS=300000    # 5 minutes
```

**See `.env.example` for full documentation.**

### `docker-compose.yml` - Database Configuration

**Location:** `obsidian-news-desk/docker-compose.yml`

**Default Ports:**
- PostgreSQL: 5432
- Redis: 6379

**Change ports if conflicts:**
```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Use host port 5433 instead
```

Then update `.env`:
```bash
DATABASE_URL=postgresql://obsidian:obsidian_password@localhost:5433/obsidian_news
```

---

## Advanced Usage

### Running Multiple Instances

To run two separate installations (e.g., development + production):

1. Copy entire folder to different location
2. Edit `docker-compose.yml` to use different ports:
   ```yaml
   ports:
     - "5433:5432"  # Postgres
     - "6380:6379"  # Redis
   ```
3. Edit `.env` to use different web port:
   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:8348
   ```
4. Start with `npm run dev -- -p 8348`

### Using Different AI Providers

**Google Gemini:**
```bash
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your_key_here
```

**Anthropic Claude:**
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

**Groq (Fast, Lower Quality):**
```bash
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
```

### Batch Operations

Delete multiple jobs:
1. Check boxes next to jobs in broadcasts table
2. Click "Bulk Actions" → "Delete Selected"

Cancel stuck jobs:
1. Select jobs in `rendering` or `generating_images` state
2. Click "Cancel Selected"

---

## Performance Optimization

### Faster Image Generation

**Reduce scenes** - Edit script to be shorter (fewer scenes = faster)

**Increase concurrency** (if you have good internet):
```bash
IMAGES_CONCURRENCY=5
```

**Use faster AI model** for script analysis:
```bash
AI_PROVIDER=groq  # Fastest, but lower quality prompts
```

### Faster Rendering

**Use better hardware:**
- More CPU cores = faster Remotion rendering
- SSD storage = faster asset loading

**Optimize avatar files** (always do this for files >10MB):
```cmd
.\scripts\optimize-avatar.sh input.mp4 output.mp4
```

**Reduce video duration** - Shorter videos render faster (linear scaling)

### Reduce Disk Usage

**Use lower resolution avatars:**
- Edit `optimize-avatar.sh` to use 480x270 instead of 640x360
- ~50% smaller files, minimal quality loss

**Delete old projects:**
- Bulk delete from web UI
- Or manually delete files from storage folders

**Compress videos** (after downloading):
```cmd
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4
```
Reduces file size by ~30-50% with minimal quality loss

---

## Security Considerations

### API Keys

- **Never commit `.env` to git** - Already in `.gitignore`
- **Never share screenshots** of .env file or web UI showing keys
- **Rotate keys** if accidentally exposed (regenerate on provider website)

### Local Deployment Only

This system is designed for **local use only**:
- No authentication on API endpoints (assumes localhost)
- No HTTPS (uses http://localhost)
- No user management or multi-tenancy

**Do NOT expose to the internet without:**
- Adding proper authentication middleware
- Setting up HTTPS with valid certificates
- Implementing rate limiting and CSRF protection

### Data Privacy

All data stays local:
- Database: Docker volume on your machine
- Assets: Local file system
- No telemetry or cloud backups

**External API Calls:**
- OpenAI/Google/Anthropic - Script text sent for analysis
- Google Whisk - Image prompts sent for generation
- HeyGen - Avatar script (manual, via browser)

---

## Support & Documentation

### Documentation Files

- `CLAUDE.md` - Project overview and architecture
- `docs/WHISK_TOKEN_SETUP.md` - Detailed Whisk token refresh guide
- `docs/BLACK_SCREEN_FIX.md` - Troubleshooting render issues
- `docs/SCENE_BASED_GENERATION.md` - AI prompt engineering details

### Log Files

**Workers:** Check terminal window for real-time logs

**Next.js:** Check web UI terminal window

**Docker:**
```cmd
docker-compose logs postgres
docker-compose logs redis
```

### Getting Help

1. **Check this README** - Most common issues covered
2. **Check documentation** in `docs/` folder
3. **Check GitHub issues** (if repository accessible)
4. **Run diagnostic:**
   ```cmd
   npm run setup
   ```
   Shows all configuration issues

---

## Changelog

### March 28, 2026 - Portability Release

✅ **Removed hardcoded Windows user paths** - Now auto-detects from home directory
✅ **Created interactive setup wizard** - `npm run first-run` guides through API key configuration
✅ **Added Whisk token validation** - Setup script checks token format and warns about expiration
✅ **Created USB installer documentation** - This README file
✅ **Enhanced error messages** - All errors now show actionable fix instructions

**Portability Status:** ✅ System can now run on any Windows 11 laptop with 15-30 min setup

---

## Credits

**Obsidian News Desk** - Automated Video Production Pipeline

**Technologies:**
- Next.js 14 (React framework)
- Remotion 4.0 (video rendering)
- PostgreSQL 17 (database)
- Redis 7 (queue)
- BullMQ 5.0 (job orchestration)
- Google Whisk API (image generation)
- OpenAI GPT-4 (script analysis)

**License:** Private / Proprietary
**Version:** 1.0.0
**Build Date:** March 2026
