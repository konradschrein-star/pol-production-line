# Obsidian News Desk - Complete Installation Guide

**Version:** 1.1.0
**Last Updated:** March 27, 2026
**Target Audience:** First-time users wanting detailed step-by-step instructions

This guide walks you through the entire installation process from start to finish. By the end, you'll have Obsidian News Desk fully installed and ready to create professional news videos.

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Prerequisites](#prerequisites)
   - [Step 1: Install Docker Desktop](#step-1-install-docker-desktop)
   - [Step 2: Install Google Chrome](#step-2-install-google-chrome)
   - [Step 3: Create HeyGen Account](#step-3-create-heygen-account)
4. [Download & Installation](#download--installation)
   - [Download Installer](#download-installer)
   - [Setup Wizard Walkthrough](#setup-wizard-walkthrough)
5. [First Launch](#first-launch)
6. [Verification](#verification)
7. [Common Issues](#common-issues)

---

## Introduction

**What you'll accomplish:**
- Install all required dependencies (Docker Desktop, Chrome)
- Download and run the Obsidian News Desk installer
- Complete the 6-page setup wizard
- Watch the 5-page interactive tutorial
- Verify your installation is working correctly

**Estimated time:** 15-20 minutes (including downloads)

**What you'll need:**
- Windows 10 or 11 (64-bit)
- Administrator access on your computer
- Stable internet connection (~500 MB download)
- OpenAI API key (free $5 credit available)

**After installation:**
- Desktop shortcut will be created
- Application runs in system tray (background)
- Access via http://localhost:8347
- Ready to create your first video!

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10 64-bit (Build 19041+) or Windows 11 |
| **Processor** | Intel Core i5 or AMD Ryzen 5 (4 cores) |
| **RAM** | 8 GB |
| **Disk Space** | 10 GB free (20 GB recommended) |
| **Internet** | Required for API calls and downloads |
| **Graphics** | Any modern GPU (integrated graphics OK) |

### Recommended Specifications

| Component | Recommendation |
|-----------|----------------|
| **Operating System** | Windows 11 64-bit |
| **Processor** | Intel Core i7 or AMD Ryzen 7 (8 cores) |
| **RAM** | 16 GB or more |
| **Disk Space** | 50 GB free (SSD recommended) |
| **Internet** | 25 Mbps+ for faster image generation |
| **Graphics** | Dedicated GPU (NVIDIA/AMD) for faster rendering |

**Why these requirements?**
- **Docker Desktop** requires Windows 10 Build 19041+ with WSL 2
- **Video rendering** is CPU-intensive (more cores = faster renders)
- **Image generation** stores 8-18 images per video (~20-50 MB each)
- **Database** (PostgreSQL) performs better on SSD

---

## Prerequisites

### Step 1: Install Docker Desktop

**What is Docker?** A containerization platform that runs the PostgreSQL database and Redis queue system. You install it once, then it runs in the background automatically.

#### Download Docker Desktop

1. **Visit Docker website:**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click **"Download for Windows"** button
   - File size: ~500 MB
   - Download time: 2-5 minutes (depending on connection)

2. **Wait for download to complete:**
   - File name: `Docker Desktop Installer.exe`
   - Save it somewhere easy to find (Downloads folder is fine)

[SCREENSHOT PLACEHOLDER: Docker Desktop download page]

#### Install Docker Desktop

1. **Run the installer:**
   - Double-click `Docker Desktop Installer.exe`
   - Windows may ask "Do you want to allow this app to make changes?"
   - Click **"Yes"**

2. **Configuration screen:**
   - ✅ **Check:** "Use WSL 2 instead of Hyper-V" (recommended)
   - ✅ **Check:** "Add shortcut to desktop"
   - Click **"OK"**

[SCREENSHOT PLACEHOLDER: Docker installer configuration options]

3. **Wait for installation:**
   - Progress bar shows installation status
   - Takes 3-5 minutes
   - Extracts files, installs WSL 2, configures settings

[SCREENSHOT PLACEHOLDER: Docker installation progress]

4. **Installation complete:**
   - Click **"Close and restart"**
   - **CRITICAL:** Your computer MUST restart for Docker to work
   - Save any open work before clicking!

#### Verify Docker Installation

1. **After restart, start Docker Desktop:**
   - Look for Docker Desktop icon on desktop (double-click it)
   - Or search "Docker Desktop" in Start menu

2. **First launch:**
   - Docker Desktop opens a welcome window
   - Accept license agreement (click "Accept")
   - Skip tutorial (click "Skip tutorial")
   - Wait for Docker Engine to start (~30-60 seconds)

3. **Check system tray:**
   - Look in bottom-right corner of Windows taskbar
   - You should see a whale icon 🐳
   - **Green icon (not animating)** = Docker is ready ✅
   - **Animated/flashing icon** = Docker is still starting (wait 30 more seconds)

[SCREENSHOT PLACEHOLDER: Docker running in system tray - green whale icon]

4. **Test Docker (optional):**
   - Open Command Prompt (search "cmd" in Start menu)
   - Type: `docker --version`
   - Should show: `Docker version 24.0.0 or newer`
   - If you see this, Docker is working!

**Troubleshooting Docker:**
- **"WSL 2 installation is incomplete"**
  - Click the notification
  - Follow link to install WSL 2 kernel update
  - Download and run `wsl_update_x64.msi`
  - Restart Docker Desktop

- **Docker won't start after restart:**
  - Right-click Docker icon → "Restart Docker Desktop"
  - Wait 60 seconds
  - If still not working, restart computer again

---

### Step 2: Install Google Chrome

**Why Chrome?** The Obsidian News Desk Chrome extension auto-captures Whisk API tokens (saves you from manual copy/paste every hour).

#### Download Chrome

1. **Visit Chrome website:**
   - Go to: https://www.google.com/chrome/
   - Click **"Download Chrome"**
   - Accept terms and click **"Download Chrome"**

2. **Run installer:**
   - Double-click `ChromeSetup.exe`
   - Installer runs automatically (no configuration needed)
   - Takes ~1-2 minutes

3. **Verify Chrome installed:**
   - Search "Chrome" in Start menu
   - Click to open
   - Should see Chrome browser window

**Already have Chrome?**
- You're good! Just make sure it's up to date:
- Click ⋮ (three dots) → Help → About Google Chrome
- Update if prompted

**Can I use Edge/Brave/Chromium instead?**
- **Edge:** Yes (recommended alternative - similar extension support)
- **Brave:** Maybe (extension may not work correctly)
- **Firefox/Safari:** No (extension is Chrome-specific)

---

### Step 3: Create HeyGen Account

**What is HeyGen?** An AI avatar generation service. You'll use it to create presenter videos (the person who "reads" your news script).

#### Sign Up for HeyGen

1. **Visit HeyGen:**
   - Go to: https://heygen.com
   - Click **"Get Started for Free"** (top-right)

2. **Create account:**
   - Enter email address
   - Create password
   - Verify email (check inbox for confirmation link)

3. **Free tier details:**
   - **Credits:** 3 minutes/month (enough for ~3 test videos)
   - **Avatars:** 100+ free avatars to choose from
   - **No credit card required** for trial
   - **Upgrade:** $24/month for 15 credits (optional, only if you love it)

4. **Explore avatars (optional):**
   - Click "Create Video" → "Instant Avatar"
   - Browse available avatars
   - Recommended: "Professional News Anchor" category
   - You don't need to generate anything yet!

**Why sign up before installing Obsidian News Desk?**
- Tutorial (Page 4) will reference HeyGen workflow
- You can generate your first avatar while images are generating
- Free tier gives you time to test before committing

---

## Download & Installation

### Download Installer

1. **Go to GitHub Releases:**
   - Visit: https://github.com/konradschrein-star/pol-production-line/releases/latest
   - You'll see the latest version (e.g., "v1.1.0")

2. **Download installer:**
   - Scroll to **Assets** section
   - Click **`ObsidianNewsDesk-Setup.exe`**
   - File size: ~150-200 MB
   - Download time: 1-3 minutes (depends on connection)

[SCREENSHOT PLACEHOLDER: GitHub Releases page with installer download]

3. **Security warning (expected!):**
   - Windows SmartScreen may say: "Windows protected your PC"
   - This is normal for new applications without a $500/year code signing certificate
   - Click **"More info"**
   - Click **"Run anyway"**
   - The software is safe - you can verify the code on GitHub

[SCREENSHOT PLACEHOLDER: Windows SmartScreen warning with "Run anyway" option]

**Why does Windows flag it?**
- Code signing certificates cost $500-1000/year
- Small open-source projects often skip this expense
- The code is open-source and auditable on GitHub
- Virus Total scan: 0/70 detections (safe)

---

### Setup Wizard Walkthrough

After running the installer, you'll see a 6-page setup wizard. Here's what each page does:

---

#### Page 1: Welcome

**What you'll see:**
- Obsidian News Desk logo and title
- "Welcome to Obsidian News Desk" heading
- Brief description of the application
- System requirements checklist (disk space, RAM, Node.js)

**What to do:**
1. Read the overview
2. Check that your system meets requirements:
   - ✓ At least 10GB free disk space
   - ✓ Minimum 8GB RAM recommended
   - ✓ Node.js 18+ (bundled with installer - auto-checked)
3. Click **"Get Started"** button

[SCREENSHOT PLACEHOLDER: Wizard Page 1 - Welcome Screen]

**What will be installed:**
- Next.js web application (user interface)
- Docker containers (PostgreSQL database + Redis queue)
- BullMQ job queue system (background workers)
- Remotion video rendering engine
- Chrome extension (Whisk token auto-refresh)

---

#### Page 2: Docker Desktop Detection

**What you'll see:**
- "Docker Desktop" heading
- Explanation of Docker requirement
- Status box showing detection result
- "Check Docker" button

**What to do:**
1. Click **"Check Docker"** button
2. Wait 3-5 seconds for detection

**Possible outcomes:**

**✅ Success (Docker running):**
- Status box turns green
- Text: "Docker Desktop is installed and running"
- **"Next"** button becomes enabled
- Click **"Next"** to continue

[SCREENSHOT PLACEHOLDER: Wizard Page 2 - Docker Detection Success]

**❌ Docker not installed:**
- Status box turns red
- Text: "Docker Desktop is not installed"
- **"Install Docker Desktop"** button appears
- Click button → Opens Docker download page
- Follow Step 1 above to install Docker
- Return to wizard → Click **"Check Docker"** again

**⚠️ Docker installed but not running:**
- Status box turns yellow
- Text: "Docker Desktop is installed but not running"
- **"Start Docker Desktop"** button appears
- Click button → Launches Docker Desktop
- Wait 30-60 seconds for Docker to start
- Click **"Check Docker"** again

[SCREENSHOT PLACEHOLDER: Wizard Page 2 - Docker Not Running]

**Troubleshooting:**
- **Can't find Docker?** Check system tray for whale icon 🐳
- **"Docker daemon is not running"?** Restart Docker Desktop from Start menu
- **Still failing?** Restart your computer → Try again

---

#### Page 3: Storage Location

**What you'll see:**
- "Storage Location" heading
- Explanation of storage directory purpose
- Path input field with default location
- "Browse..." button
- List of subdirectories that will be created
- Disk space available indicator

**What to do:**
1. **Review default path:**
   - Default: `C:\Users\YourName\ObsidianNewsDesk`
   - This is where videos, images, and avatars are saved

2. **Change location (optional):**
   - Click **"Browse..."** button
   - Select a folder with at least 10GB free space
   - **Recommended:** Choose a fast drive (SSD preferred)
   - **NOT recommended:** Network drives, USB drives, or cloud-synced folders (Dropbox, OneDrive)

3. **Verify disk space:**
   - Check indicator shows ">10GB available"
   - If less than 10GB, choose different location

4. **Review subdirectories:**
   - `images/` - Scene background images (Whisk API)
   - `avatars/` - HeyGen avatar MP4 files (30-60 MB each)
   - `videos/` - Final rendered broadcast videos (50-200 MB each)

5. Click **"Next"**

[SCREENSHOT PLACEHOLDER: Wizard Page 3 - Storage Location Picker]

**Tips:**
- **SSD vs HDD:** SSD is 5-10x faster for rendering
- **Portable storage:** Don't use external drives (can disconnect)
- **Cloud folders:** Don't use Dropbox/OneDrive (constant syncing slows down rendering)
- **Changing later:** You can change storage location in Settings → Storage

---

#### Page 4: API Configuration

**What you'll see:**
- "API Configuration" heading
- AI Provider dropdown (OpenAI, Claude, Google, Groq)
- Conditional API key input fields (changes based on provider selection)
- "Validate Key" buttons for each API
- Whisk Token input (optional, can skip)
- Help links for getting API keys

**What to do:**

**1. Select AI Provider:**
   - Click dropdown → Choose your preferred provider:

   | Provider | Best For | Cost | Speed |
   |----------|----------|------|-------|
   | **OpenAI** | Best quality, balanced | $0.02/video | Medium |
   | **Claude** | Premium quality, nuanced | $0.03/video | Slow |
   | **Google** | Free tier, high volume | Free (60/min) | Fast |
   | **Groq** | Testing, rapid iteration | Free tier | Fastest |

   **Recommendation for beginners:** OpenAI (new accounts get $5 free credit = 250 videos)

**2. Enter API Key:**

   **For OpenAI (most common):**
   1. Open new tab: https://platform.openai.com/api-keys
   2. Click **"Create new secret key"**
   3. Name it "Obsidian News Desk"
   4. Click **"Create secret key"**
   5. Copy the key (starts with `sk-proj-...` or `sk-...`)
   6. Paste into "OpenAI API Key" field
   7. Click **"Validate Key"**

   [SCREENSHOT PLACEHOLDER: OpenAI API key creation page]

   **For Claude:**
   1. Visit: https://console.anthropic.com/settings/keys
   2. Click **"Create Key"**
   3. Copy key (starts with `sk-ant-...`)
   4. Paste into wizard

   **For Google:**
   1. Visit: https://makersuite.google.com/app/apikey
   2. Click **"Create API key"**
   3. Copy key (starts with `AIza...`)
   4. Paste into wizard

   **For Groq:**
   1. Visit: https://console.groq.com/keys
   2. Click **"Create API Key"**
   3. Copy key (starts with `gsk_...`)
   4. Paste into wizard

**3. Validate API Key (Important!):**
   - Click **"Validate Key"** button
   - Wait 3-5 seconds for test request

   **✅ Success:**
   - Green checkmark appears
   - Text: "API key is valid"
   - You can proceed

   **❌ Failure:**
   - Red X appears
   - Error message shows specific issue:
     - "Invalid API key format" → Check you copied entire key
     - "Unauthorized" → Key might be revoked, create new one
     - "Network error" → Check internet connection

**4. Whisk Token (Optional - Can Skip):**
   - Input field labeled "Google Whisk API Token (Optional)"
   - You can leave this blank for now!
   - **Why skip?** The Chrome extension will capture it automatically after installation (tutorial shows how)
   - **If you already have one:** Paste it here (starts with `ya29.a0...`)

5. Click **"Next"**

[SCREENSHOT PLACEHOLDER: Wizard Page 4 - API Configuration with OpenAI selected]

**Common mistakes:**
- ❌ Copying key with extra spaces at start/end (trim whitespace!)
- ❌ Confusing API key with organization ID
- ❌ Using expired or revoked keys
- ❌ Pasting email address instead of key

---

#### Page 5: Database Configuration

**What you'll see:**
- "Database Configuration" heading
- PostgreSQL settings (pre-filled)
- Redis settings (pre-filled)
- "Test Connection" button
- Advanced mode toggle (collapsed by default)

**What to do:**

**For most users:**
1. **Don't change anything!** Defaults are optimized
2. Click **"Next"**

**For advanced users (optional):**
1. Click **"Show Advanced Settings"**
2. Modify if needed:
   - **Database Host:** `localhost` (don't change unless you know what you're doing)
   - **Database Port:** `5432` (PostgreSQL default)
   - **Database Name:** `obsidian_news`
   - **Database User:** `obsidian`
   - **Database Password:** `obsidian_password` (change if deploying to shared computer)
   - **Redis Host:** `localhost`
   - **Redis Port:** `6379` (Redis default)

3. Click **"Test Connection"** (verifies Docker can be reached)

[SCREENSHOT PLACEHOLDER: Wizard Page 5 - Database Configuration]

**When to customize:**
- You're running PostgreSQL/Redis on custom ports (rare)
- You have security requirements (shared/production environment)
- You know what you're doing and have specific needs

**When NOT to customize:**
- This is your first time installing (use defaults!)
- You're on a personal computer (security isn't critical)
- You don't understand what these settings mean

---

#### Page 6: Installation Progress

**What you'll see:**
- "Installing..." heading
- Progress description text
- Real-time log output (scrolling text)
- "Start Installation" button (initially)
- Progress bar (after clicking button)

**What to do:**
1. Click **"Start Installation"** button
2. **Wait 2-5 minutes** for installation to complete
3. Watch the log output (optional but cool to see what's happening!)

**Installation steps (automatic):**

```
[Ready] Click "Start Installation" to begin.
[1/8] Creating storage directories...
[2/8] Initializing PostgreSQL database...
[3/8] Starting Redis queue system...
[4/8] Installing application dependencies...
[5/8] Configuring environment...
[6/8] Testing API connections...
[7/8] Creating desktop shortcut...
[8/8] Finalizing installation...
[Complete] Installation finished successfully!
```

[SCREENSHOT PLACEHOLDER: Wizard Page 6 - Installation Progress with log output]

**What's happening behind the scenes:**
- Creates `C:\Users\YourName\ObsidianNewsDesk\images\`, `avatars\`, `videos\`
- Writes `.env` file with your API keys
- Starts Docker containers (PostgreSQL + Redis)
- Runs `npm run init-db` to create database tables
- Tests OpenAI/Whisk API connections
- Creates desktop shortcut: "Obsidian News Desk"
- Installs system tray service

**Troubleshooting:**
- **"Docker is not running"** → Go back to Page 2, start Docker, retry
- **"Port 5432 already in use"** → Another PostgreSQL instance running (stop it or change port)
- **"API key invalid"** → Go back to Page 4, re-enter key
- **Installation hangs at 50%** → Check antivirus isn't blocking (add exception)

**Installation complete:**
- Progress bar reaches 100%
- Text changes to: "Installation Complete!"
- **"Launch Application"** button appears
- Click it to start Obsidian News Desk!

---

#### Page 7: Complete

**What you'll see:**
- Large green checkmark ✓
- "Installation Complete!" heading
- Quick Start Guide summary
- Important links and information

**Quick Start Guide shows:**
- **Web Interface:** http://localhost:8347
- **Storage Location:** `C:\Users\YourName\ObsidianNewsDesk`
- **Documentation:** Link to README.md

**What to do:**
1. Review the information
2. **Optional:** Check "Start automatically when I sign in" (recommended!)
3. Click **"Launch Application"**

[SCREENSHOT PLACEHOLDER: Wizard Page 7 - Installation Complete]

**What happens next:**
- Wizard closes
- Desktop app launches (system tray icon appears)
- Interactive tutorial opens in browser
- You're ready to learn the workflow!

---

## First Launch

### Interactive Tutorial (5 Pages)

After clicking "Launch Application", a 5-page interactive tutorial opens automatically. **Don't skip this!** It teaches essential concepts.

---

#### Tutorial Page 1: Workflow Overview

**What you'll learn:**
- End-to-end video production process
- Visual workflow diagram (script → AI → images → review → avatar → render)
- Time expectations for each step

**Workflow diagram:**
```
📝 Script → 🤖 AI Analysis → 🎨 Image Gen → ✅ Review → 🎭 Avatar → 🎬 Render
  (You)      (30-60s)         (15-20min)      (You)      (You)     (2-3min)
```

**Key takeaways:**
- Total time: 25-40 minutes per 60-second video
- Most time is automated waiting (you can walk away!)
- Only ~5 minutes of active work required

**Interactive element:**
- Animated workflow diagram
- Click each step to see details

Click **"Next"** to continue

[SCREENSHOT PLACEHOLDER: Tutorial Page 1 - Workflow Diagram]

---

#### Tutorial Page 2: Keyboard Shortcuts

**What you'll learn:**
- Essential hotkeys for faster editing
- Vim-style navigation (J/K keys)
- Modal shortcuts (R for regenerate, E for edit)

**Essential shortcuts:**
- `J` / `K` - Navigate broadcasts (up/down, like Vim)
- `Enter` - Open selected broadcast
- `N` - Create new broadcast
- `R` - Regenerate scene image
- `E` - Edit ticker headline
- `U` - Upload custom image
- `?` - Show all shortcuts
- `Esc` - Close modal / Go back

**Interactive element:**
- Keyboard demo: "Press J or K to test keyboard detection"
- Real-time feedback shows when you press keys

**Pro tip shown:**
> "Once you learn J/K/R/E, you can edit broadcasts without touching your mouse!"

Click **"Next"** to continue

[SCREENSHOT PLACEHOLDER: Tutorial Page 2 - Keyboard Shortcuts Grid]

---

#### Tutorial Page 3: Whisk Token Setup (Most Important!)

**What you'll learn:**
- How to install the Chrome extension (automatic token capture)
- Why manual token setup is annoying (expires hourly)
- Step-by-step extension installation

**Chrome Extension Setup (5 steps):**

**Step 1: Open Chrome Extensions**
- Navigate to `chrome://extensions/` in Chrome or Edge

**Step 2: Enable Developer Mode**
- Toggle "Developer mode" in top-right corner

**Step 3: Load Extension**
- Click "Load unpacked"
- Browse to: `C:\Program Files\Obsidian News Desk\resources\chrome-extension\`
- Click "Select Folder"

**Step 4: Visit Whisk & Generate Test Image**
- Go to: https://labs.google.com/fx/tools/whisk
- Generate any test image (upload a photo or use example)
- Extension captures token automatically (no action needed!)

**Step 5: Verify Token Captured**
- Click extension icon (green key) in Chrome toolbar
- Should show "Token Active" with green indicator
- Token auto-refreshes every 50 minutes

**Alternative: Manual Setup (collapsed section)**
- Shows how to manually copy token from Network tab
- **Not recommended** (token expires every hour!)

**Interactive element:**
- Expandable "Alternative: Manual Token Setup" section
- Copy-pasteable paths for extension location

Click **"Next"** to continue

[SCREENSHOT PLACEHOLDER: Tutorial Page 3 - Chrome Extension Setup Steps]

---

#### Tutorial Page 4: HeyGen Avatar Workflow

**What you'll learn:**
- How to generate avatar videos on HeyGen.com
- When to generate avatars (during "Review Assets" state)
- How to optimize large avatar files

**Avatar Workflow (6 steps):**

**Step 1: Wait for Review Assets State**
- After images generate, job pauses automatically
- Status badge shows "REVIEW ASSETS"

**Step 2: Click "LAUNCH HEYGEN BROWSER"**
- Button appears in storyboard editor
- Opens HeyGen.com in new tab

**Step 3: Generate Avatar**
- Paste the avatar script (provided by AI)
- Select avatar (professional news anchor recommended)
- Click "Generate" (takes 1-2 minutes)

**Step 4: Download .MP4 File**
- Wait for generation to complete
- Click "Download" button
- File saved to Downloads folder (usually 30-60 MB)

**Step 5: Optimize if Needed**
- **If file >10MB:** Use `optimize-avatar.sh` script or HandBrake
- Reduces to 640x360, ~2-3MB
- **If file <10MB:** Skip optimization, upload directly!

**Step 6: Upload via Storyboard Editor**
- Drag & drop avatar MP4 into upload zone
- Or click "Upload Avatar MP4" button
- System validates format and uploads

**💡 Optimization Tip (highlighted box):**
> Large avatar files can cause Remotion timeout. Always optimize files >10MB for best performance.

Click **"Next"** to continue

[SCREENSHOT PLACEHOLDER: Tutorial Page 4 - HeyGen Workflow Steps]

---

#### Tutorial Page 5: Ready to Start

**What you'll see:**
- "You're All Set!" heading
- Checklist of completed setup items
- Next steps (numbered list)
- "Create My First Broadcast" button (large, prominent)

**Checklist (all items checked):**
- ✅ Whisk token configured
- ✅ HeyGen account ready
- ✅ Storage path set
- ✅ Services running
- ✅ Keyboard shortcuts learned

**Next Steps:**
1. Write or paste your news script
2. Click "Create New Broadcast"
3. Wait ~20 minutes for images to generate
4. Review images in storyboard editor
5. Generate avatar on HeyGen
6. Upload avatar and click "Compile & Render"
7. Download your finished video!

**Interactive element:**
- Large blue **"Create My First Broadcast"** button
- Clicking it closes tutorial and opens "New Broadcast" page

Click **"Create My First Broadcast"** to start!

[SCREENSHOT PLACEHOLDER: Tutorial Page 5 - Ready Checklist]

---

### After Tutorial

**What you'll see:**
- Tutorial closes
- Browser redirects to: http://localhost:8347
- Obsidian News Desk dashboard appears
- System tray icon shows green (services running)

**Dashboard overview:**
- **Top navigation:** New Broadcast, Settings, Analytics, Help
- **Main area:** Broadcasts list (empty for now)
- **Status indicator:** "System Online" (green dot)

**You're ready to create your first video!**

---

## Verification

Let's make sure everything is working correctly.

### 1. Check System Tray Icon

**Location:** Bottom-right corner of Windows taskbar

**What to look for:**
- Obsidian News Desk icon (filmstrip or camera icon)
- **Green icon** = All services running ✅
- **Red icon** = Services stopped ❌

**Test:**
- Right-click the icon
- You should see menu:
  - Open Dashboard
  - Start All Services
  - Stop All Services
  - View Logs
  - Settings
  - Exit

[SCREENSHOT PLACEHOLDER: System Tray Icon - Green Status]

---

### 2. Check Web Interface

**Access:**
1. Open browser
2. Go to: http://localhost:8347
3. Should see Obsidian News Desk dashboard

**What to verify:**
- ✅ Page loads without errors
- ✅ "System Online" indicator in top-right (green)
- ✅ Navigation menu works (click Settings, Analytics, etc.)
- ✅ No red error messages or warnings

**If page won't load:**
- Check system tray icon is green
- Wait 10-15 seconds (services may still be starting)
- Refresh page (Ctrl+F5)
- Check Docker Desktop is running

[SCREENSHOT PLACEHOLDER: Dashboard - System Online Status]

---

### 3. Check Chrome Extension

**Access:**
1. Open Chrome
2. Click Extensions icon (puzzle piece) in toolbar
3. Look for "Auto Whisk Token Capture"

**What to verify:**
- ✅ Extension appears in list
- ✅ Toggle is ON (blue/enabled)
- ✅ No error messages

**Test:**
1. Click extension icon (green key)
2. Should show: "Token Status: Not yet captured (visit Whisk to capture)"
3. This is normal! Token captures when you first visit Whisk

[SCREENSHOT PLACEHOLDER: Chrome Extension Enabled]

---

### 4. Test with Sample Broadcast (Optional)

**Quick smoke test:**
1. Click **"New Broadcast"** (or press `N`)
2. Paste this short test script:
   ```
   Good evening. This is a test of the Obsidian News Desk system. We're verifying that all components are working correctly. This is a short test broadcast.
   ```
3. Select **"OpenAI"** as AI provider
4. Click **"Create Broadcast"**
5. Wait ~30 seconds
6. Status should change from "pending" → "analyzing" → "generating_images"
7. Cancel the job (click "Cancel" button) - no need to complete

**If this works:**
- ✅ API key is valid
- ✅ AI analysis is functional
- ✅ Queue system is running
- ✅ Database is working

**If it fails:**
- See [Common Issues](#common-issues) below

---

## Common Issues

### Installer Won't Start

**Symptom:** Double-clicking installer does nothing

**Causes & Fixes:**

**1. Windows SmartScreen blocking:**
- Click "More info" → "Run anyway"
- Or: Right-click installer → Properties → Check "Unblock" → OK → Retry

**2. Insufficient permissions:**
- Right-click installer → "Run as administrator"

**3. Corrupt download:**
- Check file size (should be ~150-200 MB)
- If smaller, re-download from GitHub Releases
- Compare SHA256 checksum (optional)

---

### Docker Not Detected

**Symptom:** Wizard Page 2 shows "Docker not found" even though you installed it

**Causes & Fixes:**

**1. Docker Desktop not started:**
- Search "Docker Desktop" in Start menu
- Click to launch it
- Wait 30-60 seconds for startup
- Return to wizard → Click "Check Docker" again

**2. WSL 2 not installed:**
- Open PowerShell as Administrator
- Run: `wsl --install`
- Restart computer
- Start Docker Desktop

**3. Virtualization disabled in BIOS:**
- Restart computer → Enter BIOS (usually F2, F12, or Del during boot)
- Find "Virtualization" or "VT-x" or "AMD-V" setting
- Enable it
- Save and exit BIOS
- Start Docker Desktop

**4. Docker not in PATH:**
- Open Command Prompt
- Type: `docker --version`
- If "not recognized" → Reinstall Docker Desktop with default settings

---

### Extension Installation Problems

**Symptom:** Can't load Chrome extension

**Causes & Fixes:**

**1. Wrong browser:**
- Extension only works in Chrome or Edge
- Firefox/Safari not supported
- Download Chrome: https://www.google.com/chrome/

**2. Developer mode not enabled:**
- Go to `chrome://extensions/`
- Toggle "Developer mode" in top-right
- Retry loading extension

**3. Extension path wrong:**
- Default path: `C:\Program Files\Obsidian News Desk\resources\chrome-extension\`
- If you installed to custom location, adjust path
- Look for folder containing `manifest.json`

**4. Permissions error:**
- Right-click extension folder → Properties
- Security tab → Edit → Add your user → Full Control
- OK → Retry loading extension

---

### Permission Errors on Windows

**Symptom:** "Access denied" or "Permission denied" errors during installation

**Causes & Fixes:**

**1. Run installer as administrator:**
- Right-click `ObsidianNewsDesk-Setup.exe`
- Click "Run as administrator"
- Enter admin password if prompted

**2. Storage location restricted:**
- Choose different storage path (not Program Files)
- Recommended: `C:\Users\YourName\ObsidianNewsDesk`

**3. Antivirus blocking:**
- Temporarily disable antivirus
- Run installer
- Add exception for Obsidian News Desk folder
- Re-enable antivirus

---

### Port Conflicts

**Symptom:** "Port 8347 already in use" or "Port 5432 already in use"

**Causes & Fixes:**

**1. Check what's using ports:**
- Open Command Prompt as Administrator
- Run: `netstat -ano | findstr :8347`
- Run: `netstat -ano | findstr :5432`
- Note the PID (last column)

**2. Kill conflicting process:**
- Run: `taskkill /PID <PID> /F`
- Replace `<PID>` with number from above
- Retry installation

**3. Common culprits:**
- Port 8347: Another web server (stop it)
- Port 5432: Another PostgreSQL instance (stop it or change Obsidian port)
- Port 6379: Another Redis instance (stop it or change Obsidian port)

**4. Change ports (advanced):**
- Go to Settings → Advanced → Port Configuration
- Change conflicting ports
- Restart services

---

### Service Startup Failures

**Symptom:** System tray icon is red, "System Offline" in dashboard

**Causes & Fixes:**

**1. Docker containers not running:**
- Open Docker Desktop
- Check Containers tab
- Should see:
  - `obsidian_postgres` (running, green)
  - `obsidian_redis` (running, green)
- If not running: Click "Start" button

**2. Database initialization failed:**
- Right-click system tray icon → "View Logs"
- Look for errors in `database.log`
- Common fix: Delete Docker volumes → Restart
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```

**3. Worker processes crashed:**
- Check `workers.log` for errors
- Common causes:
  - Invalid API key (re-enter in Settings)
  - Out of memory (close other apps)
  - Corrupt Node modules (reinstall)

---

## Next Steps

**Congratulations! You've successfully installed Obsidian News Desk.** 🎉

### Create Your First Video

Follow the [QUICKSTART.md](QUICKSTART.md) guide to create your first broadcast in 5 minutes.

### Learn the Full Workflow

Read [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for comprehensive documentation on:
- Writing effective news scripts
- Using reference images
- Style presets
- Bulk operations
- Advanced keyboard shortcuts

### Get Help

If you run into issues:
1. Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Detailed solutions to common problems
2. Visit [GitHub Issues](https://github.com/konradschrein-star/pol-production-line/issues) - Report bugs or request features
3. Read [README_FOR_FRIEND.md](README_FOR_FRIEND.md) - Friendly non-technical guide

### Stay Updated

- Star the repository on GitHub for updates
- Check [CHANGELOG.md](CHANGELOG.md) for version history
- Download new releases from GitHub Releases

---

**Happy broadcasting!** 📺🎙️
