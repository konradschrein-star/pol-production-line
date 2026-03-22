# Obsidian News Desk - Quick Start Guide

**Version:** 1.0
**Last Updated:** March 22, 2026

Welcome to Obsidian News Desk! This guide will help you create your first automated news broadcast video in under 30 minutes.

---

## Table of Contents

1. [What is Obsidian News Desk?](#what-is-obsidian-news-desk)
2. [System Requirements](#system-requirements)
3. [First-Time Setup](#first-time-setup)
4. [Starting the System](#starting-the-system)
5. [Accessing the Dashboard](#accessing-the-dashboard)
6. [Creating Your First Video](#creating-your-first-video)
7. [Timeline Expectations](#timeline-expectations)
8. [Understanding Job Statuses](#understanding-job-statuses)
9. [Stopping the System](#stopping-the-system)
10. [Next Steps](#next-steps)

---

## What is Obsidian News Desk?

Obsidian News Desk is an **automated video production system** that transforms written news scripts into professional broadcast videos using artificial intelligence.

**What it does:**
- Takes your news script and analyzes it with AI
- Automatically generates 6-8 background images for visual scenes
- Integrates with HeyGen for AI avatar narration
- Renders a polished 1920×1080 HD news video with ticker overlay

**Who it's for:**
- Content creators producing daily news broadcasts
- Social media managers creating video content
- News channels automating their video pipeline
- Anyone who wants professional news videos without expensive production

**What you'll create:**
Full HD (1920×1080) news videos featuring:
- AI-generated background images
- Professional AI avatar presenter
- Scrolling news ticker at the bottom
- Smooth transitions and Ken Burns effects
- Ready to upload to YouTube, social media, or your website

**Average production time:** 15-25 minutes per video

---

## System Requirements

Before you begin, ensure your computer meets these requirements:

### Software Requirements

✅ **Node.js 18 or newer**
- Download: [https://nodejs.org/](https://nodejs.org/)
- Verify installation: Open Command Prompt and run `node --version`
- You should see `v18.0.0` or higher

✅ **Docker Desktop**
- Download: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- Used for PostgreSQL database and Redis queue system
- Must be running before starting Obsidian News Desk
- Check system tray for Docker whale icon

✅ **Modern Web Browser**
- Chrome or Microsoft Edge (recommended)
- Used to access the web interface and HeyGen

✅ **HeyGen Account**
- Sign up at [https://www.heygen.com/](https://www.heygen.com/)
- Free tier available (limited videos per month)
- Used to generate AI avatar narration

### API Keys Needed

You'll need **at least one** AI provider for script analysis:

**Option 1: Google AI** (Recommended for beginners)
- Free tier: 60 requests per minute
- Get your key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- No payment method required

**Option 2: Anthropic Claude**
- Pay-as-you-go pricing (~$0.05-0.10 per video)
- Get your key at [https://console.anthropic.com/](https://console.anthropic.com/)
- Requires payment method

**Option 3: Groq**
- Free tier: 30 requests per minute
- Get your key at [https://console.groq.com/keys](https://console.groq.com/keys)
- No payment method required

**Google Whisk Token** (for image generation)
- Free to use (with rate limits)
- Instructions in setup section below

### Hardware Requirements

- **Processor:** Multi-core CPU (4+ cores recommended)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 50GB free space (for videos, images, and temp files)
- **Internet:** Stable broadband connection (for API calls and HeyGen)

---

## First-Time Setup

Follow these steps carefully to set up Obsidian News Desk for the first time.

### Step 1: Navigate to Project Folder

Open File Explorer and navigate to:
```
C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk
```

### Step 2: Install Dependencies

**Option A: Quick Setup (Windows)**

1. Double-click **`SETUP.bat`** in the project folder
2. A command window will open showing installation progress
3. Wait for the message: "Setup complete!"
4. The window will close automatically

**Option B: Manual Setup (Advanced)**

Open Command Prompt in the project folder and run:
```bash
npm install
```

Wait for all dependencies to download (5-10 minutes depending on internet speed).

### Step 3: Configure Environment Variables

1. **Locate the `.env.example` file** in the project folder
2. **Duplicate it:**
   - Right-click `.env.example` → Copy
   - Right-click empty space → Paste
   - Rename the copy to `.env` (remove `.example`)
3. **Open `.env` in a text editor** (Notepad, VS Code, etc.)

### Step 4: Add Your API Keys

Edit the `.env` file with your actual API keys:

**Required Configuration:**
```bash
# Database (already configured - DO NOT CHANGE)
DATABASE_URL=postgresql://postgres:password@localhost:5432/obsidian_news_desk

# Redis (already configured - DO NOT CHANGE)
REDIS_URL=redis://:obsidian_redis_password@localhost:6379

# AI Provider - Choose one: google, claude, or groq
AI_PROVIDER=google

# Google AI API Key (if using AI_PROVIDER=google)
GOOGLE_AI_API_KEY=your_google_api_key_here

# Whisk API Token (for image generation)
WHISK_API_TOKEN=your_whisk_token_here

# Local Storage Path
STORAGE_PATH=C:\Users\konra\ObsidianNewsDesk
```

4. **Replace `your_google_api_key_here`** with your actual Google AI API key
5. **Replace `your_whisk_token_here`** with your Whisk token (see below)
6. **Save the file**

### Step 5: Get Your Whisk API Token

The Whisk token is needed for automated image generation.

1. **Open Chrome or Edge** and go to [https://labs.google.com/whisk](https://labs.google.com/whisk)
2. **Sign in** with your Google account
3. **Press F12** to open Developer Tools
4. **Click the "Network" tab**
5. **Generate a test image** in Whisk (any image)
6. **In the Network tab, find the request named "generateImage"**
7. **Click on it** → **Headers** section
8. **Scroll to "Request Headers"**
9. **Find "Authorization:"** and copy everything after "Bearer " (starts with `ya29.`)
10. **Paste this token** into your `.env` file as `WHISK_API_TOKEN`

⚠️ **Important:** Whisk tokens expire after about 1 hour. If image generation fails later, you'll need to refresh this token using the same process.

### Step 6: Initialize Docker Containers

1. **Open Docker Desktop** (if not already running)
2. **Wait for it to fully start** (green icon in system tray)
3. **Open Command Prompt** in the project folder
4. **Run:**
   ```bash
   docker-compose up -d
   ```
5. **Wait for containers to start** (30-60 seconds)
6. **Verify containers are running:**
   ```bash
   docker ps
   ```
   You should see `obsidian_postgres` and `obsidian_redis` in the list.

✅ **Setup is now complete!** You're ready to start the system.

---

## Starting the System

Every time you want to use Obsidian News Desk, follow these steps:

### Daily Startup Procedure

**Option A: Quick Start (Windows)**

1. **Ensure Docker Desktop is running** (check system tray)
2. **Double-click `START.bat`** in the project folder
3. **Three command windows will open:**
   - **Window 1:** Docker container logs
   - **Window 2:** BullMQ worker processes (background jobs)
   - **Window 3:** Next.js development server (web interface)
4. **Your browser will automatically open** to `http://localhost:8347`

**Option B: Manual Start (Advanced)**

Open three separate Command Prompt windows in the project folder:

**Window 1 - Start Docker:**
```bash
docker-compose up
```

**Window 2 - Start Workers:**
```bash
npm run workers
```

**Window 3 - Start Web Interface:**
```bash
npm run dev
```

Then open your browser to `http://localhost:8347`

### How to Know It's Working

✅ **Green "System Online" indicator** in the top-right corner of the dashboard
✅ **No error messages** in any command windows
✅ **Docker shows 2 running containers** (Postgres + Redis)
✅ **Worker window shows** "Worker started" messages
✅ **Web interface loads** without errors

⚠️ **If you see errors, check [Troubleshooting](#troubleshooting) below.**

---

## Accessing the Dashboard

Once the system is running, you can access the web interface.

### Opening the Dashboard

1. **Open your browser** to `http://localhost:8347`
2. **The main dashboard will load** showing:
   - System status indicator (top-right)
   - Navigation sidebar (left)
   - Metrics overview (center)
   - Recent broadcasts list

### Dashboard Tour

**Sidebar Navigation:**
- **Dashboard** - Overview with statistics and recent activity
- **Broadcasts** - List of all video jobs (past and present)
- **New Broadcast** - Create a new video job
- **Settings** - Configure API keys and system preferences

**Dashboard Metrics:**
- **Total Broadcasts** - How many videos you've created
- **Completed Today** - Videos finished in the last 24 hours
- **In Progress** - Currently processing jobs
- **Queue Status** - How many jobs are waiting

**Recent Broadcasts Table:**
- Shows your last 10 videos
- Status badges (color-coded)
- Click any row to view details

### Keyboard Shortcuts

Press **`?`** anywhere in the interface to see a list of keyboard shortcuts.

**Common shortcuts:**
- **`N`** - Create new broadcast
- **`B`** - Go to broadcasts list
- **`D`** - Go to dashboard
- **`S`** - Open settings

---

## Creating Your First Video

Let's create your first automated news broadcast from start to finish.

### Step 1: Write Your News Script

Before creating a broadcast, write your news script in a text editor.

**Script Requirements:**
- **Minimum 100 characters** (the system will reject shorter scripts)
- **Clear topic and structure** - the AI will automatically break it into 6-8 scenes
- **Written for spoken delivery** - avoid complex technical jargon
- **Recommended length:** 200-500 words (60-90 second videos)

**Example Script:**
```
Good evening. Tonight we examine the unprecedented tech merger that's
reshaping Silicon Valley. TechCorp's acquisition of DataFlow raises
serious antitrust concerns among industry watchdogs. Legal experts warn
this consolidation could stifle innovation and raise prices for consumers
nationwide. Meanwhile, regulatory bodies are scrambling to respond. The
Justice Department has launched a preliminary investigation into potential
monopolistic practices. In related news, smaller competitors are already
feeling the pressure. Three major startups announced layoffs this week,
citing market uncertainty and increased competition from the merged entity.
```

✅ **Copy this example to test your first video!**

### Step 2: Create the Broadcast

1. **Click "NEW BROADCAST"** in the top navigation bar
2. **Paste your script** into the "News Script" text area
3. **Select your AI provider:**
   - **Google** (recommended for beginners - free tier)
   - **Claude** (higher quality, requires payment)
   - **Groq** (fast, free tier)
4. **Click "CREATE BROADCAST"** button
5. **You'll be automatically redirected** to the Storyboard Editor page

### Step 3: Wait for Analysis (30-60 seconds)

The AI is now analyzing your script.

**What's happening:**
- Breaking script into individual scenes
- Generating descriptive prompts for each scene's background image
- Creating ticker headlines for the scrolling news ticker
- Writing the avatar narration script (may be slightly modified from your original)

**What you'll see:**
- Status badge shows **"ANALYZING"** with a spinning icon
- "Avatar script will appear here..." placeholder
- Empty scene grid below

**What to do:**
- ✅ Wait patiently (do NOT refresh the page)
- ✅ Keep the page open

⏱️ **Estimated time:** 30-60 seconds

### Step 4: Review Generated Scenes (8-12 minutes)

Once analysis completes, the system automatically starts generating images.

**What's happening:**
- Each scene is queued for image generation
- Google Whisk API creates each background image
- Images are saved to your local storage
- Scene cards update in real-time as images complete

**What you'll see:**
- Status badge changes to **"GENERATING IMAGES"**
- 6-8 scene cards appear in a grid
- Each card shows "Generating..." with a spinner
- Cards complete one by one with green "COMPLETED" badges
- Images appear in each card as they finish

**What you can do while waiting:**
- ✅ Review the avatar script (appears at top of page)
- ✅ Read the generated image prompts on each card
- ✅ Edit ticker headlines if you want to change them (press **E** on any selected scene)

⏱️ **Estimated time:** 8-12 minutes (depending on number of scenes)

### Step 5: Review and Edit (Manual QA Phase)

Once all images are generated, the job status changes to **"REVIEW ASSETS"** - this is your quality control checkpoint.

**What's happening:**
- The system has paused and is waiting for YOU
- All images are ready for review
- You must approve or make changes before rendering

**What to check:**

✅ **Review each scene image:**
- Does it match the scene description?
- Is the quality acceptable?
- Are there any unwanted elements?

✅ **Review ticker headlines:**
- Do they make sense?
- Are they concise?
- Any typos?

✅ **Review avatar script:**
- Does it flow naturally?
- Does it match your original intent?

**How to edit:**

**Edit a ticker headline:**
1. Click a scene card (or use arrow keys to navigate)
2. Press **E** key
3. Type new headline (max 200 characters)
4. Press **Enter** or click **SAVE**

**Regenerate a poor-quality image:**
1. Click the scene card
2. Press **R** key
3. Confirm the dialog
4. Wait 60-90 seconds for new image

**Upload your own custom image:**
1. Click the scene card
2. Press **U** key
3. Select a PNG/JPG file (16:9 aspect ratio recommended)
4. Wait for upload to complete

⚠️ **Warning:** Regenerating many images rapidly (more than 5 in 5 minutes) may trigger Whisk's rate limiting. Use custom uploads instead if needed.

### Step 6: Generate Avatar in HeyGen

Now it's time to create your AI avatar narrator.

**Part A: Launch HeyGen Browser**

1. **In the Storyboard Editor, scroll to "AVATAR GENERATION" section**
2. **Click "LAUNCH HEYGEN BROWSER"** button
3. **A new browser window opens** to `https://app.heygen.com/`
4. **Sign in** if prompted (your HeyGen account)

**Part B: Copy Avatar Script**

1. **Back in the Storyboard Editor, scroll to the top**
2. **Find the "AVATAR SCRIPT" section**
3. **Click the text area** and select all text (Ctrl+A)
4. **Copy to clipboard** (Ctrl+C)

**Part C: Create Avatar Video**

1. **In the HeyGen browser window, navigate to "Instant Avatar 3.0"** (or latest version)
2. **Paste your avatar script** into the script field (Ctrl+V)
3. **Select a voice:**
   - Choose a natural-sounding news presenter voice
   - Examples: "Professional Newscast", "Authoritative Male", "Clear Female"
   - Test different voices if unsure
4. **Configure audio settings (CRITICAL):**
   - **Sample Rate:** Set to **48kHz** (required for sync)
   - **Codec:** H.264 (default)
5. **Click "Generate Video"**
6. **Wait for generation** (2-3 minutes)

⚠️ **IMPORTANT:** The audio sample rate MUST be 48kHz. Other rates will cause sync issues in the final video.

**Part D: Download Avatar MP4**

1. **Once HeyGen finishes processing**, click the **"Download"** button
2. **Save the MP4 file** to your Downloads folder
3. **Remember the file location**

### Step 7: Upload Avatar to System

Now upload the avatar video back to Obsidian News Desk.

**Option A: Drag & Drop (Easier)**

1. **In the Storyboard Editor, scroll to "AVATAR GENERATION" section**
2. **Find the upload zone** (dashed border box)
3. **Open File Explorer** to your Downloads folder
4. **Drag the avatar MP4 file** from File Explorer
5. **Drop it** into the upload zone in your browser
6. **Wait for upload** (green checkmark appears when done)

**Option B: File Picker**

1. **In the upload zone, click "SELECT FILE"** button
2. **Navigate to your Downloads folder**
3. **Select the avatar MP4 file**
4. **Click "Open"**
5. **Wait for upload to complete**

**What happens next:**
- Avatar is saved to local storage
- Job status automatically changes to **"RENDERING"**
- Rendering begins immediately
- You can close the HeyGen browser window

⏱️ **Estimated time:** 30 seconds for upload

### Step 8: Wait for Rendering (2-4 minutes)

The system is now compiling your final video.

**What's happening:**
- Remotion is compositing all elements together
- Background images transition with Ken Burns effects
- Avatar appears in bottom-right corner with green screen removed
- Ticker headlines scroll at the bottom
- Final MP4 is encoded at 1920×1080, 30fps

**What you'll see:**
- Status badge shows **"RENDERING"**
- Progress indicator (if implemented)

**What to do:**
- ✅ Wait for rendering to complete
- ✅ Do NOT close the page or stop the system
- ✅ You can work on other things (the render happens in the background)

⏱️ **Estimated time:** 2-4 minutes (depends on video length)

### Step 9: Download Your Final Video

Once rendering completes, you're done!

**What you'll see:**
- Status badge changes to **"COMPLETED"** ✅
- Final video preview appears at the bottom of the page
- **"DOWNLOAD FINAL VIDEO"** button is active

**What to do:**

1. **Preview the video inline:**
   - Click the play button in the video player
   - Check audio sync, image quality, ticker readability
   - Ensure avatar is properly positioned

2. **Download the video:**
   - Click **"DOWNLOAD FINAL VIDEO"** button
   - MP4 saves to your Downloads folder
   - Filename format: `broadcast_{job_id}_{timestamp}.mp4`

**Video specifications:**
- **Resolution:** 1920×1080 (Full HD)
- **Framerate:** 30fps
- **Codec:** H.264
- **Audio:** AAC, 48kHz
- **Aspect Ratio:** 16:9

✅ **Your video is ready to upload to YouTube, social media, or anywhere else!**

---

## Timeline Expectations

Here's how long each stage typically takes:

| Stage | Duration | What's Happening |
|-------|----------|------------------|
| **Script Analysis** | 30-60 seconds | AI analyzing script and creating scene breakdown |
| **Image Generation** | 8-12 minutes | Generating 6-8 background images via Whisk API |
| **Manual Review** | 5-10 minutes | You review/edit scenes and generate HeyGen avatar |
| **Avatar Upload** | 30 seconds | Uploading avatar MP4 to system |
| **Video Rendering** | 2-4 minutes | Compositing final video with Remotion |
| **TOTAL** | **15-25 minutes** | From script to finished video |

**Factors that affect timing:**
- **Number of scenes** - More scenes = longer image generation
- **API rate limits** - Whisk has 60-second delays between images
- **Video length** - Longer videos take slightly longer to render
- **System performance** - Faster CPU = faster rendering

**Tips for faster workflows:**
- Keep scripts concise (200-300 words for ~60 second videos)
- Pre-write multiple scripts so you can batch-create videos
- Use keyboard shortcuts in the Storyboard Editor (saves 30-60 seconds per video)
- Have HeyGen ready in another browser tab before you start

---

## Understanding Job Statuses

Your broadcast will progress through these statuses automatically:

### Status: `pending` ⏳
**Meaning:** Job created and queued for analysis
**What to do:** Wait a few seconds for workers to pick up the job
**Next status:** `analyzing`

---

### Status: `analyzing` 🔍
**Meaning:** AI is analyzing your script and generating scene breakdown
**Duration:** 30-60 seconds
**What to do:** Wait patiently, do NOT refresh the page
**Next status:** `generating_images`

---

### Status: `generating_images` 🎨
**Meaning:** System is creating background images for each scene
**Duration:** 8-12 minutes (for 6-8 scenes)
**What to do:** Monitor progress, optionally start editing completed scenes
**Next status:** `review_assets`

---

### Status: `review_assets` ⏸️
**Meaning:** **Manual checkpoint** - System is paused waiting for YOU
**Duration:** As long as you need (manual review phase)
**What to do:**
1. Review all scene images
2. Edit ticker headlines if needed
3. Regenerate or upload custom images if needed
4. Generate avatar in HeyGen
5. Upload avatar MP4

**Next status:** `rendering` (automatically after avatar upload)

⚠️ **CRITICAL:** The system will NOT proceed until you upload an avatar MP4. This is intentional.

---

### Status: `rendering` 🎬
**Meaning:** Remotion is compiling your final video
**Duration:** 2-4 minutes
**What to do:** Wait for rendering to complete, do NOT close the page
**Next status:** `completed`

---

### Status: `completed` ✅
**Meaning:** Video is finished and ready to download
**Duration:** Permanent (until you delete the job)
**What to do:**
1. Preview the video
2. Download the MP4 file
3. Upload to your platforms

**Next status:** None (final state)

---

### Status: `failed` ❌
**Meaning:** An error occurred during processing
**What to do:**
1. Check the error message on the job page
2. Check worker console for detailed logs
3. Common causes:
   - Whisk token expired (refresh it in `.env`)
   - Missing avatar upload (go back and upload)
   - Network issues (check internet connection)
4. Try creating a new job with the same script

---

### Status: `cancelled` 🚫
**Meaning:** User manually cancelled the job
**What to do:** Job is permanently cancelled, create a new one if needed

---

## Stopping the System

When you're done for the day, always stop the system properly.

### Graceful Shutdown Procedure

**Option A: Quick Stop (Windows)**

1. **Double-click `STOP.bat`** in the project folder
2. **All command windows will close** automatically
3. **Docker containers will stop** (database and Redis)
4. **Close any open browser tabs**

**Option B: Manual Stop (Advanced)**

1. **In each command window, press `Ctrl+C`**
2. **Wait for processes to stop gracefully** (5-10 seconds each)
3. **Stop Docker containers:**
   ```bash
   docker-compose down
   ```
4. **Close browser tabs**

### What Happens During Shutdown

✅ **Workers finish current tasks** before shutting down (graceful)
✅ **Database connections close** properly
✅ **Redis queues are saved** (jobs resume next time you start)
✅ **All data persists** (videos, images, job metadata)

⚠️ **If you force-quit or lose power, no data is lost** - but you may need to restart interrupted jobs.

### Data Persistence

All your data is saved permanently:
- **Videos:** `C:\Users\konra\ObsidianNewsDesk\videos\`
- **Images:** `C:\Users\konra\ObsidianNewsDesk\images\`
- **Avatars:** `C:\Users\konra\ObsidianNewsDesk\avatars\`
- **Database:** Docker volume `obsidian_postgres_data`

Even if you delete the project folder, your videos and images remain in the storage path.

---

## Next Steps

Congratulations! You've created your first automated news broadcast.

### Advanced Features

Once you're comfortable with the basics, explore these advanced guides:

📖 **[USER_GUIDE.md](../USER_GUIDE.md)** - Complete user manual
- Batch video creation
- Custom image styles with reference images
- Advanced avatar configuration
- Queue management and prioritization
- Analytics and reporting

📖 **[Settings Documentation](../USER_GUIDE.md#settings)** - Configure the system
- Switch AI providers
- Adjust rendering quality
- Configure storage paths
- Manage API keys

📖 **[Keyboard Shortcuts Reference](../HOTKEYS.md)** - Become a power user
- Navigate scenes lightning-fast
- Edit without touching the mouse
- Batch operations
- Custom hotkey bindings

### Common First Questions

**Q: Can I create multiple videos at once?**
A: Yes! The queue system handles multiple jobs automatically. Create as many as you want and they'll process in order.

**Q: How do I change the AI provider?**
A: Edit `.env` file, change `AI_PROVIDER=google` to `claude` or `groq`, save, and restart the system.

**Q: What if my Whisk token expires?**
A: Image generation will fail with a 401 error. Follow the token refresh steps in [Getting Your Whisk API Token](#step-5-get-your-whisk-api-token) above and update `.env`.

**Q: Can I edit the video after rendering?**
A: Not directly in the system. Download the MP4 and edit it in external software (Adobe Premiere, DaVinci Resolve, etc.).

**Q: How do I delete old videos to free up space?**
A: Use the Broadcasts page, click on a job, and select "Delete Job". This removes the database entry and optionally deletes files.

**Q: Can I use my own images instead of AI-generated ones?**
A: Yes! Use the **U** hotkey on any scene to upload a custom image (PNG/JPG, 16:9 recommended).

**Q: What if a scene image looks bad?**
A: Press **R** to regenerate it, or press **U** to upload your own replacement image.

### Getting Help

**Documentation:**
- [Environment Setup Guide](../.env.md) - API keys and configuration
- [Production User Guide](../PRODUCTION_USER_GUIDE.md) - Detailed workflow instructions
- [Technical Architecture](../CLAUDE.md) - For developers and advanced users

**Troubleshooting:**
- Check worker console for error messages
- Check browser console (F12) for client-side errors
- Ensure Docker Desktop is running
- Verify API keys in `.env` file
- Check Whisk token hasn't expired

**Support:**
- GitHub Issues: [Report bugs or request features](https://github.com/your-repo/issues)
- Contact system administrator with error messages and job IDs

---

## Troubleshooting

### Docker Desktop Not Running

**Symptoms:**
- `START.bat` shows "Docker not found" or "Cannot connect to database"
- Workers fail to start
- Web interface shows "System Offline"

**Fix:**
1. **Open Docker Desktop** application
2. **Wait for it to fully start** (green whale icon in system tray)
3. **Verify containers are running:**
   ```bash
   docker ps
   ```
4. **If no containers, start them:**
   ```bash
   docker-compose up -d
   ```
5. **Restart the system** with `START.bat`

---

### Workers Won't Start

**Symptoms:**
- Worker command window shows errors immediately
- "Missing environment variable" errors
- Jobs stay in `pending` status forever

**Fix:**
1. **Check `.env` file exists** in project root
2. **Verify all required variables are set:**
   - `DATABASE_URL`
   - `REDIS_URL`
   - `AI_PROVIDER`
   - Corresponding API key for your AI provider
   - `WHISK_API_TOKEN`
3. **Check for typos** in variable names
4. **Restart workers:**
   - Stop system with `STOP.bat`
   - Wait 10 seconds
   - Start again with `START.bat`

---

### Images Stuck on "Generating..."

**Symptoms:**
- Scene cards show "Generating..." for more than 5 minutes
- Status stays on `generating_images`
- Worker console shows "401 Unauthorized" errors

**Cause:** Whisk API token expired (they last ~1 hour)

**Fix:**
1. **Refresh your Whisk token** (see [Step 5: Get Your Whisk API Token](#step-5-get-your-whisk-api-token))
2. **Update `.env` file** with new token
3. **Restart workers:**
   ```bash
   # Stop workers (Ctrl+C in worker window)
   # Restart:
   npm run workers
   ```
4. **Jobs will auto-resume** from where they left off

---

### Avatar Upload Fails

**Symptoms:**
- "Failed to upload avatar" error message
- Upload progress bar disappears with no success message

**Causes:**
- File is not MP4 format
- Audio sample rate is not 48kHz
- File size exceeds 100MB

**Fix:**
1. **Verify file is MP4:**
   - Right-click file → Properties → Details
   - "Type" should be "MP4 Video"
2. **Check audio sample rate:**
   - Right-click file → Properties → Details
   - "Audio sample rate" should be "48 kHz"
3. **If wrong format, re-export from HeyGen:**
   - Ensure 48kHz audio setting is enabled
   - Download again
4. **If file is too large, compress it:**
   - Use HandBrake or similar tool
   - Maintain 48kHz audio and H.264 codec
   - Target file size: under 50MB

---

### System Runs Slow

**Symptoms:**
- Rendering takes more than 10 minutes
- Computer becomes unresponsive
- High CPU/RAM usage

**Fix:**
1. **Close unnecessary applications**
2. **Reduce rendering concurrency:**
   - Edit `.env` file
   - Change `REMOTION_CONCURRENCY=4` to `REMOTION_CONCURRENCY=2`
   - Save and restart system
3. **Lower video quality:**
   - Edit `.env` file
   - Change `REMOTION_QUALITY=high` to `REMOTION_QUALITY=medium`
   - Save and restart system

---

### Port Already in Use

**Symptoms:**
- `START.bat` shows "Port 8347 is already in use"
- Web interface won't load

**Fix:**
1. **Stop any existing instances:**
   ```bash
   STOP.bat
   ```
2. **Wait 10 seconds**
3. **Start again:**
   ```bash
   START.bat
   ```
4. **If still fails, manually kill process:**
   - Open Task Manager (Ctrl+Shift+Esc)
   - Find "Node.js" processes
   - Right-click → End Task
   - Try starting again

---

**End of Quick Start Guide**

You're now ready to produce professional AI-powered news broadcasts! Start creating your first video and explore the system.

For advanced workflows and detailed documentation, see [USER_GUIDE.md](../USER_GUIDE.md).

Happy broadcasting! 🎬
