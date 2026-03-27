# Quick Start - 5 Minutes to Your First Video

**Want to create a professional news video NOW?** This is the ultra-fast guide. Full details are in [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).

---

## Step 1: Install (2 minutes)

**Before you start:**
- ✅ Download & install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- ✅ Restart your computer after Docker installation
- ✅ Start Docker Desktop (wait for the whale icon in system tray to turn green)

**Install Obsidian News Desk:**
1. Download installer from [GitHub Releases](https://github.com/konradschrein-star/pol-production-line/releases/latest)
2. Run `ObsidianNewsDesk-Setup.exe`
3. Click through the 6-page wizard:
   - Welcome → Docker check → Storage location → API keys → Database → Install
4. Click "Launch Application" when complete

---

## Step 2: Setup (10 minutes)

**Get API keys:**

1. **OpenAI API Key** (required for script analysis)
   - Go to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-...`)
   - Paste into wizard on API Configuration page

2. **Whisk Token** (required for image generation)
   - **Automatic method** (recommended): Chrome extension handles this
   - Extension is bundled with installer - tutorial walks you through setup
   - Takes 2 minutes to install

3. **HeyGen Account** (required for avatar videos)
   - Sign up at https://heygen.com
   - Free tier available (5 videos/month)
   - No API key needed - manual workflow

**Complete the tutorial:**
- After installation, a 5-page interactive tutorial launches
- Learn keyboard shortcuts, Whisk setup, and avatar workflow
- Takes ~5 minutes to read through

---

## Step 3: First Video (15 minutes)

### 3.1 Generate Avatar Script (3 minutes)

The system needs an avatar video to overlay on your broadcast. Generate this once and reuse it:

1. Open HeyGen.com in browser
2. Click "Create Video" → "Instant Avatar"
3. Use this test script:
   ```
   Good evening, I'm bringing you the latest news. Stay tuned for breaking updates.
   ```
4. Select any avatar (free tier has several options)
5. Click "Generate" (takes 2-3 minutes)
6. Download the `.mp4` file

### 3.2 Create Broadcast (2 minutes)

1. Open **http://localhost:8347** (launches automatically)
2. Press `N` (or click "New Broadcast")
3. Paste your news script (minimum 100 characters)
   - Example: "Breaking news in technology today. Scientists have made a groundbreaking discovery in renewable energy. The new solar panel design increases efficiency by 40% and could revolutionize the industry."
4. Click "Create Broadcast"
5. Wait for status to change to "Review Assets" (~15-20 minutes)

**While you wait:**
- Script analysis: ~30-60 seconds
- Image generation: ~15-20 minutes (8 scenes generated in parallel)
- You can close the browser - it runs in the background

### 3.3 Review & Render (10 minutes)

1. When job status shows "Review Assets", click the job to open storyboard editor
2. Review the 8 generated scene images
3. (Optional) Edit ticker headlines or regenerate images you don't like
4. Click "UPLOAD AVATAR" → Select the HeyGen `.mp4` you downloaded earlier
5. Click "COMPILE & RENDER"
6. Wait ~2-3 minutes
7. Download your video!

---

## Workflow Diagram

```
[News Script]
     ↓ 30-60s
[AI Analysis] → Extracts 8 scenes
     ↓ 15-20 min
[Image Gen] → 8 background images
     ↓
[REVIEW ASSETS] ← YOU REVIEW HERE
     ↓
[Upload Avatar MP4]
     ↓ 2-3 min
[Render Video]
     ↓
[Download Final Video!]

Total: ~25-40 minutes
```

---

## Essential Shortcuts

Press `?` in the app to see all shortcuts. Most useful:

- `N` - Create new broadcast
- `J` / `K` - Navigate broadcasts (like vim)
- `Enter` - Open selected broadcast
- `R` - Regenerate scene image
- `Esc` - Close modal / Go back

---

## Common First-Time Issues

**"System Offline" error:**
→ Make sure Docker Desktop is running (green whale icon in system tray)

**"Queue Paused" warning:**
→ Click "Resume Queue" button in the UI

**Images stuck on "Generating...":**
→ Whisk token expired - extension should auto-refresh, or manually update in Settings

**Avatar upload fails:**
→ File must be MP4 format - re-export from HeyGen if needed

**Video has black screens:**
→ Fixed in latest version - make sure you downloaded the newest installer

---

## Next Steps

📖 **Full Guide:** [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Detailed step-by-step with screenshots

🔧 **Troubleshooting:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Solutions to common issues

👥 **User Guide:** [README_FOR_FRIEND.md](README_FOR_FRIEND.md) - Friendly walkthrough for non-technical users

💻 **Developer Docs:** [CLAUDE.md](CLAUDE.md) - Architecture and technical details

---

**Ready?** Install the app and create your first video in under 20 minutes! 🚀
