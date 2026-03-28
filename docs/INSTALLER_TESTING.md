# Installer Testing Guide

## Test Matrix

| Test Case | Platform | Steps | Expected Result |
|-----------|----------|-------|-----------------|
| **Fresh Install** | Windows 10 | 1. Download installer<br>2. Run as admin<br>3. Complete wizard | App installed, shortcuts created |
| **Custom Location** | Windows 10 | 1. Run installer<br>2. Change install path<br>3. Complete | App installed in custom location |
| **Auto-Start Opt-In** | Windows 10 | 1. Run installer<br>2. Enable auto-start in wizard<br>3. Restart Windows | App launches on boot |
| **Upgrade Install** | Windows 10 | 1. Install v1.0.0<br>2. Install v1.0.1 over it | Settings preserved, app upgraded |
| **Uninstall** | Windows 10 | 1. Uninstall via Control Panel<br>2. Check Program Files<br>3. Check registry | App removed completely |
| **Uninstall + Data** | Windows 10 | 1. Create data<br>2. Uninstall with "Delete data"<br>3. Check storage path | App + data removed |
| **Auto-Update** | Windows 10 | 1. Install v1.0.0<br>2. Release v1.0.1<br>3. Check for updates | Update downloaded + installed |
| **Portable Launch** | Windows 10 | 1. Extract app.asar from installer<br>2. Run launcher.bat | App starts without Electron |

## Testing Procedure

### 1. Prepare Clean VM

- Windows 10 Pro (recommended) or Windows 11
- No Docker Desktop installed initially
- No existing Obsidian News Desk installation

### 2. Test Fresh Install

```
1. Download ObsidianNewsDesk-Setup-1.0.0.exe
2. Right-click → Run as administrator
3. Accept UAC prompt
4. Follow wizard:
   - Accept license (if shown)
   - Choose install location (default: C:\Program Files\Obsidian News Desk)
   - Enable "Create desktop shortcut"
   - Enable "Start with Windows"
   - Click "Install"
5. Wait for installation (5-10 minutes, 2+ GB)
6. Click "Launch Obsidian News Desk"
7. Verify:
   ✅ App launches
   ✅ Desktop shortcut created
   ✅ Start Menu shortcut created
   ✅ System tray icon appears
   ✅ Main window opens (http://localhost:8347)
   ✅ Docker starts automatically
```

### 3. Test Auto-Start

```
1. Restart Windows VM
2. Wait 30-60 seconds
3. Verify:
   ✅ App launches automatically
   ✅ System tray icon appears
   ✅ Services start (Docker, Next.js, Workers)
   ✅ Main window does NOT appear (minimized to tray)
```

### 4. Test Update Flow

```
1. Keep v1.0.0 installed
2. Release v1.0.1 to GitHub
3. In app: Settings → Check for Updates
4. Verify:
   ✅ "Update available" notification shown
   ✅ Release notes displayed
   ✅ "Download Now" button works
   ✅ Download progress shown
   ✅ "Restart to Install" appears when done
   ✅ App restarts and shows v1.0.1 after restart
```

### 5. Test Uninstall

```
1. Open Settings → Apps → Obsidian News Desk
2. Click "Uninstall"
3. Uninstaller wizard:
   - Option: "Delete app data" (uncheck for now)
   - Click "Uninstall"
4. Verify:
   ✅ App removed from Program Files
   ✅ Desktop shortcut removed
   ✅ Start Menu shortcut removed
   ✅ Registry auto-start entry removed
   ✅ Data folder KEPT (C:\Users\konra\ObsidianNewsDesk)
```

### 6. Test Uninstall with Data Deletion

```
1. Reinstall app
2. Create a video (so data exists)
3. Uninstall with "Delete app data" checked
4. Verify:
   ✅ App removed
   ✅ Data folder removed (C:\Users\konra\ObsidianNewsDesk)
   ✅ Docker volumes removed
```

## Common Issues

### Issue: Installer shows SmartScreen warning
**Cause:** Installer is not code-signed
**Solution:** Click "More info" → "Run anyway" (or sign installer, see CODE_SIGNING.md)

### Issue: Docker Desktop fails to start
**Cause:** WSL2 not installed or virtualization disabled
**Solution:** Enable virtualization in BIOS, install WSL2

### Issue: Port 8347 already in use
**Cause:** Previous instance still running
**Solution:** Kill Next.js process or change port in .env

### Issue: Auto-start doesn't work
**Cause:** Registry entry invalid or missing
**Solution:** Check HKCU\Software\Microsoft\Windows\CurrentVersion\Run

### Issue: Update download fails
**Cause:** Network error or GitHub API rate limit
**Solution:** Retry later or check GitHub token

## Validation Checklist

Before releasing to production:

- [ ] Fresh install completes without errors
- [ ] Desktop shortcut works
- [ ] Start Menu shortcut works
- [ ] Auto-start works (if enabled)
- [ ] Main window loads correctly
- [ ] Docker containers start
- [ ] System tray icon displays
- [ ] All services show as running
- [ ] Uninstall removes all files
- [ ] Update check works
- [ ] Update download works
- [ ] Update install works
- [ ] Settings persist across restarts

## Test Environments

Recommended test matrix:

| OS | Version | Virtualization |
|----|---------|----------------|
| Windows 10 | 22H2 | Hyper-V |
| Windows 11 | 23H2 | Hyper-V |
| Windows Server | 2022 | Hyper-V |

**Note:** Windows 10 Home requires Hyper-V alternative (VirtualBox, VMware).
