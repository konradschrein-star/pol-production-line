# Installer Quick Start Guide

This guide will help you build and test the enhanced Obsidian News Desk installer in under 10 minutes.

---

## Prerequisites

- [x] Windows 10/11
- [x] Node.js 20+ (already have it)
- [x] Docker Desktop (for testing)
- [x] Git (for version control)

---

## Step 1: Compile Electron Code (First Time Setup)

The Electron TypeScript code needs to be compiled before building the installer.

```bash
cd obsidian-news-desk
npm run electron:compile
```

**What this does:**
- Compiles all TypeScript files in `electron/src/` → `electron/dist/`
- Creates:
  - `main.js` (main process)
  - `preload.js` (preload script)
  - `logger.js`, `tray.js`, `updater.js`, etc.

**Expected output:**
```
Successfully compiled 15 files with TypeScript
```

**Fix TypeScript errors (if any):**
```bash
# Check for errors
tsc -p tsconfig.electron.json --noEmit

# Common fixes:
# - Missing import statements
# - Type mismatches
# - Missing type declarations
```

---

## Step 2: Create Placeholder Icons (Temporary)

The installer requires icons, but you don't have production icons yet. Let's create temporary placeholders.

### Option A: Use Existing Icon (Quick)

Find any `.ico` file on your system and copy it:

```bash
cd electron/build

# Example: Use Windows default icon (if available)
# Or download a placeholder from https://icon.horse/ or similar
copy "C:\path\to\any\icon.ico" icon.ico
```

### Option B: Generate Simple Icon Online (5 minutes)

1. Go to https://favicon.io/favicon-generator/
2. Create a simple text icon: "OND" (Obsidian News Desk)
3. Download the generated `.ico` file
4. Save as `electron/build/icon.ico`

### Create Installer Graphics (BMP files)

For now, skip the BMP files - electron-builder can work without them. You'll just get a plain installer.

**To create them later:**
- `installerHeader.bmp` (150x57) - Top banner
- `installerSidebar.bmp` (164x314) - Left sidebar

Use any image editor (Paint, GIMP, Photoshop) to create simple colored rectangles.

---

## Step 3: Test in Development Mode

Before building the installer, test that everything works in development mode.

```bash
npm run electron:dev
```

**What should happen:**
1. Next.js dev server starts (port 8347)
2. Electron window opens automatically
3. If first run: Setup wizard appears
4. If configured: Services start → Tutorial → Main window

**Testing the wizard:**
1. Delete config: `%APPDATA%\obsidian-news-desk-config\config.json`
2. Restart: `npm run electron:dev`
3. Wizard should appear

**Testing the tutorial:**
Open config file, set:
```json
{
  "tutorialComplete": false
}
```
Restart to see tutorial.

---

## Step 4: Build the Installer

Now build the actual `.exe` installer.

### Quick Build (Test Only)

Build unpacked app for faster testing (no installer):

```bash
npm run electron:build:dir
```

**Output:** `dist/win-unpacked/Obsidian News Desk.exe`

**Test it:**
```bash
cd dist/win-unpacked
"Obsidian News Desk.exe"
```

### Full Installer Build

Build the NSIS installer:

```bash
npm run electron:build
```

**Build steps:**
1. Compiles Next.js (`npm run build`)
2. Compiles Electron TypeScript
3. Packages app with electron-builder
4. Creates NSIS installer

**Expected output:**
```
electron-builder 24.9.1
• packaging       platform=win32 arch=x64
• building        target=nsis
• building        target=nsis
  ✔ building      target=nsis
• electron-builder  Done
```

**Output file:**
`dist/Obsidian News Desk-Setup-1.0.0.exe` (~150-200 MB)

---

## Step 5: Test the Installer

### Install on Your Machine

**Option 1: Install normally**
```bash
cd dist
"Obsidian News Desk-Setup-1.0.0.exe"
```

**Option 2: Install to custom directory**
- Run installer
- Uncheck "Create desktop shortcut" (to avoid conflict with dev version)
- Choose custom install path: `C:\ObsidianNewsDesk-Test\`

### What to Test

**1. First Run Experience:**
- [ ] Installer completes without errors
- [ ] Desktop shortcut created
- [ ] App launches automatically
- [ ] Setup wizard appears (6 pages)
- [ ] Can configure API keys
- [ ] Tutorial appears after wizard
- [ ] Services start successfully

**2. Services:**
- [ ] Docker containers start (postgres, redis)
- [ ] BullMQ workers spawn
- [ ] Next.js server starts
- [ ] Browser opens to localhost:8347

**3. System Tray:**
- [ ] Tray icon appears in system tray
- [ ] Right-click shows menu
- [ ] "Open Dashboard" works
- [ ] "View Logs" opens logs folder
- [ ] "Quit" stops all services

**4. Minimize to Tray:**
- [ ] Close window → App minimizes to tray
- [ ] Services keep running
- [ ] Notification appears (first time)
- [ ] Click tray → "Open Dashboard" → Window reappears

**5. Auto-Update (if GitHub releases configured):**
- [ ] App checks for updates on startup
- [ ] No errors in logs

### Uninstall Test

**Windows Settings:**
1. Open "Add or remove programs"
2. Find "Obsidian News Desk"
3. Click "Uninstall"
4. Verify complete removal

**Manual cleanup (if needed):**
```bash
rmdir /s "C:\Program Files\Obsidian News Desk"
rmdir /s "%APPDATA%\obsidian-news-desk"
rmdir /s "%APPDATA%\obsidian-news-desk-config"
```

---

## Step 6: Build for Distribution

Once testing is complete, build the final installer for distribution.

### Update Version Number

Edit `package.json`:
```json
{
  "version": "1.0.0"
}
```

### Clean Build

```bash
# Clean old builds
rmdir /s dist

# Build fresh installer
npm run electron:build
```

### Verify Build

Check file size and content:
```bash
cd dist
dir "Obsidian News Desk-Setup-1.0.0.exe"
```

Expected: 150-200 MB

### Test on Clean VM (Optional but Recommended)

**Best practice:** Test on a fresh Windows 10/11 VM with:
- No Node.js installed
- No Docker installed
- No prior configuration

This simulates your friend's experience.

---

## Step 7: Distribute to Friend

### Option 1: GitHub Releases (Recommended)

**Advantages:**
- Auto-updates work
- Download history/stats
- Release notes
- Version tracking

**Steps:**
1. Create GitHub release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. Upload installer to release:
   - Go to GitHub → Releases → Draft new release
   - Tag: v1.0.0
   - Upload: `Obsidian News Desk-Setup-1.0.0.exe`
   - Add release notes
   - Publish

3. Send friend the release URL:
   ```
   https://github.com/konradschrein-star/pol-production-line/releases/tag/v1.0.0
   ```

### Option 2: Direct File Transfer

**Advantages:**
- Faster for one-time distribution
- No GitHub account needed

**Methods:**
- Google Drive / Dropbox shared link
- WeTransfer (free, up to 2GB)
- Direct USB transfer

**Note:** Auto-updates won't work without GitHub releases

---

## Troubleshooting

### Build Fails: Icon Not Found

**Error:**
```
Error: Application icon is not set
```

**Fix:**
Create placeholder icon:
```bash
cd electron/build
# Add any .ico file as icon.ico
```

### Build Fails: TypeScript Errors

**Error:**
```
src/main.ts:10:5 - error TS2304: Cannot find name 'ServiceManager'
```

**Fix:**
```bash
# Check for syntax errors
npm run electron:compile

# Fix imports, then rebuild
npm run electron:build
```

### App Won't Start: Missing Dependencies

**Error:**
```
Error: Cannot find module 'electron-updater'
```

**Fix:**
```bash
# Reinstall dependencies
npm install

# Rebuild
npm run electron:build
```

### App Won't Start: Port Conflicts

**Error:** Port 8347 in use

**Fix:**
1. Close other instances of the app
2. Check for running processes: `netstat -ano | findstr 8347`
3. Kill process: `taskkill /PID <pid> /F`

### Docker Containers Won't Start

**Error:** Docker compose failed

**Fix:**
1. Ensure Docker Desktop is running
2. Manually test: `docker-compose up` in project directory
3. Check Docker logs in app logs folder

---

## Next Steps

### Before Friend Distribution

**Required:**
- [ ] Test complete end-to-end workflow (script → video)
- [ ] Verify all API keys work
- [ ] Test on clean Windows VM
- [ ] Create production icons (see `electron/build/ICON_REQUIREMENTS.md`)
- [ ] Write release notes

**Optional:**
- [ ] Get code signing certificate (~$400/year) to avoid SmartScreen warning
- [ ] Set up GitHub Actions for automated builds
- [ ] Create video tutorial for friend

### After Distribution

**Monitor:**
- Friend's feedback during setup
- Any error logs they encounter
- Feature requests

**Plan Updates:**
- Version 1.1.0 with bug fixes
- Test auto-update flow
- Iterate based on feedback

---

## Quick Reference

### Build Commands

```bash
# Development
npm run electron:dev              # Run in dev mode

# Testing
npm run electron:compile          # Compile TypeScript only
npm run electron:build:dir        # Build unpacked app (fast test)

# Production
npm run electron:build            # Build full installer
npm run electron:build:portable   # Build portable version (no install)

# Publishing
npm run electron:publish          # Build + upload to GitHub releases
```

### Important Paths

```
Config:     %APPDATA%\obsidian-news-desk-config\config.json
Logs:       %APPDATA%\obsidian-news-desk\logs\
Install:    C:\Program Files\Obsidian News Desk\
Storage:    C:\Users\[user]\ObsidianNewsDesk\
Build:      obsidian-news-desk\dist\
```

### Testing Shortcuts

**Reset to first run:**
```bash
rmdir /s "%APPDATA%\obsidian-news-desk-config"
```

**View logs:**
```bash
explorer "%APPDATA%\obsidian-news-desk\logs"
```

**Test update flow:**
1. Install v1.0.0
2. Build v1.1.0
3. Create GitHub release
4. App should notify about update

---

## Success Checklist

Before sending to friend, verify:

- [x] Installer builds without errors
- [x] App starts on fresh machine
- [x] Wizard guides through setup
- [x] Tutorial shows on first run
- [x] All services start automatically
- [x] Can create a test broadcast
- [x] Can render a test video
- [x] System tray works
- [x] Minimize to tray works
- [x] Logs are being created
- [x] Uninstaller works

**If all checked → Ready for distribution! 🎉**

---

## Support

**For build issues:**
- Check `npm run electron:compile` output
- Review TypeScript errors
- Verify all dependencies installed

**For runtime issues:**
- Check logs: `%APPDATA%\obsidian-news-desk\logs\electron.log`
- Test services manually: `docker-compose up`
- Verify ports are free: `netstat -ano | findstr "8347 5432 6379"`

**For distribution issues:**
- Verify GitHub releases permissions
- Check file size (should be 150-200 MB)
- Test download URL is accessible

---

**Total Time:** ~30 minutes from zero to installable .exe
**Difficulty:** Medium (mostly automated)
**Result:** Professional installer ready for friend distribution
