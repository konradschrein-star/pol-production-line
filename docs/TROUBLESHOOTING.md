# Obsidian News Desk - Troubleshooting Guide

**Version:** 1.1.0
**Last Updated:** March 27, 2026

This guide provides solutions to common issues you may encounter when using Obsidian News Desk. Issues are organized by category for easy navigation.

---

## Table of Contents

1. [How to Use This Guide](#how-to-use-this-guide)
2. [Installation Issues](#installation-issues)
3. [Service Startup Problems](#service-startup-problems)
4. [Runtime Errors](#runtime-errors)
5. [Image Generation Issues](#image-generation-issues)
6. [Avatar Problems](#avatar-problems)
7. [Rendering Failures](#rendering-failures)
8. [Performance Issues](#performance-issues)
9. [Network & API Errors](#network--api-errors)
10. [Getting Help](#getting-help)

---

## How to Use This Guide

### Finding Your Issue

**By symptom:**
1. Scroll through section headings
2. Find description matching your problem
3. Follow numbered fixes in order

**By error message:**
- Use `Ctrl+F` (Find in Page)
- Search for exact error text
- Jump to relevant section

### Quick Links to Common Issues

Most users encounter one of these:

- [Images stuck on "Generating..."](#images-stuck-on-generating) ← **Most common!**
- [Docker is not running](#docker-not-running)
- [System Offline in Dashboard](#system-offline-in-dashboard)
- [Avatar upload fails](#avatar-upload-fails)
- [Video has black screens](#video-has-black-screens)

---

## Installation Issues

### Installer Fails to Start

**Symptoms:**
- Double-clicking installer does nothing
- No windows appear
- Installer opens then immediately closes

**Causes & Fixes:**

#### Fix 1: Windows SmartScreen Blocking
**Most common cause for new users**

1. Look for Windows notification (bottom-right)
2. Click "More info" link
3. Click "Run anyway" button
4. Retry installer

**Alternative:**
- Right-click installer → Properties
- Check "Unblock" checkbox at bottom
- Click "OK" → Apply
- Double-click installer again

#### Fix 2: Insufficient Permissions

1. Right-click `ObsidianNewsDesk-Setup.exe`
2. Click "Run as administrator"
3. Enter admin password if prompted
4. Follow installation wizard

#### Fix 3: Corrupt Download

1. Check file size:
   - Right-click installer → Properties
   - Size should be 150-200 MB
   - If much smaller (< 100 MB), re-download

2. Re-download from official source:
   - https://github.com/konradschrein-star/pol-production-line/releases/latest
   - Click `ObsidianNewsDesk-Setup.exe`
   - Wait for full download

3. Verify download location:
   - Check Downloads folder
   - Don't run from temp folders
   - Copy to Desktop if needed

#### Fix 4: Antivirus Blocking

1. Temporarily disable antivirus:
   - Check system tray for antivirus icon
   - Right-click → Pause protection
   - Duration: 10 minutes

2. Run installer while antivirus paused

3. Add exception to antivirus:
   - Settings → Exceptions/Exclusions
   - Add: `C:\Program Files\Obsidian News Desk\`
   - Re-enable antivirus

---

### Docker Not Detected

**Symptoms:**
- Wizard Page 2 shows "Docker not found"
- Red X next to Docker requirement
- Can't proceed past Docker check page

**Causes & Fixes:**

#### Fix 1: Docker Desktop Not Started

1. Look for whale icon 🐳 in system tray (bottom-right)

**If icon not present:**
- Press Windows key
- Type "Docker Desktop"
- Click to launch
- Wait 30-60 seconds for startup

**If icon present but animating:**
- Docker is still starting
- Wait until icon stops moving (becomes solid)
- Return to wizard → Click "Check Docker" again

**If icon present and solid:**
- Docker is running! Click "Check Docker" in wizard
- If still fails, see Fix 2 below

#### Fix 2: WSL 2 Not Installed

**Windows Subsystem for Linux 2 required for Docker**

1. Open PowerShell as Administrator:
   - Press Windows key
   - Type "PowerShell"
   - Right-click → "Run as administrator"

2. Install WSL 2:
   ```powershell
   wsl --install
   ```

3. Wait for installation (~5 minutes)

4. Restart computer when prompted

5. After restart:
   - Start Docker Desktop
   - Return to installer wizard

**Alternative (if above fails):**
1. Download WSL 2 kernel update manually:
   - https://aka.ms/wsl2kernel
   - Run `wsl_update_x64.msi`
2. Restart Docker Desktop
3. Retry wizard

#### Fix 3: Virtualization Disabled in BIOS

**Symptoms:** Docker shows "Hardware assisted virtualization and data execution protection must be enabled in the BIOS"

1. Restart computer
2. Enter BIOS setup:
   - Press F2, F12, Del, or Esc during boot (varies by manufacturer)
   - Check screen for "Press X to enter setup" message

3. Find virtualization setting:
   - Look for: "Intel VT-x", "AMD-V", "Virtualization Technology", or "SVM Mode"
   - Usually in: Advanced → CPU Configuration

4. Enable it:
   - Set to "Enabled"
   - Save and exit BIOS (usually F10)

5. Boot Windows normally

6. Start Docker Desktop

**Warning:** BIOS interfaces vary by manufacturer. If unsure, search for: "[your computer model] enable virtualization"

#### Fix 4: Docker Not in PATH

1. Open Command Prompt:
   - Press Windows key
   - Type "cmd"
   - Press Enter

2. Test Docker:
   ```cmd
   docker --version
   ```

**If it says "not recognized":**
- Docker installation incomplete
- Uninstall Docker Desktop:
  - Settings → Apps → Docker Desktop → Uninstall
- Re-download from https://www.docker.com/products/docker-desktop/
- Reinstall with default settings
- Restart computer

---

### Extension Installation Problems

**Symptoms:**
- Chrome extension won't load
- "Failed to load extension" error
- Extension appears but doesn't work

**Causes & Fixes:**

#### Fix 1: Wrong Browser

**Extension only works in:**
- ✅ Google Chrome
- ✅ Microsoft Edge (Chromium-based)

**NOT supported:**
- ❌ Firefox
- ❌ Safari
- ❌ Internet Explorer
- ❌ Old Edge (pre-Chromium)

**Solution:**
- Download Chrome: https://www.google.com/chrome/
- Or use Edge (comes with Windows 10/11)

#### Fix 2: Developer Mode Not Enabled

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Look for toggle in top-right: "Developer mode"
4. **Turn it ON** (should be blue/enabled)
5. Retry loading extension:
   - Click "Load unpacked"
   - Browse to: `C:\Program Files\Obsidian News Desk\resources\chrome-extension\`
   - Click "Select Folder"

#### Fix 3: Extension Path Wrong

**Default installation path:**
```
C:\Program Files\Obsidian News Desk\resources\chrome-extension\
```

**If you installed to custom location:**
1. Find your installation folder (check desktop shortcut properties)
2. Navigate to `\resources\chrome-extension\` subdirectory
3. Load that folder in Chrome

**Verify correct folder:**
- Open the folder
- You should see files:
  - `manifest.json`
  - `background.js`
  - `content.js`
  - `icons\` folder

#### Fix 4: Permissions Error

1. Navigate to extension folder in File Explorer
2. Right-click folder → Properties
3. Click "Security" tab
4. Click "Edit" button
5. Click "Add"
6. Enter your Windows username
7. Click "Check Names" → OK
8. Select your username → Check "Full Control"
9. Click OK → Apply
10. Retry loading extension in Chrome

#### Fix 5: Manifest V3 Warning

**Chrome may show:** "Manifest version 2 is deprecated"

- This is a warning, not an error
- Extension still works
- Click "OK" or "Dismiss"
- Extension will load and function normally

---

### Permission Errors on Windows

**Symptoms:**
- "Access denied" during installation
- "Permission denied" when creating folders
- Can't write to storage location

**Causes & Fixes:**

#### Fix 1: Run Installer as Administrator

1. Close installer if running
2. Right-click `ObsidianNewsDesk-Setup.exe`
3. Click "Run as administrator"
4. Click "Yes" when UAC prompt appears
5. Complete wizard

#### Fix 2: Choose Different Storage Location

**Problem:** Program Files folder is restricted

1. In Wizard Page 3 (Storage Location):
2. Click "Browse..."
3. Choose user folder instead:
   - **Recommended:** `C:\Users\YourName\ObsidianNewsDesk`
   - **Also good:** `D:\ObsidianNewsDesk` (if you have D: drive)
4. **Avoid:** `C:\Program Files\` or `C:\Windows\`
5. Click "Next"

#### Fix 3: Disable Antivirus Temporarily

1. Find antivirus icon in system tray
2. Right-click → Pause/Disable protection
3. Set duration: 10-15 minutes
4. Run installer
5. After successful install:
   - Re-enable antivirus
   - Add exception: `C:\Program Files\Obsidian News Desk\`
   - Add exception: Storage folder (e.g., `C:\Users\YourName\ObsidianNewsDesk\`)

---

### Port Conflicts

**Symptoms:**
- "Port 8347 already in use"
- "Port 5432 already in use"
- "Port 6379 already in use"
- Services won't start

**Causes & Fixes:**

#### Fix 1: Identify What's Using Ports

1. Open Command Prompt as Administrator
2. Check each port:
   ```cmd
   netstat -ano | findstr :8347
   netstat -ano | findstr :5432
   netstat -ano | findstr :6379
   ```
3. Note the PID (last column number)

#### Fix 2: Kill Conflicting Process

1. Open Task Manager (Ctrl+Shift+Esc)
2. Click "Details" tab
3. Find process with matching PID
4. Right-click → "End task"
5. Confirm

**Or use command line:**
```cmd
taskkill /PID <PID_NUMBER> /F
```

#### Fix 3: Common Culprits

**Port 8347 (Web server):**
- Another web server running (Apache, IIS, another Next.js app)
- Close or stop that server
- Or change Obsidian's port in Settings → Advanced

**Port 5432 (PostgreSQL):**
- Another PostgreSQL database installed
- Stop it: Services → PostgreSQL → Stop
- Or change Obsidian's database port

**Port 6379 (Redis):**
- Another Redis instance
- Stop it or change Obsidian's Redis port

#### Fix 4: Restart Computer (Nuclear Option)

- Save all work
- Restart Windows
- All ports will be released
- Start Obsidian News Desk first (before other apps)

---

## Service Startup Problems

### System Tray Icon Missing

**Symptoms:**
- Can't find Obsidian News Desk icon in system tray
- App installed but not visible

**Causes & Fixes:**

#### Fix 1: Check Hidden Icons

1. Click up arrow (^) in system tray
2. Look for Obsidian News Desk icon (filmstrip/camera)
3. If found: Drag icon to main tray area

#### Fix 2: App Not Running

1. Press Windows key
2. Type "Obsidian News Desk"
3. Click to launch
4. Icon should appear in system tray

#### Fix 3: Auto-Start Disabled

1. Right-click system tray icon
2. Click "Settings"
3. Check "Start automatically when I sign in"
4. Click "Save"

### Services Won't Start (Red Icon)

**Symptoms:**
- System tray icon is red
- "System Offline" message in dashboard
- http://localhost:8347 won't load

**Causes & Fixes:**

#### Fix 1: Start Docker Desktop

1. Look for Docker whale icon 🐳 in system tray
2. If not present:
   - Press Windows key
   - Type "Docker Desktop"
   - Click to launch
3. Wait 60 seconds for Docker to start fully
4. Right-click Obsidian icon → "Start All Services"

#### Fix 2: Restart All Services

1. Right-click Obsidian News Desk icon
2. Click "Stop All Services"
3. Wait 10 seconds
4. Click "Start All Services"
5. Wait 15-20 seconds
6. Check if icon turns green

#### Fix 3: Check Docker Containers

1. Open Docker Desktop
2. Click "Containers" tab
3. Look for:
   - `obsidian_postgres` (should be running)
   - `obsidian_redis` (should be running)

**If containers not running:**
- Click "Start" button next to each
- Wait 30 seconds
- Restart Obsidian services

**If containers don't exist:**
- Reinstall application
- Or run database init: Settings → Advanced → "Initialize Database"

#### Fix 4: Check Logs for Errors

1. Right-click system tray icon → "View Logs"
2. Log folder opens
3. Open `workers.log` (most recent)
4. Look for errors (lines starting with "ERROR" or "FATAL")

**Common errors:**
- "ECONNREFUSED" → Database not running (see Fix 1 & 3)
- "Invalid API key" → Re-enter in Settings → API Configuration
- "Out of memory" → Close other apps, restart services

### Database Connection Failures

**Symptoms:**
- "Connection to database failed"
- "ECONNREFUSED" errors in logs
- Jobs won't create

**Causes & Fixes:**

#### Fix 1: Verify PostgreSQL Container Running

1. Open Docker Desktop
2. Containers tab
3. Find `obsidian_postgres`
4. Status should be "Running" (green)

**If stopped:**
- Click "Start" button
- Wait 30 seconds
- Test again

**If missing:**
- Go to Settings → Advanced
- Click "Initialize Database"
- Wait for completion

#### Fix 2: Check Database Credentials

1. Right-click system tray → "Settings"
2. Click "Advanced" tab
3. Verify database settings:
   - **Host:** localhost
   - **Port:** 5432
   - **Database:** obsidian_news
   - **User:** obsidian
   - **Password:** obsidian_password

4. Click "Test Connection"

**If test fails:**
- Reset to defaults
- Restart services

#### Fix 3: Recreate Database

**WARNING: This deletes all existing jobs and scenes!**

1. Open Command Prompt
2. Navigate to installation directory:
   ```cmd
   cd "C:\Program Files\Obsidian News Desk"
   ```
3. Stop containers:
   ```cmd
   docker-compose down -v
   ```
4. Start containers:
   ```cmd
   docker-compose up -d
   ```
5. Initialize database:
   ```cmd
   npm run init-db
   ```

### Worker Process Crashes

**Symptoms:**
- Jobs stuck in "pending" forever
- Queue doesn't process
- Logs show worker restarts

**Causes & Fixes:**

#### Fix 1: Restart Workers

1. Right-click system tray icon
2. Click "Stop All Services"
3. Wait 10 seconds
4. Click "Start All Services"
5. Monitor logs for errors

#### Fix 2: Check for Out of Memory

1. Open Task Manager (Ctrl+Shift+Esc)
2. Click "Performance" tab
3. Check Memory usage

**If >90% used:**
- Close other applications
- Restart Obsidian services
- Consider upgrading RAM

#### Fix 3: Check API Key Validity

Invalid API keys can crash workers:

1. Open Settings → API Configuration
2. Click "Validate Key" for your AI provider
3. If validation fails:
   - Re-enter key (copy fresh from provider)
   - Save
   - Restart services

---

## Runtime Errors

### "System Offline" in Dashboard

**Symptoms:**
- Dashboard shows red "System Offline" indicator
- Page loads but shows error banner
- Can't create new broadcasts

**Causes & Fixes:**

#### Fix 1: Check System Tray Icon

1. Look at system tray (bottom-right)
2. Find Obsidian News Desk icon

**If red:**
- Right-click → "Start All Services"
- Wait 15-20 seconds
- Refresh dashboard (F5)

**If not present:**
- Launch "Obsidian News Desk" from Start menu
- Wait for icon to appear
- Check if green

#### Fix 2: Check Docker

1. Look for Docker whale icon 🐳
2. If not running:
   - Launch "Docker Desktop" from Start menu
   - Wait 60 seconds
   - Restart Obsidian services

#### Fix 3: Restart Browser

1. Close all Obsidian News Desk tabs
2. Close browser completely
3. Wait 10 seconds
4. Reopen browser
5. Go to: http://localhost:8347

#### Fix 4: Check Firewall

Windows Firewall may block localhost connections:

1. Windows Security → Firewall & network protection
2. Click "Allow an app through firewall"
3. Click "Change settings" button
4. Find "Node.js" or "Obsidian News Desk"
5. Check both "Private" and "Public"
6. Click OK
7. Restart services

### Lost Connection to Server

**Symptoms:**
- Dashboard was working, then shows error
- "Connection lost" message
- Jobs disappear from list

**Causes & Fixes:**

#### Fix 1: Check if Services Crashed

1. Look at system tray icon
2. If red → Services stopped
3. Right-click → "View Logs"
4. Check `workers.log` for crash reason

**Common crash reasons:**
- Out of memory → Close other apps
- Invalid API request → Check API keys
- Database disconnected → Restart Docker

#### Fix 2: Refresh Page

1. Press F5 (or Ctrl+F5 for hard refresh)
2. Wait 5 seconds
3. Check if connection restores

#### Fix 3: Restart Services

1. Right-click system tray icon
2. "Stop All Services"
3. Wait 10 seconds
4. "Start All Services"
5. Wait 20 seconds
6. Refresh dashboard

### Queue Paused Unexpectedly

**Symptoms:**
- Yellow banner: "Queue is paused"
- Jobs not processing
- Everything else works

**Causes & Fixes:**

#### Fix 1: Resume Queue

1. Click yellow banner in dashboard
2. Click "Resume Queue" button
3. Queue should restart immediately

**Or:**
1. Go to Settings → Queue
2. Click "Resume All Queues"

#### Fix 2: Check Worker Status

1. Right-click system tray → "View Logs"
2. Open `workers.log`
3. Look for "Queue paused" message
4. Check reason (usually in next line)

**Common reasons:**
- Too many failed jobs → Clear failed jobs → Resume
- Rate limiting triggered → Wait 5 minutes → Resume
- Out of disk space → Free up space → Resume

---

## Image Generation Issues

### Images Stuck on "Generating..."

**This is the #1 most common issue!**

**Symptoms:**
- Scene cards show "Generating..." for >5 minutes
- Spinner keeps spinning
- No progress

**Causes & Fixes:**

#### Fix 1: Whisk Token Expired (MOST COMMON)

**Whisk tokens expire after ~1 hour**

**Automatic fix (recommended):**
1. Make sure Chrome extension is installed (see Installation Guide)
2. Open https://labs.google.com/whisk in Chrome
3. Generate any test image (upload photo or use example)
4. Extension captures token automatically
5. Return to Obsidian dashboard
6. Click "Resume Queue" if paused
7. Images should start generating

**Manual fix (if extension failed):**
1. Open https://labs.google.com/whisk in Chrome
2. Press F12 (opens Developer Tools)
3. Click "Network" tab
4. Keep Dev Tools open
5. Generate a test image on Whisk
6. Find request named "generateImage" in Network tab
7. Click it
8. Click "Headers" tab (right side)
9. Scroll down to "Request Headers"
10. Find "Authorization:" line
11. Copy everything AFTER "Bearer " (starts with `ya29.a0...`)
12. In Obsidian: Settings → API → Whisk Token
13. Paste token
14. Click "Save"
15. Queue should auto-resume

[See Installation Guide Tutorial Page 3 for detailed screenshots]

#### Fix 2: Extension Not Capturing Token

1. Open Chrome
2. Click Extensions icon (puzzle piece)
3. Find "Auto Whisk Token Capture"
4. Click extension icon

**If shows "Token status: Not captured":**
- Visit https://labs.google.com/whisk
- Generate a test image
- Click extension icon again
- Should show "Token active" (green)

**If extension not in list:**
- Reinstall extension (see Installation Guide)

#### Fix 3: Queue Actually Paused

1. Check for yellow "Queue Paused" banner
2. If present: Click "Resume Queue"
3. If not present: Go to Settings → Queue → "Resume All Queues"

#### Fix 4: Check Worker Logs

1. Right-click system tray → "View Logs"
2. Open `workers.log`
3. Look for errors related to image generation

**Common errors:**
- "401 Unauthorized" → Whisk token expired (see Fix 1)
- "429 Too Many Requests" → Rate limited (wait 5 minutes)
- "Content policy violation" → Prompt rejected (see Fix 5)

#### Fix 5: Content Policy Violation

**Whisk rejects certain prompts**

1. Go to broadcast storyboard editor
2. Find scene that failed
3. Click scene card
4. Click "Edit Prompt"
5. Remove potentially sensitive content:
   - Violence, weapons
   - Political figures (depending on context)
   - Controversial topics
   - Copyrighted characters
6. Click "Save"
7. Click "Regenerate" (R key)

### "Content Policy Violation" Errors

**Symptoms:**
- Scene shows error: "Content policy violation"
- Red badge on scene card
- Image won't generate

**Causes & Fixes:**

#### Fix 1: Sanitize Prompt

**Whisk AI has content restrictions**

**Prohibited content:**
- Graphic violence or gore
- Weapons or military equipment (sometimes)
- Political figures in negative context
- Copyrighted characters (Disney, Marvel, etc.)
- Adult content or nudity
- Hate speech or offensive material

**Solution:**
1. Click failed scene
2. Edit image prompt
3. Replace specific terms with generic:
   - "President giving speech" → "Political leader at podium"
   - "Soldier with rifle" → "Security personnel"
   - "Protest with signs" → "Public gathering"
4. Save and regenerate

#### Fix 2: System Auto-Sanitization

**Obsidian has built-in sanitization (v1.0+)**

- System automatically retries with sanitized prompt
- Check if scene eventually completes
- If still fails after 3 attempts, manual edit needed

#### Fix 3: Use Custom Image

**If prompt can't be sanitized:**
1. Find appropriate image manually:
   - Google Images (search for similar content)
   - Stock photo sites (Unsplash, Pexels)
2. Download image (16:9 aspect ratio recommended)
3. In Obsidian: Select scene → Press `U` (upload)
4. Choose image file
5. Image replaces generated one

### "Rate Limited" (429 Errors)

**Symptoms:**
- Scene shows "Rate limited by Whisk API"
- Multiple images fail at once
- Error: "Too many requests"

**Causes & Fixes:**

#### Fix 1: Wait for Rate Limit Reset

**Whisk API has request limits**

1. Don't take any action
2. Wait 5-10 minutes
3. Queue will auto-resume
4. Failed scenes will retry automatically

**Limit details:**
- Free tier: ~60 requests/minute (Google API quota)
- Resets every minute
- System automatically spaces requests

#### Fix 2: Reduce Concurrent Workers

**If rate limiting happens frequently:**

1. Settings → Advanced → Workers
2. Reduce "Image worker concurrency"
3. Default: 8 workers
4. Try: 4 workers (slower but less likely to hit limit)
5. Save
6. Restart services

#### Fix 3: Check Google Cloud Quota

**If you're a heavy user:**

1. Go to: https://console.cloud.google.com/
2. Select your project (used for Whisk API)
3. Navigation → IAM & Admin → Quotas
4. Search for "Imagen API"
5. Check quota usage

**If quota exceeded:**
- Request quota increase (free, but takes 1-2 days)
- Or wait until quota resets (usually daily)

### Images Wrong Style/Quality

**Symptoms:**
- Images generated but look wrong
- Don't match expected style
- Low quality or blurry

**Causes & Fixes:**

#### Fix 1: Use Reference Images

**Provide style consistency**

1. Find 1-3 example images with desired style
2. Go to broadcast storyboard
3. Click scene → "Edit Scene"
4. Click "Reference Images" tab
5. Upload:
   - **Style reference:** Overall aesthetic (color, lighting, mood)
   - **Subject reference:** What main subject should look like
   - **Scene reference:** Composition example
6. Save
7. Regenerate scene (R key)

#### Fix 2: Edit Image Prompt

**Make prompt more specific:**

1. Click scene → "Edit Prompt"
2. Add descriptive details:
   - ❌ Bad: "City skyline"
   - ✅ Good: "Modern city skyline at sunset, golden hour lighting, photorealistic, cinematic, high detail"
3. Add style keywords:
   - "photorealistic"
   - "professional photography"
   - "cinematic lighting"
   - "8k quality"
4. Save → Regenerate

#### Fix 3: Create Style Preset

**For consistent style across videos:**

1. Go to Settings → Style Presets
2. Click "Create New Preset"
3. Name it (e.g., "Cinematic News")
4. Configure:
   - Upload reference images
   - Set prompt modifiers (automatically added to all prompts)
   - Choose image model (Imagen 3.0 vs 3.5)
5. Save preset
6. Use preset when creating new broadcasts

#### Fix 4: Manual Upload

**If generation keeps producing bad results:**

1. Find better image manually (stock photos, Google Images)
2. Select scene
3. Press `U` (upload custom image)
4. Choose file (JPG or PNG, 16:9 recommended)
5. Image replaces generated one

### Black or Broken Images

**Symptoms:**
- Image appears black or corrupted
- Scene shows "Error loading image"
- Broken image icon

**Causes & Fixes:**

#### Fix 1: Regenerate Scene

1. Select failed scene
2. Press `R` (regenerate)
3. Wait for new image (~60 seconds)

#### Fix 2: Check Image File

1. Right-click system tray → "View Logs"
2. Find error for specific scene
3. Note file path (e.g., `C:\...\images\abc123.jpg`)
4. Open File Explorer → Navigate to that path
5. Try opening image in photo viewer

**If file doesn't exist:**
- Database has wrong path
- Re-generate scene (Fix 1)

**If file is 0 bytes or corrupt:**
- Delete file
- Re-generate scene

#### Fix 3: Clear Image Cache

1. Navigate to storage folder:
   - Default: `C:\Users\YourName\ObsidianNewsDesk\images\`
2. Delete all `.jpg` files
3. In Obsidian: Select all scenes
4. Click "Regenerate All"
5. Wait for fresh generation

#### Fix 4: Check Disk Space

1. Press Windows + E (File Explorer)
2. Right-click C: drive → Properties
3. Check "Free space"

**If <5GB free:**
- Free up disk space (delete old files, empty Recycle Bin)
- Move storage location (Settings → Storage → Browse)
- Clear temp files (Windows Disk Cleanup)

---

## Avatar Problems

### Avatar Upload Fails

**Symptoms:**
- "Upload failed" error message
- File won't upload (progress bar stuck)
- "Invalid file format" error

**Causes & Fixes:**

#### Fix 1: Check File Format

**Obsidian only accepts MP4**

1. Check file extension:
   - ✅ `.mp4` → OK
   - ❌ `.mov` → Need to convert
   - ❌ `.avi` → Need to convert
   - ❌ `.mkv` → Need to convert

**To convert:**
- Use HandBrake (free): https://handbrake.fr/
- Or re-export from HeyGen:
  1. Go to HeyGen.com
  2. Find your avatar video
  3. Click "Download" → Select "MP4" format
  4. Download again

#### Fix 2: Re-export from HeyGen

**HeyGen sometimes gives corrupt files**

1. Go to: https://heygen.com/app/videos
2. Find your avatar video in list
3. Click "..." (three dots) → "Re-export"
4. Wait 30-60 seconds
5. Download fresh copy
6. Upload to Obsidian

#### Fix 3: Check File Isn't Corrupted

1. Try playing file in VLC media player (free):
   - Download: https://www.videolan.org/
   - Open avatar MP4 in VLC
   - If plays correctly → File is OK
   - If shows errors → File is corrupt (re-export)

#### Fix 4: Check File Size

**Very large files (>100MB) may timeout**

1. Right-click avatar file → Properties
2. Check "Size"

**If >50MB:**
- Optimize using HandBrake:
  1. Open HandBrake
  2. Load avatar file
  3. Set dimensions: 640x360
  4. Set preset: "Fast 1080p30"
  5. Start encode
  6. Output will be ~2-5MB
- Or use included script:
  ```cmd
  cd "C:\Program Files\Obsidian News Desk\scripts"
  .\optimize-avatar.sh "C:\path\to\large-avatar.mp4" "optimized.mp4"
  ```

### Avatar Out of Sync with Audio

**Symptoms:**
- Lip movements don't match audio
- Avatar starts late or early
- Audio plays but avatar frozen

**Causes & Fixes:**

#### Fix 1: Check Audio Sample Rate

**HeyGen avatars must be 48kHz**

1. Right-click avatar MP4 → Properties
2. Click "Details" tab
3. Look for "Audio sample rate"
4. Should say "48kHz"

**If different (44.1kHz, 22kHz, etc.):**
- Re-export from HeyGen (should auto-fix)
- Or convert using FFmpeg:
  ```cmd
  ffmpeg -i input.mp4 -ar 48000 -c:v copy output.mp4
  ```

#### Fix 2: Re-generate Avatar on HeyGen

**Sometimes HeyGen produces bad sync:**

1. Go back to HeyGen.com
2. Create avatar again with same script
3. Try different avatar (face model)
4. Download new version
5. Upload to Obsidian

### HeyGen Generation Fails

**Symptoms:**
- HeyGen shows error during generation
- "Generation failed" message
- Avatar won't generate

**Causes & Fixes:**

#### Fix 1: Check HeyGen Credits

1. Go to: https://heygen.com/app/account
2. Check "Credits" remaining
3. Free tier: 3 minutes/month

**If out of credits:**
- Wait until next month (free tier resets)
- Or upgrade to paid plan ($24/month)

#### Fix 2: Script Too Long

**Free tier limits:**
- Max: 3 minutes of generated video per month
- Single video: Usually <2 minutes

**Solution:**
- Shorten script
- Or split into multiple shorter videos
- Or upgrade to paid plan

#### Fix 3: Choose Different Avatar

**Some avatars have issues:**

1. Try different avatar:
   - Click avatar selector
   - Choose from "Professional" category
   - Avoid: Custom avatars (require paid plan)
2. Generate again

#### Fix 4: Clear Script Formatting

**HeyGen sometimes fails on special characters:**

1. Copy script to Notepad
2. Remove:
   - Emojis
   - Special punctuation (curly quotes, em dashes)
   - Line breaks (make it one paragraph)
3. Copy cleaned script
4. Paste into HeyGen
5. Generate

### Avatar Video Quality Issues

**Symptoms:**
- Avatar looks pixelated or blurry
- Low resolution
- Compression artifacts

**Causes & Fixes:**

#### Fix 1: Download Highest Quality from HeyGen

1. Go to HeyGen.com → Videos
2. Find your video
3. Click "Download"
4. Select **"1080p"** quality (not 720p or 480p)
5. Wait for full download
6. Upload to Obsidian

#### Fix 2: Don't Over-Optimize

**Optimization can reduce quality**

- Only optimize if file >50MB
- Use settings:
  - Resolution: 640x360 minimum
  - Bitrate: 1500 kbps minimum
  - Quality: "High" or "Very High"

#### Fix 3: Check Remotion Render Settings

**Obsidian defaults are good, but you can adjust:**

1. Settings → Advanced → Rendering
2. Adjust:
   - Avatar video quality: "High" (default)
   - Scale mode: "Lanczos" (highest quality)
3. Render again

---

## Rendering Failures

### Render Stuck on "Rendering..."

**Symptoms:**
- Status shows "rendering" for >10 minutes
- No progress indicator movement
- Final video never appears

**Causes & Fixes:**

#### Fix 1: Check Worker Logs

1. Right-click system tray → "View Logs"
2. Open `workers.log` (sort by date, newest first)
3. Look for errors

**Common errors:**
- "Timeout" → See Fix 2
- "Asset not found" → See next section
- "Out of memory" → See Performance Issues section

#### Fix 2: Avatar File Too Large

**Large avatars cause Remotion timeout**

**Check avatar size:**
1. Navigate to storage folder → `avatars\`
2. Right-click your avatar file → Properties
3. Check "Size"

**If >10MB:**
- Optimize avatar (see Avatar Problems section)
- Re-upload optimized version
- Retry render

#### Fix 3: Cancel and Retry

1. Click job in dashboard
2. Click "Cancel Render" button
3. Wait for status → "review_assets"
4. Click "COMPILE & RENDER" again

#### Fix 4: Check Disk Space

**Rendering needs temp space:**

1. Check free space on C: drive
2. Need at least 5GB free

**If low:**
- Delete old videos from storage folder
- Clear Windows temp files (Disk Cleanup)
- Move storage to different drive (Settings → Storage)

### "Asset Not Found" Errors

**Symptoms:**
- Render fails with "Asset not found"
- Missing image or avatar error
- Specific scene ID mentioned

**Causes & Fixes:**

#### Fix 1: Validate Assets Before Render

**This should happen automatically (v1.1+)**

1. Check worker logs for validation messages:
   ```
   [ASSET-PREP] Starting validation...
   Scene 1: ✅ File exists
   ```

**If validation shows missing files:**
- Re-generate missing scenes
- Or upload custom images

#### Fix 2: Check Image Files Exist

1. Navigate to storage folder: `images\`
2. Look for `.jpg` files matching scene IDs
3. Open each image to verify not corrupted

**If any missing:**
- Go to storyboard editor
- Find scenes with missing images
- Press `R` to regenerate

#### Fix 3: Check Avatar File Exists

1. Navigate to storage folder: `avatars\`
2. Find avatar file referenced in error
3. Verify file:
   - Exists
   - Is not 0 bytes
   - Opens in media player

**If missing or corrupt:**
- Re-upload avatar (storyboard editor)

#### Fix 4: Clear and Regenerate

**Nuclear option:**

1. Delete all content in:
   - `storage\images\` (all scene images)
   - `storage\avatars\` (avatar file)
2. In Obsidian:
   - Select all scenes → "Regenerate All"
   - Re-upload avatar
   - Retry render

### Black Screens in Final Video

**Symptoms:**
- Video renders successfully
- First few seconds OK
- Then black/blank screens for rest of video

**Causes & Fixes:**

#### THIS WAS A BUG IN V1.0 - FIXED IN V1.1

**Solution:**
1. Check your version:
   - Right-click system tray icon → "About"
   - Look for version number

2. If v1.0.x:
   - Download latest installer: https://github.com/konradschrein-star/pol-production-line/releases/latest
   - Run installer (keeps all your data)
   - Retry render

**Technical details (for developers):**
- Problem: Images weren't copied to `public/images/` before render
- Fix: `asset-preparation.ts` module added in v1.1
- See `docs/BLACK_SCREEN_FIX.md` for full details

#### If Still Happening in v1.1+

**Check asset preparation logs:**

1. Right-click system tray → "View Logs"
2. Open `workers.log`
3. Search for "[ASSET-PREP]"
4. Look for copy errors

**If errors found:**
- Check file permissions on storage folder
- Check disk space (need 5GB+ free)
- Try different storage location

### Video Export Fails

**Symptoms:**
- Rendering completes
- But final video not saved
- Or video file is corrupt (0 bytes)

**Causes & Fixes:**

#### Fix 1: Check Disk Space

**Need space for final video:**

1. Check free space on C: drive
2. Videos are 50-200MB each
3. Need at least 5GB free total

**If low:**
- Delete old videos
- Change storage location (Settings → Storage)

#### Fix 2: Check Storage Path Permissions

1. Navigate to storage folder → `videos\`
2. Try creating a test file:
   - Right-click → New → Text Document
   - Can you create it?

**If permission denied:**
- Right-click `videos` folder → Properties
- Security tab → Edit
- Add your user → Full Control
- OK → Apply

#### Fix 3: Check Antivirus

**Antivirus may block video file creation:**

1. Temporarily disable antivirus
2. Retry render
3. If successful:
   - Add exception for storage folder
   - Re-enable antivirus

---

## Performance Issues

### Slow Image Generation

**Symptoms:**
- Images take >5 minutes each
- Total generation time >30 minutes for 8 scenes

**Causes & Fixes:**

#### Fix 1: Check Internet Speed

**Whisk API requires fast connection:**

1. Go to: https://fast.com
2. Check download speed
3. Should be >10 Mbps

**If slow:**
- Close bandwidth-heavy apps (streaming, downloads)
- Connect via Ethernet (not WiFi)
- Restart router

#### Fix 2: Reduce Worker Concurrency

**Fewer workers = less rate limiting = faster overall:**

1. Settings → Advanced → Workers
2. Reduce "Image worker concurrency":
   - Default: 8 workers
   - Try: 4 workers
3. Save → Restart services

**Paradox:** Sometimes fewer workers finish faster because they don't trigger rate limits!

#### Fix 3: Check for Rate Limiting

1. Open worker logs
2. Look for "429 Too Many Requests"

**If rate limited:**
- Wait 5 minutes
- Queue auto-resumes
- Or reduce concurrency (Fix 2)

### Render Takes Too Long

**Symptoms:**
- Render takes >10 minutes
- Much longer than expected 2-3 minutes

**Causes & Fixes:**

#### Fix 1: Optimize Avatar File

**Large avatar = slow render**

1. Check avatar file size (storage folder)
2. If >10MB:
   - Use `optimize-avatar.sh` script
   - Or HandBrake: Set to 640x360, 1500kbps

**After optimization:**
- Re-upload avatar
- Retry render

#### Fix 2: Close Other Apps

**Remotion is CPU-intensive:**

1. Open Task Manager (Ctrl+Shift+Esc)
2. Check CPU usage (Performance tab)
3. If >80%:
   - Close unnecessary apps
   - Especially: Chrome tabs, video editors, games

#### Fix 3: Check SSD vs HDD

**Rendering is much faster on SSD:**

1. Check where storage folder is located
2. Right-click drive → Properties
3. Look at drive type

**If HDD:**
- Move storage to SSD:
  1. Settings → Storage → Browse
  2. Choose SSD location (e.g., C: drive)
  3. System copies files automatically

**Speed difference:**
- HDD: 5-10 minutes render time
- SSD: 2-3 minutes render time

### High Memory Usage

**Symptoms:**
- Computer slows down during use
- "Out of memory" errors
- Task Manager shows high RAM usage

**Causes & Fixes:**

#### Fix 1: Close Other Apps

**Obsidian News Desk uses ~2-4GB RAM:**

1. Open Task Manager
2. Click "Memory" column to sort by usage
3. Close apps using >1GB:
   - Chrome (if many tabs)
   - Video editors
   - Games
   - Virtual machines

#### Fix 2: Reduce Worker Concurrency

**Each worker uses ~200-500MB:**

1. Settings → Advanced → Workers
2. Reduce concurrency:
   - Analyze: 1 worker (default, OK)
   - Images: 4 workers (reduced from 8)
   - Render: 1 worker (default, OK)
3. Save → Restart

#### Fix 3: Upgrade RAM

**If frequently hitting limits:**

- Current: 8GB (minimum)
- Recommended: 16GB
- Optimal: 32GB (for professional use)

### Disk Space Warnings

**Symptoms:**
- "Low disk space" warning
- Can't create new videos
- Windows "Disk full" messages

**Causes & Fixes:**

#### Fix 1: Delete Old Videos

1. Navigate to storage folder → `videos\`
2. Sort by date
3. Delete old videos you don't need
4. Empty Recycle Bin

**Each video:**
- 60 seconds: ~50-100MB
- 5 minutes: ~200-400MB
- 40 minutes: ~1-2GB

#### Fix 2: Delete Old Images

**Images accumulate over time:**

1. Navigate to storage folder → `images\`
2. Delete `.jpg` files from old jobs
3. Keep only recent images

**To find old job images:**
- Check job IDs in dashboard
- Delete images not matching current jobs

#### Fix 3: Move Storage Location

**Move to larger drive:**

1. Settings → Storage → Browse
2. Choose drive with more space (e.g., D: or external drive)
3. Click "Move Files" (copies everything automatically)
4. Delete old location after verifying

#### Fix 4: Use Disk Cleanup

**Windows built-in tool:**

1. Press Windows + R
2. Type: `cleanmgr`
3. Press Enter
4. Select C: drive
5. Check:
   - Temporary files
   - Recycle Bin
   - Thumbnails
   - Old Windows updates
6. Click "OK"

---

## Network & API Errors

### API Key Invalid/Expired

**Symptoms:**
- "Invalid API key" error
- "Unauthorized" (401) error
- Script analysis fails immediately

**Causes & Fixes:**

#### Fix 1: Re-enter API Key

1. Settings → API Configuration
2. Select your AI provider (OpenAI, Claude, etc.)
3. Delete old key
4. Copy fresh key from provider website:
   - **OpenAI:** https://platform.openai.com/api-keys
   - **Claude:** https://console.anthropic.com/settings/keys
   - **Google:** https://makersuite.google.com/app/apikey
   - **Groq:** https://console.groq.com/keys
5. Paste new key
6. Click "Validate Key"

**Validation success:**
- Green checkmark appears
- "API key is valid" message

#### Fix 2: Check API Key Format

**Correct formats:**
- **OpenAI:** `sk-proj-...` or `sk-...` (51+ characters)
- **Claude:** `sk-ant-...` (starts with sk-ant)
- **Google:** `AIza...` (39 characters)
- **Groq:** `gsk_...` (starts with gsk)

**Common mistakes:**
- Extra spaces at start/end
- Missing characters (incomplete copy)
- Confusing API key with Organization ID

#### Fix 3: Check Billing/Credits

**API providers require active billing:**

1. Visit provider dashboard
2. Check billing status

**OpenAI:**
- https://platform.openai.com/account/billing/overview
- Need credit card or prepaid credits
- New accounts: $5 free credit

**Claude:**
- https://console.anthropic.com/settings/billing
- Requires credit card (no free tier)

**Google:**
- https://console.cloud.google.com/billing
- Free tier: 60 requests/minute

**If expired/inactive:**
- Add payment method
- Or add prepaid credits

### Connection Timeout Errors

**Symptoms:**
- "Connection timeout" errors
- Requests hang then fail
- "ECONNREFUSED" in logs

**Causes & Fixes:**

#### Fix 1: Check Internet Connection

1. Open browser
2. Visit: https://google.com
3. Can you load page?

**If no internet:**
- Check WiFi/Ethernet connection
- Restart router
- Contact ISP

**If internet works but API fails:**
- Problem is likely with API provider
- Check provider status page

#### Fix 2: Check Firewall

**Windows Firewall may block API requests:**

1. Windows Security → Firewall & network protection
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Find "Node.js" or "Obsidian News Desk"
5. Check both "Private" and "Public"
6. Click OK

#### Fix 3: Disable VPN/Proxy

**VPNs can interfere:**

1. Disconnect VPN temporarily
2. Retry API request
3. If successful:
   - VPN was blocking
   - Add exception for API domains in VPN settings

**API domains to whitelist:**
- api.openai.com
- api.anthropic.com
- generativelanguage.googleapis.com
- aisandbox-pa.googleapis.com
- api.groq.com

#### Fix 4: Check Provider Status

**API may be down:**

1. Visit provider status page:
   - **OpenAI:** https://status.openai.com
   - **Claude:** https://status.anthropic.com
   - **Google:** https://status.cloud.google.com

2. If showing outage:
   - Wait for resolution
   - Or switch to different provider temporarily

### "Unauthorized" (401) Errors

**Symptoms:**
- "401 Unauthorized" error
- API key rejected
- "Authentication failed"

**Causes & Fixes:**

#### Fix 1: Validate API Key

**Same as "API Key Invalid" above**

1. Settings → API Configuration
2. Click "Validate Key"
3. If fails: Re-enter fresh key from provider

#### Fix 2: Check API Key Scope

**Some keys have restrictions:**

1. Visit provider dashboard
2. Check API key settings
3. Verify:
   - Key is not disabled
   - Key has correct permissions
   - Key is not IP-restricted (unless you set this up)

**OpenAI:**
- https://platform.openai.com/api-keys
- Click key → Check "Permissions"
- Should have "All" or at least "Chat Completions"

#### Fix 3: Regenerate Key

**Key may be corrupted:**

1. Delete old key on provider website
2. Create new key
3. Copy new key
4. Paste into Obsidian Settings
5. Save

### "Server Error" (500) Errors

**Symptoms:**
- "500 Internal Server Error"
- API request fails unexpectedly
- Random failures

**Causes & Fixes:**

#### Fix 1: Retry

**500 errors are usually temporary:**

1. Wait 30 seconds
2. Retry operation
3. Usually works on second attempt

#### Fix 2: Check Provider Status

**Provider may be having issues:**

1. Visit status page (links in "Connection Timeout" section above)
2. If outage reported:
   - Wait for resolution
   - Or switch to different AI provider temporarily

#### Fix 3: Check Request Size

**Very long scripts may fail:**

1. If script is >1000 words:
   - Shorten script
   - Or split into multiple videos

2. Typical limits:
   - OpenAI: 4096 tokens (~3000 words)
   - Claude: 100k tokens (rarely an issue)
   - Google: 30k tokens (rarely an issue)

---

## Getting Help

### Check Logs

**Most useful troubleshooting tool!**

**How to access:**
1. Right-click system tray icon
2. Click "View Logs"
3. Log folder opens in File Explorer

**Log files:**
- `workers.log` - Worker process errors (most useful)
- `database.log` - Database connection issues
- `server.log` - Web server errors
- `docker.log` - Container startup issues

**What to look for:**
- Lines starting with "ERROR" or "FATAL"
- Stack traces (multiple lines of error detail)
- Timestamp of when error occurred

**Sharing logs:**
- Copy error lines
- Include ~10 lines before and after error
- Paste into GitHub issue

### Documentation Links

**Quick references:**
- [QUICKSTART.md](../QUICKSTART.md) - 5-minute getting started
- [INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md) - Detailed setup walkthrough
- [README_FOR_FRIEND.md](../README_FOR_FRIEND.md) - Non-technical friendly guide
- [docs/USER_GUIDE.md](USER_GUIDE.md) - Complete workflow documentation
- [CHANGELOG.md](../CHANGELOG.md) - Version history and changes

### Community Support

**GitHub Issues:**
1. Visit: https://github.com/konradschrein-star/pol-production-line/issues
2. Search existing issues (your problem may be solved already)
3. If new issue:
   - Click "New Issue"
   - Choose template (Bug Report or Feature Request)
   - Fill in details:
     - Obsidian version (check "About")
     - Operating System
     - Steps to reproduce
     - Error message (copy from logs)
     - Screenshots (if helpful)
   - Submit

**What NOT to include:**
- API keys (sensitive!)
- Passwords
- Personal information

**Before posting:**
- Search this guide first
- Check existing GitHub issues
- Try the fix suggestions above
- Collect logs and screenshots

---

## Quick Reference: Common Fixes

| Problem | Quick Fix |
|---------|-----------|
| Images stuck "Generating..." | Update Whisk token (Settings → API → Whisk) |
| Docker not running | Start "Docker Desktop" from Start menu |
| System tray icon red | Right-click → "Start All Services" |
| Avatar upload fails | Check file is MP4 format |
| Render stuck | Check avatar file <10MB, optimize if needed |
| System Offline | Restart services (system tray → Stop → Start) |
| Port conflict | Close other apps, restart computer |
| Black screens in video | Update to v1.1+ (fixed bug) |
| Out of memory | Close other apps, reduce worker concurrency |
| Extension won't load | Enable "Developer mode" in chrome://extensions/ |

---

**Still stuck?** Open a GitHub issue with logs and details: https://github.com/konradschrein-star/pol-production-line/issues

**Found a bug?** Report it! Include:
- Version (system tray → "About")
- Operating System
- Steps to reproduce
- Error logs (system tray → "View Logs")
