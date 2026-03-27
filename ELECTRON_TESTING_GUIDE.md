# Electron Installer Testing Guide

## Pre-Flight Checklist

Before building the installer, verify:

### 1. Dependencies Installed
```bash
npm install
```

### 2. Next.js Builds Successfully
```bash
npm run build
```
Expected output: `.next/standalone/` directory created

### 3. Electron TypeScript Compiles
```bash
npm run electron:compile
```
Expected output: `electron/dist/` directory with compiled JS

### 4. Development Mode Works
```bash
npm run electron:dev
```
Expected: Electron window opens with Next.js app

---

## Build Testing

### Test 1: Local Installer Build

```bash
npm run electron:build
```

**What to Check:**
- ✅ Build completes without errors
- ✅ `dist/` directory created
- ✅ `Obsidian-News-Desk-Setup-X.X.X.exe` exists
- ✅ File size: 80-150 MB (reasonable for bundled app)
- ✅ `dist/win-unpacked/` contains app files

**Expected Output:**
```
• electron-builder  version=24.9.1 os=10.0.26200
• loaded configuration  file=electron-builder.yml
• building        target=nsis file=dist/Obsidian-News-Desk-Setup-0.1.0.exe
• packaging       platform=win32 arch=x64 electron=28.0.0 appOutDir=dist\win-unpacked
• building block map  blockMapFile=dist\Obsidian-News-Desk-Setup-0.1.0.exe.blockmap
```

**Common Errors & Fixes:**

❌ **Error: Cannot find module '.next/standalone'**
```bash
# Fix: Build Next.js first
npm run build
```

❌ **Error: Missing icon.ico**
```bash
# Fix: Create placeholder
echo. > electron/build/icon.ico
# Or: Comment out icon in electron-builder.yml
```

❌ **Error: TypeScript compilation failed**
```bash
# Fix: Check for TS errors
npm run electron:compile
```

### Test 2: Unpacked App Launch

```bash
cd dist/win-unpacked
.\Obsidian News Desk.exe
```

**What to Check:**
- ✅ App launches without crash
- ✅ Wizard appears (if first run)
- ✅ OR main window appears (if not first run)
- ✅ Console shows no critical errors

**To Force First Run:**
```powershell
# Delete config
Remove-Item -Recurse "$env:APPDATA\obsidian-news-desk-config"
# Then launch again
cd dist/win-unpacked
.\Obsidian News Desk.exe
```

---

## Installer Testing

### Test 3: Install Flow

1. **Run Installer:**
   ```bash
   .\dist\Obsidian-News-Desk-Setup-0.1.0.exe
   ```

2. **Verify Installer UI:**
   - ✅ Welcome screen shows
   - ✅ License agreement (if LICENSE exists)
   - ✅ Directory selection works
   - ✅ Progress bar updates during install
   - ✅ "Launch Obsidian News Desk" checkbox present

3. **Install Locations:**
   - ✅ Program Files: `C:\Program Files\Obsidian News Desk\`
   - ✅ Desktop shortcut created
   - ✅ Start Menu entry: `Obsidian News Desk`

4. **Launch After Install:**
   - ✅ App auto-launches (if checkbox checked)
   - ✅ Wizard appears (first run)

### Test 4: First Run Wizard

**Page 1: Welcome**
- ✅ System requirements check runs
- ✅ All 3 checks turn green ✓
- ✅ "Get Started" button works
- ✅ Auto-advances to page 2 after 2 seconds

**Page 2: Docker Check**
- ✅ "Check Docker" button works
- ✅ Status box updates correctly:
  - If Docker installed & running: Green success
  - If Docker installed but not running: Yellow warning + "Start Docker" button
  - If Docker not installed: Yellow warning + "Install Docker Desktop" button

**Test Scenarios:**
```bash
# Scenario A: Docker Running
docker info  # Should succeed
# Expected: Green status, Continue enabled

# Scenario B: Docker Not Running
# Expected: Yellow status, "Start Docker" button, Continue disabled

# Scenario C: Docker Not Installed
# Expected: Yellow status, "Install Docker Desktop" button
```

**Page 3: Storage Path**
- ✅ Default path pre-filled: `C:\Users\YourName\ObsidianNewsDesk`
- ✅ "Browse..." button opens folder picker
- ✅ Path validation runs on input change:
  - Valid path → Green checkmark
  - Invalid/unwritable → Red X
  - Low disk space (< 10GB) → Red warning

**Test Cases:**
```powershell
# Valid path
C:\Users\konra\ObsidianNewsDesk  # ✅ Green

# Invalid path
Z:\NonExistent\Path  # ❌ Red

# Unwritable path
C:\Windows\System32\Test  # ❌ Red (permission denied)
```

**Page 4: API Configuration**
- ✅ AI provider dropdown works (OpenAI/Claude/Google/Groq)
- ✅ Switching provider shows/hides correct key field
- ✅ "Validate Key" button triggers API check
- ✅ Valid key → Green success with model info
- ✅ Invalid key → Red error with reason
- ✅ Whisk token field (optional) accepts input

**Test API Keys:**
```bash
# OpenAI (should fail with invalid key)
sk-invalid-key-test-123456789

# Expected: Red error "Invalid API key" (401)

# Valid key (use real key for testing)
sk-proj-... # ✅ Green with model list
```

**Page 5: Installation Progress**
- ✅ "Start Installation" button works
- ✅ Log output shows progress messages
- ✅ Progress bar updates (0% → 100%)
- ✅ Each step logs success:
  - Creating storage directories (5%)
  - Generating .env file (15%)
  - Pulling Docker images (60%) - *This takes 2-5 minutes*
  - Starting containers (70%)
  - Waiting for services (90%)
  - Starting workers (97%)
  - Complete (100%)

**Expected Log Output:**
```
[12:34:56] Creating storage directories...
[12:34:57] Storage directories ready
[12:34:57] Generating configuration files...
[12:34:58] Configuration files generated
[12:34:58] Pulling Docker images (this may take several minutes)...
[12:37:23] Docker images pulled successfully
[12:37:23] Starting Docker containers...
[12:37:35] Docker containers started
[12:37:35] Waiting for services to be ready...
[12:37:45] PostgreSQL is ready
[12:37:46] Redis is ready
[12:37:46] All services are ready!
[12:37:46] Initializing database schema...
[12:37:47] Database schema initialized
[12:37:47] Starting BullMQ workers...
[12:37:48] BullMQ workers started
[12:37:48] Installation complete!
```

**Error Scenarios to Test:**
- Docker not running → Should fail at "Pulling Docker images"
- Insufficient disk space → Should fail at "Creating storage directories"
- Invalid API key → Won't block installation, but workers may fail later

**Page 6: Complete**
- ✅ Success icon (green checkmark) displays
- ✅ Storage location shown correctly
- ✅ "Launch Application" button works
- ✅ Clicking launch:
  - Wizard closes
  - Main window opens
  - Shows http://localhost:8347

---

## Post-Install Testing

### Test 5: Application Launch

**First Launch After Wizard:**
- ✅ Main window opens (1600x900)
- ✅ Loads http://localhost:8347
- ✅ Next.js app visible
- ✅ No white screen / loading forever

**Check Services:**
```powershell
# PostgreSQL
docker exec obsidian-postgres pg_isready -U obsidian
# Expected: accepting connections

# Redis
docker exec obsidian-redis redis-cli -a obsidian_redis_password ping
# Expected: PONG

# Containers running
docker ps
# Expected: obsidian-postgres, obsidian-redis both "Up"
```

**Check Next.js:**
```powershell
# Port 8347 in use
netstat -ano | findstr :8347
# Expected: TCP ... LISTENING
```

### Test 6: Desktop Shortcut

**Click desktop shortcut:**
- ✅ App launches
- ✅ No wizard (already completed)
- ✅ Main window opens directly
- ✅ Services auto-start if stopped

### Test 7: Start Menu Entry

**Open Start Menu → "Obsidian News Desk":**
- ✅ App launches
- ✅ Behaves same as desktop shortcut

### Test 8: Second Launch (No Wizard)

**Close app, reopen:**
- ✅ Wizard does NOT appear
- ✅ Main window opens directly
- ✅ Previous config preserved (storage path, API keys)

### Test 9: Configuration Persistence

**Verify electron-store:**
```powershell
# Check config file
Get-Content "$env:APPDATA\obsidian-news-desk-config\config.json" | ConvertFrom-Json
```

**Expected Contents:**
```json
{
  "isFirstRun": false,
  "storagePath": "C:\\Users\\konra\\ObsidianNewsDesk",
  "aiProvider": "openai",
  "openaiKey": "sk-proj-...",
  "installationDate": "2026-03-22T10:30:00.000Z",
  "windowState": {
    "width": 1600,
    "height": 900,
    "isMaximized": false
  }
}
```

---

## Uninstall Testing

### Test 10: Uninstall Flow

**Via Apps & Features:**
1. Open "Apps & Features"
2. Search "Obsidian News Desk"
3. Click "Uninstall"
4. Confirm uninstall
5. Wait for completion

**What Gets Removed:**
- ✅ `C:\Program Files\Obsidian News Desk\` deleted
- ✅ Desktop shortcut removed
- ✅ Start Menu entry removed

**What's Preserved:**
- ✅ `%APPDATA%\obsidian-news-desk-config\` still exists
- ✅ Storage directory (ObsidianNewsDesk) still exists
- ✅ Docker containers still running

**Clean Uninstall:**
```powershell
# Stop and remove Docker containers
cd "C:\Users\konra\ObsidianNewsDesk"
docker-compose down -v

# Remove config
Remove-Item -Recurse "$env:APPDATA\obsidian-news-desk-config"

# Remove storage
Remove-Item -Recurse "C:\Users\konra\ObsidianNewsDesk"
```

### Test 11: Reinstall After Uninstall

**Reinstall app:**
- ✅ Installer runs successfully
- ✅ Wizard appears again (config was preserved, so it should NOT appear unless you deleted config)
- ✅ If config exists: No wizard, app launches normally
- ✅ If config deleted: Wizard appears, walks through setup again

---

## Edge Case Testing

### Test 12: Port Conflict

**Simulate port 8347 in use:**
```powershell
# Start dummy server
python -m http.server 8347
```

**Launch app:**
- ❌ Expected: App fails to start Next.js
- ✅ Error shown in console/logs

### Test 13: Docker Not Running

**Stop Docker:**
```bash
docker stop $(docker ps -aq)
```

**Launch app:**
- ⚠️ Services won't be available
- ⚠️ App may show connection errors
- ✅ App should still launch (graceful degradation)

### Test 14: Missing .env File

**Delete .env:**
```powershell
Remove-Item "C:\Program Files\Obsidian News Desk\resources\app\.env"
```

**Launch app:**
- ⚠️ Workers may fail to start
- ⚠️ Database connection fails
- ✅ App should show error state, not crash

### Test 15: Low Disk Space

**Test with < 10GB free:**
- ⚠️ Wizard page 3 should show red warning
- ⚠️ Continue button should be disabled OR warn user
- ✅ Should not proceed with installation

---

## Performance Testing

### Test 16: Installation Time

**Measure each phase:**
- System check: ~3 seconds
- Docker check: ~5 seconds (if already running)
- Storage setup: ~1 second
- API validation: ~2 seconds per key
- Docker image pull: **2-5 minutes** (60% of total time)
- Container start: ~30 seconds
- Service readiness: ~10 seconds
- Worker start: ~2 seconds

**Total Time:** 5-10 minutes (mostly Docker pull)

### Test 17: App Startup Time

**Cold start (Docker not running):**
- Docker Desktop start: ~30 seconds
- Container start: ~30 seconds
- Service readiness: ~10 seconds
- App window: ~2 seconds
- **Total:** ~75 seconds

**Warm start (Docker already running):**
- Container check: ~1 second
- App window: ~2 seconds
- **Total:** ~3 seconds

---

## Regression Testing

### After Code Changes

**Checklist:**
1. ✅ `npm run electron:compile` succeeds
2. ✅ `npm run build` succeeds
3. ✅ `npm run electron:dev` launches correctly
4. ✅ `npm run electron:build` creates installer
5. ✅ Installer runs without errors
6. ✅ Wizard all 6 pages work
7. ✅ App launches after wizard
8. ✅ Desktop shortcut works
9. ✅ Uninstall works cleanly
10. ✅ Reinstall works

---

## CI/CD Testing

### Test 18: GitHub Actions Build

**Trigger workflow:**
```bash
# Create test tag
git tag v0.1.0-test
git push origin v0.1.0-test
```

**Monitor workflow:**
1. Go to GitHub → Actions
2. Watch "Build Electron Installer" run
3. Verify steps pass:
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Build Next.js
   - ✅ Compile Electron
   - ✅ Build installer
   - ✅ Upload artifact
   - ✅ Create release (if tag)

**Download artifact:**
- ✅ Artifact appears in Actions run
- ✅ Download `windows-installer.zip`
- ✅ Extract and test `.exe`

**Release created:**
- ✅ Release appears on GitHub
- ✅ `.exe` attached to release
- ✅ Release notes auto-generated

---

## Known Issues & Workarounds

### Issue 1: Docker Desktop Silent Install Fails
**Symptoms:** Docker install hangs or fails silently
**Workaround:** User manually downloads and installs Docker Desktop
**Status:** Expected behavior - Windows may require restart after first Docker install

### Issue 2: Wizard Closes Immediately
**Symptoms:** Wizard window flashes and closes
**Cause:** `isFirstRun` is `false` in config
**Fix:** Delete `%APPDATA%\obsidian-news-desk-config` and relaunch

### Issue 3: Main Window Shows "Can't connect"
**Symptoms:** Electron window shows connection error
**Cause:** Next.js server not started or port conflict
**Fix:** Check port 8347, restart app

### Issue 4: BullMQ Workers Don't Start
**Symptoms:** Jobs stay in "pending" status
**Cause:** Redis not connected or invalid API keys
**Fix:** Verify Redis running, check .env file

---

## Test Report Template

```markdown
## Electron Installer Test Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Version:** v0.1.0
**Environment:** Windows 11 (clean VM)

### Build
- [ ] Local build: PASS / FAIL
- [ ] Installer size: ___ MB
- [ ] Build time: ___ minutes

### Installation
- [ ] Installer launches: PASS / FAIL
- [ ] Wizard page 1: PASS / FAIL
- [ ] Wizard page 2: PASS / FAIL
- [ ] Wizard page 3: PASS / FAIL
- [ ] Wizard page 4: PASS / FAIL
- [ ] Wizard page 5: PASS / FAIL
- [ ] Wizard page 6: PASS / FAIL
- [ ] Total install time: ___ minutes

### Post-Install
- [ ] Desktop shortcut works: PASS / FAIL
- [ ] Start Menu entry works: PASS / FAIL
- [ ] App launches successfully: PASS / FAIL
- [ ] Docker containers running: PASS / FAIL
- [ ] Next.js accessible: PASS / FAIL

### Uninstall
- [ ] Uninstall completes: PASS / FAIL
- [ ] Files removed: PASS / FAIL
- [ ] Config preserved: PASS / FAIL

### Notes
[Any issues or observations]

### Overall Status
✅ PASS / ❌ FAIL
```

---

## Automated Testing (Future)

### Possible Improvements

1. **Spectron** - Automated Electron testing
2. **Playwright** - Wizard UI automation
3. **Jest** - Unit tests for IPC handlers
4. **Integration tests** - Docker lifecycle, worker spawning

**Example Test:**
```typescript
// electron/tests/wizard.spec.ts
import { test, expect } from '@playwright/test';

test('wizard completes successfully', async ({ page }) => {
  await page.goto('wizard.html');

  // Page 1: Click Get Started
  await page.click('#btn-get-started');

  // Page 2: Check Docker
  await page.click('#btn-check-docker');
  await expect(page.locator('#docker-status')).toContainText('running');

  // Page 3: Enter storage path
  await page.fill('#storage-path', 'C:\\Test\\Storage');
  await expect(page.locator('#path-validation')).toHaveClass(/success/);

  // ... etc
});
```

---

## Conclusion

This testing guide covers:
- ✅ Pre-build checks
- ✅ Build process
- ✅ Installer flow
- ✅ Wizard all pages
- ✅ Post-install verification
- ✅ Uninstall/reinstall
- ✅ Edge cases
- ✅ Performance metrics
- ✅ CI/CD pipeline

**Recommended Test Cycle:**
1. Development: Test in `electron:dev` mode
2. Pre-commit: Run `electron:build` locally
3. Pre-release: Full installer test on clean Windows VM
4. CI/CD: Automated build on tag push

**Last Updated:** March 22, 2026
