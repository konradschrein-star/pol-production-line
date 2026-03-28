# Installer Test Checklist

**Date Created:** March 28, 2026
**Purpose:** End-to-end validation of the Obsidian News Desk Windows installer

---

## Pre-Installation Checks

### Installer Package Validation

- [ ] **Download installer** from `dist/Obsidian News Desk-Setup-1.0.0.exe`
- [ ] **Verify file size** (~200-300 MB with bundled Node.js)
- [ ] **Check digital signature** (if code signing is enabled)
  - Right-click → Properties → Digital Signatures tab
  - Verify publisher: "Obsidian News Desk"
- [ ] **Windows SmartScreen check**
  - If SmartScreen warning appears, note the behavior
  - Expected: "Windows protected your PC" (unsigned builds)

### System Preparation

- [ ] **Test on clean Windows 11 machine** (fresh VM recommended)
- [ ] **Ensure Docker Desktop NOT installed** (for fresh install test)
- [ ] **Ensure Node.js NOT installed** (to test bundled runtime)
- [ ] **Close all browsers** (for clean test)
- [ ] **Free disk space** >20GB available

---

## Installation Flow

### Installer Execution

- [ ] **Run installer as Administrator**
  - Right-click → Run as administrator
- [ ] **Verify welcome screen** displays correctly
  - Obsidian News Desk branding visible
  - Version number correct
  - Description text readable

### Installation Options

- [ ] **Choose installation directory**
  - Default: `C:\Program Files\Obsidian News Desk`
  - Test custom directory: `C:\CustomPath\ObsidianNewsDesk`
- [ ] **Verify disk space check** before installation
- [ ] **Desktop shortcut option** selected by default
- [ ] **Start Menu shortcut option** selected by default

### Installation Progress

- [ ] **Progress bar** updates smoothly (0-100%)
- [ ] **File extraction** completes without errors
- [ ] **Registry entries** created (for auto-start feature)
- [ ] **Shortcuts created:**
  - Desktop: "Obsidian News Desk.lnk"
  - Start Menu: "Obsidian News Desk" folder with shortcuts
- [ ] **Installation completes** with success message

---

## First-Run Wizard

### Wizard Launch

- [ ] **Wizard opens automatically** after installation
- [ ] **Window size** 800x700, centered on screen
- [ ] **Dark theme** (#1a1a1a background) applied correctly
- [ ] **Progress indicator** shows "Step 1 of 7"

### Step 1: Welcome

- [ ] **Welcome message** displays correctly
- [ ] **System requirements** listed and readable
- [ ] **Estimated time** shown (~5-10 minutes)
- [ ] **"Next" button** enabled and responsive

### Step 2: Prerequisites Check

- [ ] **Docker Desktop detection** works correctly
  - ❌ NOT INSTALLED: Shows install instructions + download link
  - ✅ INSTALLED: Shows "Docker Desktop detected"
  - ⚠️ INSTALLED BUT NOT RUNNING: Shows "Start Docker" button
- [ ] **Docker start button** (if needed) starts Docker Desktop
- [ ] **"Next" button** disabled until Docker is running
- [ ] **Status messages** update in real-time

### Step 3: Storage Path Selection

- [ ] **Default path** auto-filled: `C:\Users\{USERNAME}\ObsidianNewsDesk`
- [ ] **"Browse" button** opens directory picker dialog
- [ ] **Path validation** works:
  - Invalid path → Red error message
  - Valid path → Green success message with disk space
- [ ] **Disk space check** displays available GB
  - <10GB → Warning message displayed
  - ≥10GB → Success message displayed
- [ ] **"Next" button** disabled until valid path entered

### Step 4: AI Provider Selection

- [ ] **Dropdown** shows 4 options:
  - OpenAI (GPT-4)
  - Anthropic Claude
  - Google Gemini
  - Groq
- [ ] **Default selection** is OpenAI
- [ ] **API key input field** displays:
  - Placeholder with correct prefix (e.g., "sk-...")
  - Password field (masked input)
- [ ] **"Test Connection" button** validates API key:
  - Shows spinner while validating
  - ✅ Valid → Green success message with model access info
  - ❌ Invalid → Red error message with details
- [ ] **Whisk token field** displays below AI provider
  - Placeholder: "ya29.a0..."
  - Help link to https://labs.google.com/whisk
- [ ] **"Next" button** disabled until API key validated

### Step 5: Database Initialization

- [ ] **Progress steps** display:
  - ○ Pulling Docker images
  - ○ Starting containers
  - ○ Waiting for services
  - ○ Initializing schema
- [ ] **Real-time status updates**:
  - "Pulling postgres:17..." → ✓ Complete
  - "Pulling redis:7..." → ✓ Complete
- [ ] **Progress bar** advances (0% → 25% → 50% → 100%)
- [ ] **Error handling:**
  - If Docker fails → Clear error message displayed
  - "Retry" button appears on error
- [ ] **All services running** confirmed before proceeding

### Step 6: Installation Progress

- [ ] **Log output** displays real-time messages:
  - "Creating storage directories..." → ✓
  - "Generating .env configuration..." → ✓
  - "Starting BullMQ workers..." → ✓
- [ ] **No errors** in log output
- [ ] **Progress bar** reaches 100%
- [ ] **"Next" button** enabled after completion

### Step 7: Complete

- [ ] **Success message** displayed
- [ ] **Storage location** shown correctly
- [ ] **"Launch Application" button** visible and clickable
- [ ] **Tutorial checkbox** (optional) - "Show tutorial on first launch"

---

## Post-Installation Validation

### Application Launch

- [ ] **Main window opens** at `http://localhost:8347`
- [ ] **System tray icon** visible in taskbar notification area
  - Right-click → Shows context menu:
    - Open Dashboard
    - Settings
    - Check for Updates
    - Quit
- [ ] **Tutorial window** opens (if checkbox was selected)
- [ ] **Dashboard loads** without errors

### Services Check

- [ ] **Docker containers running:**
  - `obsidian-news-desk-postgres-1` (Up, healthy)
  - `obsidian-news-desk-redis-1` (Up, healthy)
- [ ] **BullMQ workers** process started
  - Check Task Manager → "Node.js" process running
  - PID visible in system tray tooltip
- [ ] **Next.js server** running on port 8347
  - Browser accessible: http://localhost:8347
  - API routes respond: http://localhost:8347/api/health

### File System Validation

- [ ] **Program Files directory** contains:
  - `Obsidian News Desk.exe` (main executable)
  - `resources/node/node.exe` (bundled Node.js)
  - `resources/bin/ffmpeg.exe` (FFmpeg binary)
  - `.next/` (Next.js build output)
  - `electron/dist/` (Compiled Electron code)
- [ ] **User storage directory** created:
  - `C:\Users\{USERNAME}\ObsidianNewsDesk\images\`
  - `C:\Users\{USERNAME}\ObsidianNewsDesk\avatars\`
  - `C:\Users\{USERNAME}\ObsidianNewsDesk\videos\`
- [ ] **.env file** generated correctly:
  - AI_PROVIDER set correctly
  - API keys stored (verify with `type .env` in install dir)
  - Database URL correct: `postgresql://...@localhost:5432/obsidian_news`

### Functional Testing

- [ ] **Create new broadcast:**
  - Click "New Broadcast" button
  - Paste sample script
  - Click "Analyze Script"
  - Job appears in broadcasts table
- [ ] **Queue system working:**
  - Job transitions: pending → analyzing → generating_images
  - Real-time status updates visible
- [ ] **Database writes:**
  - Job record created in `news_jobs` table
  - Scene records created in `news_scenes` table

---

## Runtime Behavior

### Auto-Start Feature

- [ ] **Enable auto-start:**
  - Open app Settings → System
  - Toggle "Start with Windows" → ON
  - Minimize to tray option available
- [ ] **Restart computer**
- [ ] **Verify app starts automatically:**
  - System tray icon appears after login
  - Window minimized to tray (if option selected)
  - Services running (Docker, workers, Next.js)

### Minimize to Tray

- [ ] **Click minimize button** (or X)
  - Window hides (not closes)
  - Tray icon remains visible
- [ ] **Right-click tray icon** → "Open Dashboard"
  - Window restores from tray
- [ ] **Right-click tray icon** → "Quit"
  - All services stop gracefully
  - App fully exits

### Update Check (if configured)

- [ ] **Open Settings** → "Check for Updates"
- [ ] **Update notification** appears (if new version available)
  - "Download Update" button visible
- [ ] **Download progress** displays (0-100%)
- [ ] **"Install and Restart" button** appears after download
- [ ] **Click "Install and Restart"**
  - App quits gracefully
  - Installer runs automatically
  - App restarts with new version

---

## Error Scenarios

### Docker Not Running

- [ ] **Stop Docker Desktop** while app is running
- [ ] **Verify graceful handling:**
  - Error message: "Docker containers stopped"
  - Retry button appears
  - Clicking retry restarts Docker services
- [ ] **No crashes or data loss**

### Port Conflicts

- [ ] **Start another service on port 8347** (e.g., IIS, Apache)
- [ ] **Launch app**
- [ ] **Verify error message:** "Port 8347 already in use"
- [ ] **Suggested ports** offered (8348, 8349, etc.)

### Insufficient Disk Space

- [ ] **Fill disk to <5GB free**
- [ ] **Attempt video rendering**
- [ ] **Verify warning:** "Low disk space (4.2GB available)"
- [ ] **Rendering blocked** until space freed

### Invalid API Key

- [ ] **Enter invalid OpenAI key** in Settings
- [ ] **Attempt to create broadcast**
- [ ] **Verify error:** "API authentication failed"
- [ ] **Link to Settings** displayed in error message

### Whisk Token Expiration

- [ ] **Wait 1 hour** (token expires)
- [ ] **Attempt image generation**
- [ ] **Verify 401 error** handled gracefully
- [ ] **Token refresh instructions** displayed:
  - Link to https://labs.google.com/whisk
  - F12 → Network → Copy Bearer token

---

## Uninstallation

### Uninstaller Execution

- [ ] **Open Control Panel** → Programs → Uninstall
- [ ] **Find "Obsidian News Desk"** in program list
- [ ] **Click "Uninstall"**
  - Uninstaller window opens
  - Confirmation dialog: "Are you sure?"

### Cleanup Options

- [ ] **Prompt to delete user data:**
  - "Remove videos, images, and avatars from `C:\Users\...\ObsidianNewsDesk`?"
  - Options: Delete All, Keep Data, Cancel
- [ ] **Test "Keep Data" option:**
  - App files removed from Program Files
  - User data remains intact in storage directory
- [ ] **Test "Delete All" option:**
  - App files removed
  - User data deleted completely

### Post-Uninstall Validation

- [ ] **Program Files** directory removed:
  - `C:\Program Files\Obsidian News Desk\` deleted
- [ ] **Shortcuts removed:**
  - Desktop shortcut deleted
  - Start Menu folder deleted
- [ ] **Registry entries cleaned:**
  - Auto-start registry key removed
- [ ] **User data** (only if "Delete All" selected):
  - `C:\Users\{USERNAME}\ObsidianNewsDesk\` deleted
- [ ] **Docker containers** still running (manual cleanup required):
  - Run `docker-compose down` to remove containers

---

## Stress Testing

### Large File Handling

- [ ] **Generate 50 broadcasts** sequentially
- [ ] **Verify disk space management:**
  - Old videos auto-deleted if <10GB free (if configured)
  - Warning displayed when approaching limit
- [ ] **Check database performance:**
  - Query speed remains acceptable (<500ms)
  - No memory leaks (check Task Manager → Memory usage)

### Concurrent Operations

- [ ] **Start 3 broadcast jobs** simultaneously
- [ ] **Verify queue processing:**
  - Workers process jobs in order
  - No race conditions or deadlocks
  - All 3 jobs complete successfully

### Long-Running Sessions

- [ ] **Leave app running for 24 hours**
- [ ] **Verify stability:**
  - No memory leaks (memory usage stable)
  - Docker containers remain healthy
  - Workers still responsive
- [ ] **Generate broadcast after 24h**
  - Everything works correctly
  - No performance degradation

---

## Documentation Validation

### User-Facing Docs

- [ ] **README.md** (in install directory):
  - Quick start guide present
  - Troubleshooting section complete
  - Links to documentation site
- [ ] **LICENSE** file present and readable
- [ ] **CHANGELOG.md** lists version history

### Tutorial System

- [ ] **Tutorial covers:**
  - Keyboard shortcuts (J/K navigation)
  - Whisk token setup (updated, no Chrome extension)
  - HeyGen avatar workflow
  - First broadcast walkthrough
- [ ] **Tutorial can be skipped** without errors
- [ ] **Tutorial can be reopened** from Help menu

---

## Test Results Summary

### Pass Criteria

- ✅ **Installer executes** without errors
- ✅ **Wizard completes** successfully (all 7 steps)
- ✅ **Services start automatically**
- ✅ **First broadcast** generates successfully (end-to-end test)
- ✅ **Auto-start** works after reboot
- ✅ **Uninstaller** removes app cleanly

### Known Issues (if any)

| Issue | Severity | Workaround |
|-------|----------|------------|
| Example: Windows SmartScreen warning on unsigned builds | Low | Click "More info" → "Run anyway" |
|       |          |            |

### Test Environment

- **OS:** Windows 11 Home 10.0.26200
- **Docker Desktop:** Version 4.x (latest)
- **Disk Space:** 50GB free
- **RAM:** 16GB
- **Installer Version:** 1.0.0
- **Test Date:** YYYY-MM-DD

---

## Sign-Off

**Tested By:** ___________________
**Date:** ___________________
**Status:** ⬜ PASS | ⬜ FAIL | ⬜ BLOCKED
**Notes:**

---

## Next Steps

After successful testing:

1. **Code Signing (Optional):**
   - Obtain EV code signing certificate
   - Configure electron-builder with certificate
   - Re-build installer with signature

2. **Release Process:**
   - Tag release in Git: `git tag v1.0.0`
   - Push to GitHub: `git push origin v1.0.0`
   - Upload installer to GitHub Releases
   - Update documentation with download link

3. **Distribution:**
   - Share installer with beta testers
   - Collect feedback and iterate
   - Monitor auto-update system for issues
