# Phase 6: Immediate Next Steps

## Quick Start Guide

Phase 6 implementation is complete. Follow these steps to finalize the installer packaging:

## Step 1: Convert Tray Icons (5 minutes)

**Required before first release!**

### Option A: Using Batch Script (Recommended)

```bash
cd obsidian-news-desk
scripts\convert-tray-icons.bat
```

This script:
1. Checks if ImageMagick is installed
2. Converts all 4 SVG icons to ICO format
3. Shows file sizes and verification

### Option B: Manual Conversion

If you don't have ImageMagick:

1. Go to: https://convertio.co/svg-ico/
2. Upload each file from `resources\icons\`:
   - `tray-green.svg`
   - `tray-yellow.svg`
   - `tray-red.svg`
   - `tray-gray.svg`
3. Select icon sizes: 16x16, 32x32, 48x48
4. Download as .ico
5. Save to `resources\icons\`

### Verification

```bash
cd resources\icons
dir *.ico
```

**Expected output:**
- `tray-green.ico` (~5-10 KB)
- `tray-yellow.ico` (~5-10 KB)
- `tray-red.ico` (~5-10 KB)
- `tray-gray.ico` (~5-10 KB)

---

## Step 2: Test Auto-Updater UI (30 minutes)

### 2.1 Test "Check for Updates" Button

```bash
# Start dev mode
npm run electron:dev

# In app:
# 1. Go to Settings
# 2. Scroll to "Software Updates" card
# 3. Click "Check for Updates"
# 4. Verify message appears: "You are running the latest version."
```

### 2.2 Test Update Notification (Mock)

To test the notification UI without publishing a real release:

**Option 1: Temporarily modify `electron/src/updater.ts`**

Add this after line 27 (in `update-available` handler):

```typescript
// TEST: Simulate update available
setTimeout(() => {
  showUpdateAvailableDialog({
    version: '99.99.99',
    releaseNotes: 'Test update - this is a mock notification',
    releaseDate: new Date().toISOString(),
  });
}, 5000);
```

Restart app, wait 5 seconds, notification should appear.

**Option 2: Create Test Release**

```bash
# Create test tag
git tag v0.0.1-test
git push origin v0.0.1-test

# Wait for GitHub Actions to build (~15 minutes)
# Install v0.0.1-test on VM
# In app, click "Check for Updates"
# Should show "Update available" if you tag higher version
```

---

## Step 3: Build Production Installer (10 minutes)

### 3.1 Bump Version

```bash
cd obsidian-news-desk

# Update package.json version
npm version patch  # 1.0.0 → 1.0.1
# OR
npm version minor  # 1.0.0 → 1.1.0
# OR manually edit package.json
```

### 3.2 Build Installer

```bash
npm run build
npm run electron:build
```

**Output:** `dist\Obsidian News Desk-Setup-1.0.0.exe` (~2-2.5 GB)

**Build time:** 5-10 minutes (depends on CPU)

---

## Step 4: Test Installer on Clean VM (1 hour)

### 4.1 Setup VM

**Recommended:**
- Windows 10 Pro 22H2 or Windows 11 Pro 23H2
- 8 GB RAM, 50 GB disk
- No Docker Desktop installed

### 4.2 Installation Test

```
1. Copy installer to VM
2. Right-click → Run as administrator
3. Follow wizard:
   - Accept license
   - Choose install location
   - Enable "Create desktop shortcut"
   - Enable "Start with Windows"
   - Click "Install"
4. Wait 5-10 minutes
5. Launch app
6. Verify:
   ✅ App starts
   ✅ Docker installs (if not present)
   ✅ Services start automatically
   ✅ Main window loads (localhost:8347)
   ✅ System tray icon appears
   ✅ Tray icon is crisp (not pixelated) - ICO test!
```

### 4.3 Auto-Start Test

```
1. Restart VM
2. Wait 30-60 seconds
3. Verify:
   ✅ App launches automatically
   ✅ System tray icon appears
   ✅ Main window stays minimized
   ✅ Services start in background
```

### 4.4 Uninstall Test

```
1. Settings → Apps → Obsidian News Desk
2. Click "Uninstall"
3. Uncheck "Delete app data"
4. Complete uninstall
5. Verify:
   ✅ App removed from Program Files
   ✅ Shortcuts removed
   ✅ Data kept (C:\Users\...\ObsidianNewsDesk)
```

---

## Step 5: Create Production Release (5 minutes)

### 5.1 Prepare Release

```bash
# Ensure version is correct
cat package.json | findstr "version"

# Create changelog (optional)
# Edit CHANGELOG.md with release notes

# Commit all changes
git add .
git commit -m "chore: prepare v1.0.0 release"
git push
```

### 5.2 Tag and Push

```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0: Production ready with auto-updater UI"

# Push tag to trigger GitHub Actions
git push origin v1.0.0
```

### 5.3 Monitor Build

1. Go to: https://github.com/konradschrein-star/pol-production-line/actions
2. Click on workflow run for v1.0.0
3. Watch build progress (~15-20 minutes)

### 5.4 Verify Release

1. Go to: https://github.com/konradschrein-star/pol-production-line/releases
2. Verify v1.0.0 release created
3. Check asset: `Obsidian-News-Desk-Setup-1.0.0.exe` (2+ GB)
4. Read auto-generated release notes
5. Download and test installer

---

## Troubleshooting

### Tray icons not converting

**Error:** "magick: command not found"

**Solution:**
1. Install ImageMagick: https://imagemagick.org/script/download.php#windows
2. Check "Install legacy utilities" during installation
3. Restart terminal
4. Run `magick --version` to verify

**Alternative:**
- Use online converter: https://convertio.co/svg-ico/

### GitHub Actions build fails

**Error:** "Cannot find module..."

**Solution:**
1. Check `package.json` has all dependencies
2. Run `npm ci` locally to verify
3. Commit package-lock.json if missing

**Error:** "Authentication failed"

**Solution:**
- GitHub Actions uses automatic GITHUB_TOKEN
- No manual token needed
- Check repo has Actions enabled

### Auto-updater not detecting release

**Cause:** Release marked as "draft" or "pre-release"

**Solution:**
1. Go to GitHub Releases
2. Edit release
3. Uncheck "Set as a pre-release"
4. Uncheck "Save as draft"
5. Publish release

---

## Checklist

Before declaring Phase 6 complete:

- [ ] Tray icons converted to ICO format
- [ ] "Check for Updates" button tested
- [ ] Update notification UI tested
- [ ] Installer built successfully (~2-2.5 GB)
- [ ] Installer tested on clean VM
- [ ] Auto-start works after VM reboot
- [ ] Uninstall removes all files
- [ ] System tray icon displays correctly (crisp, not pixelated)
- [ ] GitHub Actions workflow tested (test tag)
- [ ] Production release created (v1.0.0)
- [ ] Auto-updater detects new release

---

## Quick Reference

### Key Files

- **Auto-updater UI:** `src/components/system/UpdateNotification.tsx`
- **Settings button:** `src/components/system/UpdateButton.tsx`
- **Icon converter:** `scripts/convert-tray-icons.bat`
- **Release workflow:** `.github/workflows/release.yml`

### Key Commands

```bash
# Convert icons
scripts\convert-tray-icons.bat

# Build installer
npm run electron:build

# Create release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Test in dev mode
npm run electron:dev
```

### Documentation

- **Code signing:** `docs/CODE_SIGNING.md` (optional)
- **Installer testing:** `docs/INSTALLER_TESTING.md`
- **Release process:** `docs/RELEASE_PROCESS.md`
- **Icon conversion:** `docs/CONVERT_TRAY_ICONS.md`
- **Phase 6 summary:** `docs/PHASE_6_SUMMARY.md`

---

## Support

**Issues?**
- Check `docs/PHASE_6_SUMMARY.md` for detailed troubleshooting
- Review workflow logs: https://github.com/.../actions
- Test on clean VM to isolate issues

**Ready for Production?**
- All checklist items above completed
- Installer tested on 2-3 different Windows versions
- Auto-update flow tested end-to-end
- Documentation reviewed and updated

**Next Phase:** Phase 7 - Testing & Quality Assurance
