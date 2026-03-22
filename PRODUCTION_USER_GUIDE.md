# ⚠️ DEPRECATED - See New Documentation

> **This documentation has been consolidated into the new docs/ folder.**
>
> **Please use instead:**
> - **[docs/QUICK_START.md](docs/QUICK_START.md)** - Getting started guide
> - **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** - Complete workflow guide
> - **[docs/REFERENCE.md](docs/REFERENCE.md)** - Advanced reference
>
> **Last Updated:** March 22, 2026

---

# Obsidian News Desk - Production User Guide (ARCHIVED)

**Version:** 1.0
**Last Updated:** March 20, 2026
**Status:** ⚠️ Archived - Content moved to docs/ folder

This guide will walk you through the complete workflow for producing news broadcast videos using the Obsidian News Desk system. No technical knowledge required - just follow these steps.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a Broadcast](#creating-a-broadcast)
3. [Understanding Job Statuses](#understanding-job-statuses)
4. [Reviewing and Editing Scenes](#reviewing-and-editing-scenes)
5. [Avatar Generation Workflow](#avatar-generation-workflow)
6. [Downloading Final Video](#downloading-final-video)
7. [Common Issues and Fixes](#common-issues-and-fixes)
8. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### Starting the System

1. **Navigate to the project folder:**
   ```
   C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk
   ```

2. **Double-click `START.bat`**
   - A command window will open showing the system starting up
   - Docker containers (Postgres + Redis) will start
   - Three worker processes will launch (analyze, images, render)
   - Next.js development server will start
   - Your browser will automatically open to `http://localhost:8347`

3. **Wait for system to be ready:**
   - You should see the Obsidian News Desk dashboard
   - Look for "System Online" indicator (top right)
   - If you see errors, check [Common Issues](#common-issues-and-fixes)

### Stopping the System

1. **Double-click `STOP.bat`**
   - All workers will shut down gracefully
   - Docker containers will stop
   - Close any open browser windows

⚠️ **IMPORTANT:** Always use `STOP.bat` before shutting down your computer. This prevents database corruption.

---

## Creating a Broadcast

### Step 1: Navigate to New Broadcast Form

1. Click the **"NEW BROADCAST"** button in the top navigation bar
2. You'll be taken to the broadcast creation form

### Step 2: Prepare Your News Script

Your script should be:
- **Minimum 100 characters** (the system will reject shorter scripts)
- **Clear and structured** - the AI will break it into scenes automatically
- **Written for spoken delivery** - avoid complex jargon

**Example Script:**
```
Good evening. Tonight we examine the unprecedented tech merger that's
reshaping Silicon Valley. TechCorp's acquisition of DataFlow raises
serious antitrust concerns. Industry experts warn this consolidation
could stifle innovation and raise prices for consumers. Meanwhile,
regulatory bodies scramble to respond. The Justice Department has
launched a preliminary investigation. In related news, smaller
competitors are already feeling the pressure. Three startups announced
layoffs this week, citing market uncertainty.
```

### Step 3: Configure Broadcast Settings

1. **Paste your script** into the "News Script" text area
2. **Select AI Provider:**
   - **Google** (Recommended) - Free tier, 60 requests/minute
   - **Claude** - Pay-as-you-go, higher quality
   - **Groq** - Free tier, very fast
3. **Click "CREATE BROADCAST"**

### Step 4: Automatic Redirection

- You'll be automatically redirected to the **Storyboard Editor**
- The system will begin analyzing your script immediately
- Do NOT close this page - keep it open to monitor progress

---

## Understanding Job Statuses

The system uses a state machine with 5 statuses. Your broadcast will move through these automatically:

### 1. `analyzing` 🔍
**What's happening:**
- The AI is reading your script
- Breaking it down into individual scenes (usually 6-8 scenes)
- Generating image prompts for each scene
- Creating a ticker headline for each scene
- Writing the avatar script (the narration for your AI presenter)

**Duration:** 30-60 seconds

**What you should see:**
- Status badge shows "ANALYZING" with spinning icon
- "Avatar script will appear here..." placeholder

**What to do:**
- Wait patiently
- Do NOT refresh the page

---

### 2. `generating_images` 🎨
**What's happening:**
- Each scene is queued for image generation
- Google Wisk (via Auto Whisk extension) generates each image
- Images are processed one at a time (60-second delay between each)
- Generated images are uploaded to local storage
- Database is updated with image URLs

**Duration:** 8-12 minutes (for 8 scenes)

**What you should see:**
- Scene cards appear in a grid (6-8 cards)
- Each card shows "Generating..." with spinner
- Cards complete one by one (green "COMPLETED" badge)
- Images appear in each card as they finish

**What to do:**
- Monitor progress visually
- You can start reviewing completed scenes while others generate
- If queue appears stuck (see [Common Issues](#common-issues-and-fixes))

---

### 3. `review_assets` ⏸️
**What's happening:**
- The system is paused and waiting for YOU
- All images have been generated
- You must review scenes, make edits, and upload avatar

**Duration:** As long as you need (manual review phase)

**What you should see:**
- Status badge shows "REVIEW ASSETS"
- All scene images are displayed
- Avatar upload zone appears at bottom
- "LAUNCH HEYGEN BROWSER" button is active

**What to do:**
1. Review all scene images (see [Reviewing and Editing Scenes](#reviewing-and-editing-scenes))
2. Edit ticker headlines if needed
3. Regenerate or replace any poor-quality images
4. Generate and upload avatar video (see [Avatar Generation Workflow](#avatar-generation-workflow))

⚠️ **CRITICAL:** The system will NOT proceed until you upload an avatar MP4.

---

### 4. `rendering` 🎬
**What's happening:**
- Remotion is compositing your final video
- Hook section (0-15s): Images transition every 1.5 seconds
- Body section (15s+): Images transition at 1 per sentence
- Ken Burns effect applied to all images (subtle zoom/pan)
- HeyGen avatar composited in bottom-right corner
- Green screen removed from avatar using WebGL chromakey
- Scrolling ticker overlay rendered at bottom
- Final MP4 encoded at 1920×1080, 30fps

**Duration:** 2-4 minutes (depends on video length)

**What you should see:**
- Status badge shows "RENDERING"
- Progress indicator (if implemented)

**What to do:**
- Wait for rendering to complete
- Do NOT close the page or stop the system

---

### 5. `completed` ✅
**What's happening:**
- Video rendering is finished
- Final MP4 uploaded to local storage
- System marked job as complete

**Duration:** Permanent (until you delete the job)

**What you should see:**
- Status badge shows "COMPLETED"
- Final video preview appears at bottom
- "DOWNLOAD FINAL VIDEO" button is active
- Video plays in browser

**What to do:**
- Preview the video inline
- Download the MP4 file
- Upload to YouTube, social media, etc.

---

## Reviewing and Editing Scenes

### Navigation

**Using Keyboard (Recommended):**
- **Arrow Keys:** ← Previous scene | → Next scene
- **Vim-Style:** `J` Previous | `K` Next
- **Direct Jump:** Press `1-9` to jump to scene number
- **Help:** Press `?` to see all keyboard shortcuts

**Using Mouse:**
- Click any scene card to select it
- Selected scene has a blue highlight ring

**Auto-Scroll:**
- When you select a scene, the page automatically scrolls it into view

---

### Editing Ticker Headlines

Each scene has a ticker headline that scrolls at the bottom of the final video.

**Method 1: Hotkey (Faster)**
1. Select the scene (arrow keys or click)
2. Press `E` to enter edit mode
3. Type your new headline (max 200 characters)
4. Press `Enter` or click "SAVE"

**Method 2: Mouse**
1. Click the ticker headline text directly
2. Text field appears with current headline
3. Modify text
4. Click "SAVE" button

**Best Practices:**
- Keep headlines concise (under 100 characters)
- Use ALL CAPS for emphasis: `BREAKING: Tech merger announced`
- Match the tone of your script

---

### Regenerating Scene Images

If an image doesn't match the prompt or looks low-quality:

**Method 1: Hotkey (Faster)**
1. Select the scene
2. Press `R` to regenerate
3. Confirm the dialog prompt
4. Scene status changes to "PENDING"
5. Worker picks up job and generates new image (~90 seconds)
6. New image appears when complete

**Method 2: Mouse**
1. Click the scene card
2. Click "REGENERATE" button at bottom
3. Confirm dialog
4. Wait for new image

⚠️ **NOTE:** Regeneration re-queues the scene to Google Wisk. If you regenerate too many images rapidly (>10 within 5 minutes), you may trigger ban detection.

---

### Uploading Custom Images

If regeneration doesn't help, upload your own image:

**Method 1: Hotkey (Faster)**
1. Select the scene
2. Press `U` to upload
3. File picker opens
4. Select PNG/JPG image (16:9 aspect ratio recommended)
5. Image uploads and replaces generated image

**Method 2: Mouse**
1. Click the scene card
2. Click "UPLOAD" button at bottom
3. Select image file
4. Wait for upload

**Image Requirements:**
- **Format:** PNG, JPG, JPEG, WebP
- **Aspect Ratio:** 16:9 (1920×1080 recommended)
- **File Size:** Under 10MB
- **Content:** High quality, no watermarks

---

## Avatar Generation Workflow

This is the manual step that requires HeyGen. The system cannot generate avatars automatically.

### Step 1: Launch HeyGen Browser

1. **In the Storyboard Editor, scroll to "AVATAR GENERATION" section**
2. **Click "LAUNCH HEYGEN BROWSER" button**
   - A new browser window opens at `https://app.heygen.com/`
   - You should already be logged in (cookies saved)
   - If not logged in, sign in with your HeyGen account

### Step 2: Copy Avatar Script

1. **In the Storyboard Editor, scroll to "AVATAR SCRIPT" section** (top of page)
2. **Select all text** (Ctrl+A in the script box)
3. **Copy to clipboard** (Ctrl+C)

### Step 3: Create Instant Avatar Video

1. **In HeyGen, navigate to "Instant Avatar 3.0"** (or latest version)
2. **Paste your avatar script** into the script field
3. **Select a voice:**
   - Recommended: Natural-sounding voices (e.g., "Professional Newscast", "Authoritative Male", "Clear Female")
   - Test different voices if unsure
4. **Configure audio settings:**
   - **Sample Rate:** 48kHz (CRITICAL - other rates may cause sync issues)
   - **Codec:** H.264 (default)
5. **Click "Generate Video"**
   - Generation takes 2-3 minutes
   - You can monitor progress in HeyGen dashboard

### Step 4: Download Avatar MP4

1. **Wait for HeyGen to finish processing**
2. **Click "Download" button**
3. **Save MP4 to your Downloads folder** (or remember location)

**File Requirements:**
- **Format:** MP4 (H.264 codec)
- **Audio:** 48kHz sample rate
- **File Size:** Under 100MB
- **Duration:** Should match your script length

### Step 5: Upload to Obsidian News Desk

**Method 1: Drag & Drop (Easier)**
1. In Storyboard Editor, scroll to "AVATAR GENERATION" section
2. Find the upload zone (dashed border box)
3. Drag the MP4 file from your Downloads folder
4. Drop it into the upload zone
5. Wait for "Uploading and processing..." spinner
6. Green checkmark appears when done
7. Job status automatically changes to `rendering`

**Method 2: File Picker**
1. In the upload zone, click "SELECT FILE" button
2. Navigate to your Downloads folder
3. Select the avatar MP4 file
4. Click "Open"
5. Wait for upload to complete

### Step 6: Wait for Rendering

- Job status changes to `rendering` automatically
- You can close the HeyGen browser window
- Wait 2-4 minutes for final video
- Do NOT close the Storyboard Editor page

---

## Downloading Final Video

### When Status is `completed`:

1. **Scroll to bottom of Storyboard Editor**
2. **"FINAL VIDEO" section appears**
3. **Preview video inline:**
   - Click play button in video player
   - Check quality, audio sync, ticker, avatar position
4. **Download video:**
   - Click "DOWNLOAD FINAL VIDEO" button
   - MP4 saves to your Downloads folder
   - Filename format: `broadcast_{job_id}_{timestamp}.mp4`

### Video Specifications:
- **Resolution:** 1920×1080 (Full HD)
- **Framerate:** 30fps
- **Codec:** H.264
- **Audio:** AAC, 48kHz
- **Aspect Ratio:** 16:9

### Upload to Platforms:

**YouTube:**
- Upload as Private/Unlisted/Public
- Video meets all YouTube requirements

**Social Media:**
- Works on Twitter, Facebook, LinkedIn, TikTok
- May need to trim for Instagram (60-second limit)

---

## Common Issues and Fixes

### Workers Won't Start

**Symptoms:**
- `START.bat` shows error messages
- "System Offline" indicator in dashboard

**Causes:**
- Docker Desktop not running
- Missing `.env` file
- Incorrect environment variables

**Fixes:**
1. **Check Docker Desktop:**
   - Open Docker Desktop application
   - Ensure it's running (whale icon in system tray)
   - If not installed, download from docker.com
2. **Check `.env` file:**
   - Navigate to project folder
   - Verify `.env` file exists
   - Compare to `.env.example` (see `.env.md` guide)
3. **Restart system:**
   - Run `STOP.bat`
   - Wait 10 seconds
   - Run `START.bat` again

---

### Images Stuck on "Generating..."

**Symptoms:**
- Scene cards show "Generating..." for >5 minutes
- Status stays on `generating_images`

**Causes:**
- Google Wisk requires manual login (cookie expired)
- Ban detection paused queue
- Worker crashed

**Fixes:**
1. **Check worker console:**
   - Look at the command window running workers
   - Look for errors like "Ban detected" or "Login required"
2. **Manual login to Google Wisk:**
   - Open browser to `https://labs.google.com/wisk`
   - Log in with your Google account
   - Complete any CAPTCHA
   - Restart workers: `STOP.bat` → `START.bat`
3. **Resume queue (if paused):**
   - In Storyboard Editor, look for yellow "Queue Paused" warning
   - Click "RESUME QUEUE" button (if implemented)
   - Or restart workers manually

---

### Queue Paused (Ban Detected)

**Symptoms:**
- Yellow warning banner: "Queue appears to be paused"
- Workers show "Ban detected, pausing queue"

**Causes:**
- Too many rapid image generation requests
- Google Wisk anti-bot detection triggered

**Fixes:**
1. **Wait 10-15 minutes** (let cooldown period pass)
2. **Manually log into Google Wisk:**
   - Open `https://labs.google.com/wisk`
   - Solve any CAPTCHA challenges
   - Generate one test image manually
3. **Restart workers:**
   - Run `STOP.bat`
   - Wait 2 minutes
   - Run `START.bat`
4. **Resume queue:**
   - Click "RESUME QUEUE" button (if available)
   - Or API will auto-resume after worker restart

**Prevention:**
- Don't regenerate more than 5 images within 5 minutes
- Use custom uploads instead of rapid regeneration

---

### Avatar Upload Fails

**Symptoms:**
- "Failed to upload avatar" error message
- Upload spinner disappears but no success message

**Causes:**
- File is not MP4 format
- File size exceeds 100MB
- Audio sample rate is not 48kHz
- H.264 codec missing

**Fixes:**
1. **Verify file format:**
   - Right-click MP4 → Properties → Details
   - Check "Audio sample rate" = 48kHz
   - Check "Video codec" = H.264
2. **Re-export from HeyGen:**
   - Ensure 48kHz audio setting is enabled
   - Download again
3. **Compress file (if too large):**
   - Use HandBrake or FFmpeg to reduce file size
   - Maintain 48kHz audio and H.264 codec

---

### Render Fails

**Symptoms:**
- Status stuck on `rendering` for >10 minutes
- Worker shows errors in console

**Causes:**
- Missing scene images
- Corrupted avatar MP4
- Insufficient disk space
- Remotion crash

**Fixes:**
1. **Check disk space:**
   - Open File Explorer → This PC
   - Ensure C: drive has >10GB free
   - Delete old broadcast videos if needed
2. **Verify all scenes have images:**
   - Go back to Storyboard Editor
   - Check all scene cards show images (not "No Image")
   - Regenerate or upload missing images
3. **Re-upload avatar:**
   - Download fresh copy from HeyGen
   - Upload again via Storyboard Editor
4. **Check Remotion worker logs:**
   - Look at worker console for stack traces
   - Copy error message and report to admin

---

### Browser Shows "Cannot GET /api/files"

**Symptoms:**
- Scene images don't load (broken image icons)
- Final video doesn't play

**Causes:**
- Next.js server not running
- File path incorrect in database

**Fixes:**
1. **Verify Next.js server is running:**
   - Check `START.bat` command window
   - Should show "Ready on http://localhost:8347"
2. **Restart system:**
   - Run `STOP.bat`
   - Run `START.bat`
3. **If issue persists, contact admin**

---

## Keyboard Shortcuts

Press `?` in the Storyboard Editor to see this help dialog.

### Navigation
| Key | Action |
|-----|--------|
| `←` or `K` | Previous scene |
| `→` or `J` | Next scene |
| `1-9` | Jump to scene number |

### Scene Actions
| Key | Action |
|-----|--------|
| `E` | Edit ticker headline |
| `R` | Regenerate scene image |
| `U` | Upload custom image |

### Global
| Key | Action |
|-----|--------|
| `?` | Show/hide keyboard shortcuts |
| `Esc` | Close modals/dialogs |

---

## Workflow Summary Checklist

Use this checklist for each broadcast you create:

- [ ] Start system with `START.bat`
- [ ] Verify "System Online" indicator
- [ ] Click "NEW BROADCAST"
- [ ] Paste news script (100+ characters)
- [ ] Select AI provider (Google recommended)
- [ ] Click "CREATE BROADCAST"
- [ ] Wait for `analyzing` to complete (~60s)
- [ ] Monitor `generating_images` (~10 min)
- [ ] Review all scene images
- [ ] Edit ticker headlines as needed
- [ ] Regenerate/upload any poor images
- [ ] Click "LAUNCH HEYGEN BROWSER"
- [ ] Copy avatar script
- [ ] Generate avatar in HeyGen (48kHz audio!)
- [ ] Download avatar MP4
- [ ] Upload avatar to Obsidian News Desk
- [ ] Wait for `rendering` (~3 min)
- [ ] Preview final video
- [ ] Download final video
- [ ] Upload to YouTube/social media
- [ ] Stop system with `STOP.bat` (when done for the day)

---

## Getting Help

**Documentation:**
- [Environment Setup Guide](.env.md) - Configuring API keys and settings
- [CLAUDE.md](CLAUDE.md) - Technical architecture (for developers)
- [Basic plan.txt](Basic plan.txt) - Full technical specification

**Troubleshooting:**
- Check worker console for error messages
- Check browser console (F12) for client-side errors
- Read this guide's [Common Issues](#common-issues-and-fixes) section

**Support:**
- Contact system administrator
- Provide error messages and job ID

---

**End of Production User Guide**
*You're now ready to produce professional news broadcasts. Good luck!*
