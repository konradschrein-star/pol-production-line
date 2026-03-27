# Obsidian News Desk - Friend's Guide 🎬

Hey! 👋 Ready to create professional news videos? This guide will get you from zero to your first video in about 20 minutes. Grab some coffee ☕ and let's do this!

---

## 📦 What You're Getting

**Obsidian News Desk** is like having a whole video production team in a single app:

- 🤖 **AI Script Analyst** - Breaks your script into scenes automatically
- 🎨 **Image Generator** - Creates background images for each scene (via Google Whisk)
- 🎭 **Avatar Integration** - Adds AI presenter overlay (via HeyGen)
- 🎬 **Video Renderer** - Combines everything into a polished 1920x1080 broadcast

**Example Workflow:**
```
You write: "Good evening. Breaking news in tech..."
         ↓
AI creates: 8 background images + ticker headlines
         ↓
You add: HeyGen avatar video
         ↓
System renders: Final broadcast video (like real news!)
```

**Real-world time:** ~15-20 minutes per video (most of it is automated waiting)

---

## 🚀 Installation (Super Easy!)

### Step 1: Install Docker Desktop

**What is Docker?** Think of it like a mini computer inside your computer that runs the database. You only install it once, then forget about it.

1. Download from: https://www.docker.com/products/docker-desktop/
2. Run the installer (takes ~5 minutes)
3. **IMPORTANT:** Restart your computer after installation
4. Start Docker Desktop (look for the whale icon 🐳 in your system tray)

**How to know it's ready:**
- Whale icon in system tray stops animating
- Icon turns solid (not flashing)

### Step 2: Download & Run Obsidian News Desk Installer

1. **Download installer:**
   - Go to: https://github.com/konradschrein-star/pol-production-line/releases/latest
   - Click **ObsidianNewsDesk-Setup.exe** (~150-200 MB)
   - Wait 1-2 minutes for download

2. **Security warning (normal!):**
   - Windows might say "Windows protected your PC"
   - Click **"More info"** → **"Run anyway"**
   - This is because the app doesn't have a $500/year code signing certificate (yet)

3. **Run the installer:**
   - Double-click `ObsidianNewsDesk-Setup.exe`
   - Follow the 6-page wizard (takes ~5 minutes)

---

## 🧙 Setup Wizard Walkthrough

The installer has 6 pages. Here's what each one does:

### Page 1: Welcome 👋
- Just click **"Get Started"**
- Shows system requirements (10GB disk space, 8GB RAM)

### Page 2: Docker Check 🐳
- Automatically detects if Docker is running
- ✅ **Green checkmark** = you're good!
- ❌ **Red X** = Click "Start Docker Desktop" button, wait 30 seconds, try again

### Page 3: Storage Location 📁
- **Default:** `C:\Users\YourName\ObsidianNewsDesk`
- This is where videos, images, and avatars will be saved
- You can change it, but the default is fine for most people
- **Important:** Make sure you have at least 10GB free space!

### Page 4: API Configuration 🔑
This is where you paste your API keys. Don't panic - here's how to get them:

#### OpenAI API Key (Required)
1. Go to: https://platform.openai.com/api-keys
2. Sign up (new users get $5 free credit!)
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-...`)
5. Paste into the wizard

#### Whisk Token (Optional - Auto-Captured Later)
- **Don't worry about this now!**
- The installer includes a Chrome extension that captures this automatically
- You'll set it up in 2 minutes after installation (tutorial shows how)

### Page 5: Database Configuration 🗄️
- **Just click "Next"** - it's already filled in with good defaults
- (Only advanced users need to change these settings)

### Page 6: Installation Progress ⏳
- Watch the progress bar fill up (~2-3 minutes)
- Creating folders, setting up database, installing services...
- When it says "Complete", click **"Launch Application"**

---

## 📚 First Launch Tutorial (3 Minutes)

After installation, you'll see a 5-page tutorial. **Don't skip this!** It teaches you the basics:

1. **Page 1:** How the workflow works (script → AI → images → review → avatar → render)
2. **Page 2:** Keyboard shortcuts (J/K to navigate, R to regenerate, etc.)
3. **Page 3:** 🌟 **IMPORTANT:** Chrome extension setup (auto-refreshes Whisk token)
4. **Page 4:** HeyGen avatar workflow (how to generate presenter videos)
5. **Page 5:** Ready checklist

**After the tutorial:** The app opens at http://localhost:8347 🎉

---

## 🎬 Creating Your First Video

### Part 1: Generate Your Avatar (3 Minutes on HeyGen)

Before you create a broadcast, you need an avatar video. Think of it like hiring a news anchor - do it once, reuse it for every video.

1. **Sign up for HeyGen:**
   - Go to: https://heygen.com
   - Free tier gives you 3 minutes/month (perfect for testing!)
   - No credit card required for trial

2. **Create avatar video:**
   - Click **"Create Video"** → **"Instant Avatar"**
   - Paste this test script:
     ```
     Good evening. I'm bringing you the latest news. Stay tuned for breaking updates.
     ```
   - Pick any avatar (try "Professional News Anchor" category)
   - Click **"Generate"** (takes 1-2 minutes)
   - Download the `.mp4` file when ready

3. **Optimize if needed:**
   - If file is >10MB, it might slow down rendering
   - Use HandBrake (free tool) to reduce to 640x360
   - Or just try uploading - system handles most files fine

### Part 2: Create Your First Broadcast (2 Minutes)

1. **Open the app:**
   - System tray (bottom-right corner) → Right-click Obsidian News Desk icon
   - Click **"Open Dashboard"**
   - Or just go to: http://localhost:8347

2. **Click "New Broadcast"** (or press `N`)

3. **Write your script:**
   Here's a sample you can use:
   ```
   Good evening. Breaking news from the technology sector tonight. TechCorp has announced
   a landmark partnership with artificial intelligence innovator DataFlow. The collaboration
   aims to revolutionize cloud computing infrastructure across enterprise markets. Industry
   analysts are predicting significant disruption in the coming quarter. The deal, valued
   at 2.5 billion dollars, marks one of the largest tech acquisitions this year. Implementation
   is expected to begin next quarter. This is your anchor, reporting live.
   ```

4. **Select AI Provider:**
   - **OpenAI (GPT-4)** ← Recommended (best quality)
   - Or **Google** (free tier, 60 requests/minute)

5. **Click "Create Broadcast"**

### Part 3: Wait for Images (15-20 Minutes) ☕

Now the magic happens automatically:

**What's going on:**
- 🤖 AI analyzes your script (~30 seconds)
- 🎨 Generates 8 background images (~2 minutes each)
- 📊 Updates in real-time (you can watch progress)

**What you should do:**
- ☕ Make coffee
- 📧 Check email
- 📖 Read the rest of the docs
- 🎮 Play a game (just don't close the browser!)

**How to know it's done:**
- Status changes to **"REVIEW ASSETS"**
- All scene cards show green "COMPLETED" badges
- You see 8 images in the storyboard editor

### Part 4: Review & Upload Avatar (2 Minutes)

1. **Review images:**
   - Press `J` or `K` to navigate through scenes
   - Check that images match the script
   - If any image looks weird, press `R` to regenerate

2. **Upload your avatar:**
   - Scroll to bottom (Avatar Upload Zone)
   - Drag & drop your HeyGen `.mp4` file
   - Or click **"Upload Avatar MP4"** button

3. **Click "COMPILE & RENDER"**
   - Wait ~2-3 minutes for final video
   - Progress bar shows rendering status

### Part 5: Download Your Video! 🎉

When status shows **"COMPLETED"**:

1. Video preview appears at bottom of page
2. Press play to watch it!
3. Click **"DOWNLOAD FINAL VIDEO"**
4. Video saved to your Downloads folder

**Video specs:**
- Resolution: 1920x1080 (Full HD)
- Frame rate: 30fps
- Format: MP4 (H.264)
- File size: ~50-100MB for 60-second video

**🎉 BOOM! You just created a professional news broadcast!**

---

## 🎛️ Using the System Tray

After installation, Obsidian News Desk runs in the background. Look for the icon in your system tray (bottom-right corner):

**Right-click the icon to see:**
- **Open Dashboard** - Opens http://localhost:8347 in browser
- **Start All Services** - If services stopped
- **Stop All Services** - Graceful shutdown
- **View Logs** - Opens log folder (for troubleshooting)
- **Settings** - Configure API keys, storage location
- **Exit** - Close the application

**Status indicator:**
- 🟢 **Green icon** - Everything running perfectly
- 🔴 **Red icon** - Services stopped (click "Start All Services")

---

## ⌨️ Essential Keyboard Shortcuts

Speed up your workflow with these hotkeys (press `?` in the app to see them all):

| Key | What It Does |
|-----|--------------|
| `N` | Create new broadcast |
| `J` / `K` | Navigate broadcasts (like vim!) |
| `Enter` | Open selected broadcast |
| `R` | Regenerate current scene image |
| `E` | Edit ticker headline |
| `U` | Upload custom image |
| `?` | Show all shortcuts |
| `Esc` | Close modal / Go back |

**Pro tip:** Once you learn J/K/R/E, you can edit broadcasts without ever touching your mouse! 🚀

---

## 🔧 Troubleshooting

### "Docker is not running" Error
**Fix:**
1. Look for whale icon 🐳 in system tray
2. If it's not there, search for "Docker Desktop" in Start menu
3. Click to start it
4. Wait for icon to stop animating (30-60 seconds)
5. Try again in the app

### "System Offline" in Dashboard
**Fix:**
1. Open system tray (bottom-right corner)
2. Right-click Obsidian News Desk icon
3. Click **"Start All Services"**
4. Wait 10-15 seconds
5. Refresh browser

### Images Stuck on "Generating..."
**Most common cause:** Whisk token expired (tokens last ~1 hour)

**Fix (Automatic - Recommended):**
1. Make sure Chrome extension is installed (tutorial page 3 showed how)
2. Visit: https://labs.google.com/whisk
3. Generate any test image
4. Extension captures token automatically
5. Done! It'll auto-refresh every 50 minutes

**Fix (Manual - if extension didn't work):**
1. Open https://labs.google.com/whisk in Chrome
2. Press `F12` (opens Developer Tools)
3. Click "Network" tab
4. Generate a test image on Whisk
5. Find request named "generateImage"
6. Click it → "Headers" tab
7. Scroll to "Request Headers" → Find "Authorization"
8. Copy everything after "Bearer " (starts with `ya29.a0...`)
9. In Obsidian News Desk: Settings → Whisk Token → Paste
10. Click "Save"

### Avatar Upload Fails
**Fix:**
- Make sure file is `.mp4` format (not `.mov`, `.avi`, `.mkv`)
- If HeyGen gave you a different format:
  - Re-export from HeyGen (try downloading again)
  - Or convert to MP4 using HandBrake (free tool)
- Check file isn't corrupted (try playing it in VLC media player)

### Video Has Black Screens
**Fix:**
- This was a bug in v1.0 - fixed in v1.1!
- Download latest installer from GitHub Releases
- Reinstall (keeps all your data)

### "Port 8347 already in use"
**Fix:**
- Something else is using that port
- Close other apps (especially other web servers)
- Or restart your computer (nuclear option, but works!)

### Render Takes Forever (>10 Minutes)
**Fix:**
- Check avatar file size:
  - Open file properties (right-click → Properties)
  - If it's >10MB, optimize it:
    - Use HandBrake: Set dimensions to 640x360
    - Or use included `optimize-avatar.sh` script
- Large avatar files can timeout Remotion's headless browser

**Still stuck?** Check the full troubleshooting guide: **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**

---

## 📁 Where Are My Files?

**Default storage location:**
```
C:\Users\YourName\ObsidianNewsDesk\
├── images\     ← Scene background images (auto-generated by Whisk)
├── avatars\    ← HeyGen avatar MP4s you uploaded
└── videos\     ← Final rendered broadcast videos
```

**Can I move this?**
- Yes! Settings → Storage Location → Browse → Pick new folder
- System will copy everything to new location
- Old files stay in old location (you can delete them manually)

---

## 🎯 Performance Expectations

Here's what to expect (based on real production tests):

**For a 60-second video:**
- ✍️ **Script Analysis:** 30-60 seconds (AI reading your script)
- 🎨 **Image Generation:** 15-20 minutes (8 scenes, Whisk API)
- 👤 **Avatar Upload:** 30 seconds (you dragging the file)
- 🎬 **Video Rendering:** 2-3 minutes (Remotion compositing)

**Total:** 20-30 minutes (mostly automated waiting)

**For a 40-minute video:**
- Same analysis time (~1 minute)
- Longer image generation (~25-30 minutes - more scenes)
- Same upload time (~30 seconds)
- Longer rendering time (~60-90 minutes)

**Total:** 90-120 minutes for long-form content

**The cool part?** You're only actively working for ~5 minutes total. The rest is the AI doing its thing! 🤖

---

## 🆘 Need More Help?

### Documentation
- **Quick Start:** [QUICKSTART.md](QUICKSTART.md) - 5-minute ultra-fast guide
- **Full Installation:** [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Detailed step-by-step with screenshots
- **Troubleshooting:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Solutions to common problems
- **Advanced:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md) - Power user features

### Support
- **GitHub Issues:** https://github.com/konradschrein-star/pol-production-line/issues
- **Changelog:** [CHANGELOG.md](CHANGELOG.md) - See what's new in each version

---

## 🎉 You're All Set!

**Recap of what you did:**
1. ✅ Installed Docker Desktop
2. ✅ Ran Obsidian News Desk installer
3. ✅ Got your API keys
4. ✅ Completed the tutorial
5. ✅ Created your first video

**What's next?**
- 🎨 Experiment with different scripts (politics, tech, weather)
- 🎭 Try different HeyGen avatars
- ⚙️ Create style presets for consistent look
- 🚀 Use keyboard shortcuts to speed up your workflow

**Have fun creating professional news videos!** 🎬✨

If you get stuck, remember: Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) first, then open a GitHub issue if you're still stuck.

---

**Pro tip:** After you've made a few videos, read [docs/USER_GUIDE.md](docs/USER_GUIDE.md) to learn about advanced features like:
- Reference images (consistent visual style across videos)
- Style presets (save your favorite configurations)
- Bulk operations (manage multiple broadcasts at once)
- Custom ticker text (edit headlines for each scene)

Happy broadcasting! 📺🎙️
