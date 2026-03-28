# Obsidian News Desk - USB Setup Guide

**Version:** 1.0.0
**For:** Windows 10/11
**Setup Time:** 15-30 minutes (first time)

---

## 🎯 What You'll Build

An AI-powered news broadcast video generator that:
- Analyzes your news script with AI
- Generates custom images for each scene
- Creates professional 1080p news videos
- Runs entirely on your local machine

**Example workflow:** Write script → Wait 25 minutes → Download finished video! 🎬

---

## 📋 Prerequisites

Before you start, install these on your laptop:

### 1. Docker Desktop (Required)
- **Download:** https://www.docker.com/products/docker-desktop/
- **Version:** Latest (2024+)
- **Why:** Runs database and queue system
- **Install time:** 10-15 minutes
- **Disk space:** ~500 MB

**After installing:**
1. Open Docker Desktop
2. Accept terms and conditions
3. Let it start completely (whale icon in system tray)
4. Keep it running while using the app

---

### 2. Node.js 20+ (Required)
- **Download:** https://nodejs.org/ (get the LTS version)
- **Version:** 20.0.0 or higher
- **Why:** Runs the web server and video rendering
- **Install time:** 5 minutes
- **Disk space:** ~200 MB

**Verify installation:**
```cmd
node --version
```
Should show `v20.x.x` or higher.

---

### 3. Get Your API Keys (Required)

You'll need accounts for these AI services:

#### OpenAI (for script analysis)
1. Go to: https://platform.openai.com/api-keys
2. Sign up / Log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)
5. Save it somewhere safe!

**Cost:** ~$0.10-0.50 per video (GPT-4)

---

#### Google Whisk (for image generation)
This one's a bit trickier because the token expires every hour!

1. Open https://labs.google.com/whisk in Chrome
2. Press F12 to open Developer Tools
3. Click the "Network" tab
4. Generate a test image on Whisk (any prompt)
5. In the Network tab, find the request called "generateImage"
6. Click on it → Headers tab → Scroll to "Request Headers"
7. Find "Authorization: Bearer ya29.a0..."
8. Copy everything after "Bearer " (the ya29... part)
9. Save this token!

**Cost:** Free (for now)
**Important:** Token expires after ~1 hour. You'll need to refresh it when images stop generating.

---

## 🚀 Installation Steps

### Step 1: Extract the ZIP

1. Copy `Obsidian-News-Desk-v1.0.0-Portable.zip` from USB to your laptop
2. Right-click → "Extract All..."
3. Choose a location **without spaces in the path** (important!)
   - ✅ Good: `C:\Apps\ObsidianNewsDesk\`
   - ✅ Good: `D:\Programs\ObsidianNewsDesk\`
   - ❌ Bad: `C:\Users\John Smith\My Documents\ObsidianNewsDesk\` (spaces!)
4. Wait for extraction (~3-4 GB)

---

### Step 2: Create Your Configuration File

1. Navigate to the extracted folder
2. Find the file `.env.example`
3. Make a copy of it and rename to `.env` (no "example"!)
4. Open `.env` in Notepad
5. Fill in your API keys:

```env
# AI Provider - Choose one: openai, google, claude, groq
AI_PROVIDER=openai

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Google AI API Key (optional, for Google Gemini)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Whisk API Token (get from https://labs.google.com/whisk - see instructions above)
WHISK_API_TOKEN=ya29.YOUR_TOKEN_HERE

# Generate random keys for security (see below)
API_KEY=YOUR_RANDOM_64_CHAR_KEY_HERE
ADMIN_API_KEY=YOUR_RANDOM_32_CHAR_KEY_HERE

# Pexels API Key (optional, for stock footage)
PEXELS_API_KEY=your_pexels_api_key_here
```

**To generate random API keys:**

Open PowerShell and run:
```powershell
# For API_KEY (64 characters)
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# For ADMIN_API_KEY (32 characters)
-join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Copy these random strings into your `.env` file.

6. Save the `.env` file

---

### Step 3: First Run

1. Open the extracted folder
2. Find `START.bat`
3. Right-click → "Run as administrator" (required for Docker)
4. Three terminal windows will open:
   - **Window 1:** Docker logs
   - **Window 2:** Worker processes (image generation, rendering)
   - **Window 3:** Web server

**Wait 30-60 seconds** for everything to start.

5. Open your browser and go to: **http://localhost:8347**

You should see the Obsidian News Desk interface! 🎉

---

## 🎬 Create Your First Video

### Step 1: Write Your Script

1. Click "New Broadcast" (top right)
2. Paste or type your news script (any length!)
3. Click "Create Broadcast"

**Example script:**
```
Breaking news tonight: Scientists have discovered a new species
of deep-sea jellyfish off the coast of Japan. The translucent
creature glows in the dark and has tentacles up to 10 feet long.
Marine biologists are calling it one of the most exciting
discoveries of the decade.
```

---

### Step 2: Wait for AI Analysis

The AI will analyze your script and generate image prompts (~30-60 seconds).

You'll see:
- Status: "Analyzing" → "Generating Images"
- Progress bar updating

---

### Step 3: Review Images

After 15-20 minutes, images will be ready!

1. Review each scene in the storyboard editor
2. Edit headlines or image prompts if needed
3. Click "Regenerate" for any scene you don't like

---

### Step 4: Add Your Avatar

**Manual workflow (recommended):**

1. Click "LAUNCH HEYGEN BROWSER"
2. HeyGen.com will open in your browser
3. Sign up / Log in to HeyGen
4. Upload your script (from the storyboard)
5. Choose an avatar voice
6. Generate and download the `.mp4` file

**Optimize large avatars (if > 10 MB):**
```cmd
cd scripts
optimize-avatar.sh "C:\path\to\your-avatar.mp4" "optimized-avatar.mp4"
```

7. Upload the avatar MP4 in the storyboard editor

---

### Step 5: Render Final Video

1. Click "COMPILE & RENDER"
2. Wait 2-3 minutes (for 60-second video)
3. Download your finished video! 🎬

**Output:**
- Resolution: 1920x1080 (Full HD)
- Format: MP4
- Typical size: 15-30 MB

---

## 🔧 Troubleshooting

### Issue: "Images not generating" or "401 Unauthorized"

**Cause:** Whisk token expired (happens every ~1 hour)

**Fix:**
1. Open https://labs.google.com/whisk in Chrome
2. F12 → Network tab
3. Generate a test image
4. Find "generateImage" request
5. Copy new Authorization token
6. Update `.env` file with new `WHISK_API_TOKEN`
7. Restart the app (`STOP.bat` then `START.bat`)

---

### Issue: "Docker not running"

**Fix:**
1. Open Docker Desktop
2. Wait for it to fully start (whale icon in system tray)
3. Restart the app

---

### Issue: "Port 8347 already in use"

**Fix:**
1. Close any other apps using port 8347
2. Or edit `.env`: `NEXT_PUBLIC_APP_URL=http://localhost:8348`
3. Restart the app

---

### Issue: "Database connection failed"

**Fix:**
1. Make sure Docker Desktop is running
2. Run `docker ps` in terminal - you should see Postgres and Redis containers
3. If not, run: `docker compose up -d`

---

### Issue: "Module not found" or "npm errors"

**Fix:**
1. Navigate to the app folder in terminal
2. Run: `npm install`
3. Wait for installation to complete
4. Restart the app

---

### Issue: "Video rendering stuck"

**Causes:**
- Avatar file too large (>100 MB)
- Missing images
- Low disk space

**Fix:**
1. Check avatar file size - should be <10 MB (use optimize-avatar.sh)
2. Verify all scenes have images generated
3. Check disk space (need at least 5 GB free)
4. Restart render from storyboard

---

## 📊 Disk Space Requirements

- **Initial install:** ~4 GB (extracted app)
- **Docker images:** ~500 MB (Postgres + Redis)
- **Working space:** ~5-10 GB recommended
  - Images: ~5-10 MB each (8 scenes = 80 MB)
  - Avatars: ~30-60 MB (before optimization)
  - Final videos: ~15-30 MB each

**Total:** ~10-15 GB minimum

---

## ⚡ Performance Expectations

**Typical video production timeline (60-second video):**

| Step | Duration | What's Happening |
|------|----------|------------------|
| Script Analysis | 30-60 seconds | AI analyzing script, generating image prompts |
| Image Generation | 15-20 minutes | Whisk API generating 8 custom images |
| Avatar Generation | 5-10 minutes | Manual HeyGen workflow |
| Video Rendering | 2-3 minutes | Remotion compositing final video |
| **Total** | **25-40 minutes** | End-to-end |

**Hardware impact:**
- CPU: Moderate during rendering
- RAM: 4-8 GB in use
- Disk: Continuous read/write during render
- Network: Active during image/avatar generation

---

## 🔒 Security & Privacy

**Good news:** Everything runs locally on your machine!

- ✅ No data sent to cloud servers (except AI API calls)
- ✅ Videos stored on your machine only
- ✅ Database runs locally in Docker
- ✅ No telemetry or tracking

**Keep these private:**
- Your `.env` file (contains API keys)
- Your API keys (never share them!)
- Your videos (if they contain sensitive content)

---

## 💰 Cost Estimate

**Per video (60 seconds, 8 scenes):**

| Service | Cost | Notes |
|---------|------|-------|
| OpenAI (GPT-4) | $0.10-0.50 | Script analysis |
| Google Whisk | Free | Image generation (for now) |
| HeyGen | $0-24/mo | Free tier or paid plan |
| **Total** | **$0.10-25/mo** | Depends on usage |

**Cost-saving tips:**
- Use AI_PROVIDER=google (Gemini is cheaper than GPT-4)
- Regenerate only failed scenes (not all 8)
- Optimize avatar workflow (reuse voices)

---

## 📞 Getting Help

**Common questions:**

**Q: Can I use this on Mac/Linux?**
A: Not yet. This version is Windows-only (Electron app).

**Q: Can I use this offline?**
A: No. You need internet for:
- AI script analysis (OpenAI/Google)
- Image generation (Whisk API)
- Avatar generation (HeyGen)

**Q: How many videos can I make?**
A: Unlimited! Limited only by:
- Your API rate limits (OpenAI, Whisk)
- Your disk space
- Your patience 😄

**Q: Can I customize the video style?**
A: Yes! Edit image prompts in the storyboard editor before rendering.

**Q: Can I use my own images?**
A: Yes! Upload custom images for any scene in the storyboard.

**Q: What if I close the app during rendering?**
A: The render will fail. You'll need to restart from "review_assets" state.

---

## 🚀 Next Steps

**Once you've created your first video:**

1. **Experiment with different scripts**
   - News broadcasts
   - Product demos
   - Educational content
   - Creative storytelling

2. **Optimize your workflow**
   - Save style presets for consistent look
   - Reuse avatar voices
   - Batch multiple videos

3. **Share your videos!**
   - Export to YouTube, social media
   - Show your friends
   - Build a content library

---

## 📝 Quick Reference

### Start the App
```cmd
START.bat
```

### Stop the App
```cmd
STOP.bat
```

### Open the Interface
```
http://localhost:8347
```

### Refresh Whisk Token
1. https://labs.google.com/whisk
2. F12 → Network → Generate image
3. Copy "Authorization: Bearer ya29..." token
4. Update `.env` file
5. Restart app

### Reset Everything
```cmd
STOP.bat
docker compose down -v  # Deletes database!
START.bat
```

---

## 🎓 Advanced Tips

### Speed Up Image Generation

Edit `.env`:
```env
SCENE_BASED_ANALYSIS=false  # Use legacy mode (faster, fewer images)
```

### Use Different AI Providers

```env
# Try Google Gemini (cheaper)
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your_key_here

# Or Anthropic Claude (better quality)
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

### Increase Rendering Speed

```env
REMOTION_CONCURRENCY=4  # Use 4 CPU cores (default: 2)
```

### Auto-Start with Windows

1. Right-click `START.bat` → "Create shortcut"
2. Press Win+R → type `shell:startup` → Enter
3. Move shortcut to Startup folder
4. App will launch on every Windows login

---

**That's it! Enjoy creating professional news videos! 🎬✨**

**Questions?** Check the troubleshooting section or contact the person who shared this with you.

---

**Version 1.0.0** | Built with ❤️ using Next.js, Remotion, and AI
