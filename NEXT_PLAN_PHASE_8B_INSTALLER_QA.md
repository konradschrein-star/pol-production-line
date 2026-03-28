# Phase 8B Implementation Plan: Installer QA & Testing

**Plan Created:** March 28, 2026
**Estimated Duration:** 2-3 days (16-24 hours)
**Prerequisite:** Phase 6 complete (installer .exe built)
**Agent Assignment:** For another agent to implement

---

## 📋 Context

**What's Complete:**
- ✅ Phase 1-5: Core application + Electron shell (~3,200 lines)
- ✅ Phase 6: Installer packaging (expected: `Obsidian News Desk-Setup-1.0.0.exe`)
- ✅ Phase 7: Distribution documentation
- ✅ Phase 8A: Production hardening (security tests, performance validation, monitoring)

**What's Next:**
Phase 8B validates the installer works correctly across different scenarios and operating systems before public distribution.

**Why This Phase:**
- Installer bugs are critical (can't fix after user downloads corrupted installer)
- Must work on clean systems (no dev tools, no prior setup)
- Edge cases must be tested (low disk space, missing Docker, etc.)
- First impression matters - installer must be flawless

---

## 🎯 Goals

### Primary Goals:
1. **Installer Validation** - Verify .exe installs correctly on Windows 10/11
2. **Setup Wizard Testing** - Validate all 6 pages work correctly
3. **Error Handling** - Test graceful failures for common issues
4. **End-to-End Workflow** - Confirm fresh install → create video → uninstall works

### Success Criteria:
- ✅ 16/16 test scenarios pass (100% success rate)
- ✅ 7/7 error scenarios handled gracefully
- ✅ Uninstall leaves no orphaned files (except user data)
- ✅ Zero critical bugs, <3 minor bugs
- ✅ All bugs documented with reproduction steps

---

## 📦 Test Matrix Overview

### **Comprehensive Test Coverage:**

```
┌──────────────────────────────────────┬────────────┬────────────┐
│           Test Scenario              │ Windows 10 │ Windows 11 │
├──────────────────────────────────────┼────────────┼────────────┤
│ 1. Clean install (no Docker)        │     ☐      │     ☐      │
│ 2. Clean install (Docker installed) │     ☐      │     ☐      │
│ 3. Upgrade from dev version         │     ☐      │     ☐      │
│ 4. Uninstall/reinstall               │     ☐      │     ☐      │
│ 5. Multiple user accounts           │     ☐      │     ☐      │
│ 6. Install to custom location       │     ☐      │     ☐      │
│ 7. Low disk space (<5GB)            │     ☐      │     ☐      │
│ 8. No internet connection           │     ☐      │     ☐      │
└──────────────────────────────────────┴────────────┴────────────┘

Total: 8 scenarios × 2 OS versions = 16 tests
```

### **Error Scenario Tests:**

```
┌────────────────────────────────────────┬──────────────────────────┐
│           Error Scenario               │    Expected Behavior     │
├────────────────────────────────────────┼──────────────────────────┤
│ 1. Docker not running                  │ Clear error + guide      │
│ 2. Invalid API key                     │ Test fails, retry prompt │
│ 3. Disk full during install           │ Graceful rollback        │
│ 4. Port 8347 already in use           │ Try alternate port       │
│ 5. Chrome extension not installed     │ Warning banner, continue │
│ 6. Whisk token expired                │ Refresh instructions     │
│ 7. Job stuck in queue                  │ Timeout + retry option   │
└────────────────────────────────────────┴──────────────────────────┘

Total: 7 error scenarios
```

---

## 🖥️ Test Environment Setup

### **Required Resources:**

#### **Virtual Machines (Recommended):**
- **Windows 10 Pro** (clean VM)
  - VMware Workstation or VirtualBox
  - 4 GB RAM minimum, 8 GB recommended
  - 50 GB disk space
  - Snapshot before each test (quick rollback)

- **Windows 11 Home** (clean VM)
  - Same specs as Windows 10
  - Snapshot capability

#### **Alternative: Physical Machines**
- 2 separate computers with fresh Windows installs
- More time-consuming (no snapshots)
- More realistic (actual hardware)

### **VM Setup Steps:**

**1. Create Base Windows 10 VM**
```bash
# VMware Workstation (recommended)
1. New Virtual Machine
2. Choose Windows 10 ISO
3. Allocate: 4 GB RAM, 50 GB disk (thin provisioned)
4. Install Windows 10
5. Install VMware Tools
6. Windows Update to latest
7. Take snapshot: "Clean Windows 10 Base"
```

**2. Create Base Windows 11 VM**
```bash
# Same steps for Windows 11
1. Download Windows 11 ISO
2. Create VM (may need TPM 2.0 + Secure Boot enabled)
3. Install Windows 11
4. Install VMware Tools
5. Windows Update to latest
6. Take snapshot: "Clean Windows 11 Base"
```

**3. Pre-Test Snapshot Procedure**
```bash
# Before each test scenario:
1. Revert to "Clean Windows XX Base" snapshot
2. Take new snapshot: "Test Scenario X - Before"
3. Run test
4. If test fails: revert to "Test Scenario X - Before"
5. If test passes: delete "Test Scenario X - Before" snapshot
```

---

## 📝 Test Procedures

### **Test Scenario 1: Clean Install (No Docker)**

**Environment:**
- Clean Windows 10/11 VM
- No Docker Desktop installed
- No Node.js installed
- No Chrome installed

**Test Steps:**

1. **Download Installer**
   ```powershell
   # Copy installer to VM
   # File: Obsidian News Desk-Setup-1.0.0.exe
   # Location: Downloads folder
   ```

2. **Run Installer**
   - Double-click `Obsidian News Desk-Setup-1.0.0.exe`
   - Windows SmartScreen warning expected (unsigned installer)
   - Click "More info" → "Run anyway"

3. **Setup Wizard - Page 1: Welcome**
   - ✅ Verify: Welcome screen displays correctly
   - ✅ Verify: "Continue" button enabled
   - Click: "Continue"

4. **Setup Wizard - Page 2: Prerequisites Check**
   - ❌ Expected: Docker Desktop NOT detected
   - ✅ Verify: Clear error message displays
   - ✅ Verify: "Install Docker Desktop" button present
   - Click: "Install Docker Desktop" (opens browser)
   - Download Docker Desktop from https://docker.com
   - Install Docker Desktop
   - Restart computer
   - Re-run installer
   - ✅ Verify: Docker now detected

5. **Setup Wizard - Page 3: Chrome Extension**
   - If Chrome not installed:
     - ✅ Verify: "Install Chrome" button present
     - Click: "Install Chrome" button
     - Download and install Chrome
     - Re-run installer
   - ✅ Verify: Chrome extension installation guide displays
   - ✅ Verify: Screenshots/instructions clear
   - Click: "Skip" (can install later)

6. **Setup Wizard - Page 4: API Keys**
   - ✅ Verify: All API key fields present (OpenAI, Whisk, etc.)
   - Enter: Test API keys
   - Click: "Test Connections"
   - ✅ Verify: Connection test runs
   - ✅ Verify: Success/failure messages display
   - Click: "Continue"

7. **Setup Wizard - Page 5: Storage Location**
   - ✅ Verify: Default path shown (C:\Users\<user>\ObsidianNewsDesk\)
   - ✅ Verify: Disk space check shows available space
   - Click: "Browse" button
   - ✅ Verify: Folder picker opens
   - Select: Custom location (optional)
   - Click: "Continue"

8. **Setup Wizard - Page 6: Complete**
   - ✅ Verify: Installation progress bar displays
   - ✅ Verify: Installation completes successfully
   - ✅ Verify: "Launch Obsidian News Desk" checkbox checked
   - Click: "Finish"

9. **First Launch**
   - ✅ Verify: System tray icon appears
   - ✅ Verify: Browser opens to http://localhost:8347
   - ✅ Verify: Dashboard loads correctly
   - ✅ Verify: No console errors in browser

10. **Create Test Video**
    - Click: "New Broadcast"
    - Paste: Sample news script
    - Click: "Analyze & Generate"
    - ✅ Verify: Job created, status "analyzing"
    - Wait: ~20 minutes for images
    - ✅ Verify: Status changes to "review_assets"
    - Click: "LAUNCH HEYGEN BROWSER"
    - ✅ Verify: Browser opens to HeyGen
    - Manually: Generate avatar, download MP4
    - Upload: Avatar to storyboard
    - Click: "COMPILE & RENDER"
    - Wait: ~2-5 minutes
    - ✅ Verify: Video renders successfully
    - Download: Final video
    - ✅ Verify: Video plays correctly

11. **Restart Test**
    - Close: Main window (should minimize to tray)
    - Right-click tray icon → Quit
    - Double-click: Desktop shortcut
    - ✅ Verify: App restarts successfully
    - ✅ Verify: Services auto-start
    - ✅ Verify: Previous job still visible

12. **Uninstall**
    - Open: Control Panel → Programs → Obsidian News Desk
    - Click: "Uninstall"
    - ✅ Verify: Uninstaller runs
    - ✅ Verify: Confirmation dialog displays
    - Click: "Yes, uninstall"
    - ✅ Verify: Uninstall completes
    - Check: Program Files folder deleted
    - Check: Desktop shortcut deleted
    - Check: Start menu entry deleted
    - ✅ Verify: User data PRESERVED (C:\Users\<user>\ObsidianNewsDesk\)

**Expected Outcome:**
- ✅ All checks pass
- ✅ Video created successfully
- ✅ Clean uninstall (except user data)

**Failure Criteria:**
- ❌ Installer crashes
- ❌ Setup wizard pages broken
- ❌ Services don't start
- ❌ Video creation fails
- ❌ Uninstall leaves orphaned files

---

### **Test Scenario 2: Clean Install (Docker Pre-Installed)**

**Environment:**
- Clean Windows 10/11 VM
- Docker Desktop pre-installed and running
- Chrome installed

**Test Steps:**

1. **Download & Run Installer**
   - Double-click installer
   - Windows SmartScreen → "Run anyway"

2. **Setup Wizard - Prerequisites Check**
   - ✅ Verify: Docker detected (green checkmark)
   - ✅ Verify: Chrome detected (green checkmark)
   - ✅ Verify: "Continue" button enabled
   - Click: "Continue"

3. **Setup Wizard - Remaining Pages**
   - Follow same steps as Scenario 1 (pages 3-6)

4. **First Launch**
   - ✅ Verify: Faster startup (Docker already running)
   - ✅ Verify: Services start within 10 seconds

5. **Create Test Video**
   - Same as Scenario 1
   - ✅ Verify: Full end-to-end workflow

6. **Uninstall**
   - Same as Scenario 1

**Expected Outcome:**
- ✅ Faster installation (no Docker install needed)
- ✅ All other checks pass

---

### **Test Scenario 3: Upgrade from Dev Version**

**Environment:**
- Windows 10/11 with existing dev environment
- Previous version installed manually
- Existing jobs in database

**Test Steps:**

1. **Pre-Upgrade State**
   - ✅ Verify: Existing jobs in database
   - ✅ Verify: User data in C:\Users\<user>\ObsidianNewsDesk\
   - Stop: Dev version (STOP.bat)

2. **Run Installer**
   - Double-click new installer
   - ✅ Verify: Detects existing installation
   - ✅ Verify: "Upgrade" option presented
   - Click: "Upgrade"

3. **Setup Wizard**
   - ✅ Verify: Skips already-configured settings
   - ✅ Verify: Preserves existing API keys
   - ✅ Verify: Preserves storage location

4. **Post-Upgrade Verification**
   - Launch app
   - ✅ Verify: Previous jobs still visible
   - ✅ Verify: User data intact
   - ✅ Verify: New version number displayed

**Expected Outcome:**
- ✅ Seamless upgrade
- ✅ No data loss
- ✅ All features work

---

### **Test Scenario 4: Uninstall/Reinstall**

**Environment:**
- Windows 10/11 with app installed
- Existing user data

**Test Steps:**

1. **First Install**
   - Install app (Scenario 1 or 2)
   - Create test job
   - Create test video

2. **Uninstall**
   - Uninstall via Control Panel
   - ✅ Verify: App removed
   - ✅ Verify: User data preserved

3. **Reinstall**
   - Run installer again
   - Complete setup wizard

4. **Verification**
   - ✅ Verify: Previous jobs NOT visible (fresh install)
   - ✅ Verify: Old user data still in C:\Users\<user>\ObsidianNewsDesk\
   - ✅ Verify: Can import old data manually (if needed)

**Expected Outcome:**
- ✅ Clean uninstall
- ✅ User data preserved
- ✅ Reinstall works

---

### **Test Scenario 5: Multiple User Accounts**

**Environment:**
- Windows 10/11 with 2 user accounts
  - User A (admin)
  - User B (standard user)

**Test Steps:**

1. **Install as User A**
   - Log in as User A
   - Install app
   - Create test video
   - Log out

2. **Use as User B**
   - Log in as User B
   - Launch app from Start Menu
   - ✅ Verify: App launches (if perMachine: true)
   - ✅ Verify: Separate user data (C:\Users\UserB\ObsidianNewsDesk\)
   - ✅ Verify: Can't see User A's jobs
   - Create test video
   - ✅ Verify: Video saves to User B's folder

3. **Switch Back to User A**
   - Log out User B
   - Log in as User A
   - Launch app
   - ✅ Verify: User A's jobs still visible
   - ✅ Verify: User B's jobs NOT visible

**Expected Outcome:**
- ✅ Per-user data isolation
- ✅ Both users can use app independently

---

### **Test Scenario 6: Install to Custom Location**

**Environment:**
- Clean Windows 10/11 VM
- Additional drive (D:\) available

**Test Steps:**

1. **Run Installer**
   - Start installer
   - ✅ Verify: Installation directory selection page
   - Change: Install location to D:\Apps\ObsidianNewsDesk\
   - Complete installation

2. **Verification**
   - ✅ Verify: App installed to D:\Apps\ObsidianNewsDesk\
   - ✅ Verify: App launches correctly
   - ✅ Verify: Desktop shortcut works
   - ✅ Verify: Start menu entry works

3. **Create Test Video**
   - Full end-to-end workflow
   - ✅ Verify: Everything works from custom location

**Expected Outcome:**
- ✅ Custom install location works
- ✅ No hardcoded C:\ paths

---

### **Test Scenario 7: Low Disk Space**

**Environment:**
- Windows 10/11 VM with 50 GB disk
- Fill disk to <5 GB free

**Test Steps:**

1. **Prepare Environment**
   ```powershell
   # Create large dummy file to fill disk
   fsutil file createnew C:\dummy.dat 45000000000  # 45 GB
   ```

2. **Run Installer**
   - Start installer
   - ✅ Verify: Disk space warning displays
   - ✅ Verify: Warning shows required space (~3-4 GB)
   - ✅ Verify: Can continue or cancel

3. **Option A: Proceed with Install**
   - Click: "Continue anyway"
   - ✅ Verify: Installation completes (if >3 GB available)

4. **Option B: Insufficient Space**
   ```powershell
   # Fill disk to <2 GB free
   fsutil file createnew C:\dummy2.dat 48000000000  # 48 GB
   ```
   - Start installer
   - ✅ Verify: Installation fails gracefully
   - ✅ Verify: Error message clear
   - ✅ Verify: Partial files cleaned up

**Expected Outcome:**
- ✅ Disk space check works
- ✅ Graceful failure on insufficient space
- ✅ No corrupted partial install

---

### **Test Scenario 8: No Internet Connection**

**Environment:**
- Clean Windows 10/11 VM
- Docker installed locally
- Disable network adapter

**Test Steps:**

1. **Disable Internet**
   ```powershell
   # In VM settings: Disconnect network adapter
   ```

2. **Run Installer**
   - Start installer
   - Complete setup wizard

3. **Configure Offline**
   - Skip API key testing (requires internet)
   - Complete installation

4. **First Launch**
   - ✅ Verify: App launches
   - ✅ Verify: Local services start (Docker, Next.js)
   - ✅ Verify: Dashboard loads

5. **Enable Internet**
   - Reconnect network adapter
   - Restart app

6. **Test Full Workflow**
   - Enter API keys
   - Create test video
   - ✅ Verify: Everything works after internet restored

**Expected Outcome:**
- ✅ Offline installation works
- ✅ Can configure later when internet available
- ✅ Full functionality after internet restored

---

## ⚠️ Error Scenario Tests

### **Error Scenario 1: Docker Not Running**

**Setup:**
- Install app
- Stop Docker Desktop
- Try to create video

**Expected Behavior:**
- ✅ System tray icon turns yellow/red
- ✅ Error message: "Docker Desktop is not running"
- ✅ "Start Docker Desktop" button present
- ✅ After starting Docker, services recover automatically

**Test Steps:**
1. Install app successfully
2. Stop Docker Desktop
3. Try to create new job
4. ✅ Verify error message
5. Start Docker Desktop
6. Wait 30 seconds
7. ✅ Verify services recover
8. Create job successfully

---

### **Error Scenario 2: Invalid API Key**

**Setup:**
- Install app
- Enter invalid OpenAI API key
- Try to create video

**Expected Behavior:**
- ✅ Test connection fails during setup
- ✅ Error message: "Invalid API key"
- ✅ Can retry with correct key
- ✅ Can skip and configure later

**Test Steps:**
1. Setup wizard → API Keys page
2. Enter: "sk-invalid-key-test"
3. Click: "Test Connections"
4. ✅ Verify: Error displays
5. Fix: Enter valid key
6. Click: "Test Connections"
7. ✅ Verify: Success message

---

### **Error Scenario 3: Disk Full During Install**

**Setup:**
- Fill disk to 1 GB free
- Start installation
- Fill remaining space during install

**Expected Behavior:**
- ✅ Installation fails gracefully
- ✅ Error message: "Insufficient disk space"
- ✅ Partial files cleaned up
- ✅ No corrupted installation left

**Test Steps:**
1. Prepare VM with 1 GB free
2. Start installer
3. During installation, fill remaining disk
4. ✅ Verify installation fails
5. ✅ Verify cleanup occurs
6. ✅ Verify no orphaned files

---

### **Error Scenario 4: Port 8347 Already in Use**

**Setup:**
- Run existing web server on port 8347
- Install app

**Expected Behavior:**
- ✅ Detects port conflict
- ✅ Error message: "Port 8347 is already in use"
- ✅ Option to select alternate port (e.g., 8348)
- ✅ App starts on alternate port

**Test Steps:**
1. Start dummy server on 8347:
   ```powershell
   python -m http.server 8347
   ```
2. Install app
3. Launch app
4. ✅ Verify port conflict detected
5. ✅ Verify alternate port offered
6. Select: 8348
7. ✅ Verify app starts on 8348
8. Browser opens to http://localhost:8348

---

### **Error Scenario 5: Chrome Extension Not Installed**

**Setup:**
- Install app
- Don't install Chrome extension
- Try to generate images

**Expected Behavior:**
- ✅ Whisk API used (not browser automation)
- ✅ Warning banner: "Chrome extension not installed"
- ✅ Link to installation guide
- ✅ Images still generate (via Whisk API)

**Test Steps:**
1. Install app, skip extension
2. Create job
3. ✅ Verify warning banner
4. Wait for image generation
5. ✅ Verify images generate via Whisk API
6. ✅ Verify no Chrome extension errors

---

### **Error Scenario 6: Whisk Token Expired**

**Setup:**
- Install app
- Use expired Whisk token
- Try to generate images

**Expected Behavior:**
- ✅ Image generation fails with 401 error
- ✅ Error message: "Whisk token expired"
- ✅ Instructions to refresh token
- ✅ Link to token refresh guide

**Test Steps:**
1. Install app
2. Configure expired Whisk token
3. Create job
4. Wait for image generation
5. ✅ Verify 401 error caught
6. ✅ Verify helpful error message
7. ✅ Verify retry instructions clear

---

### **Error Scenario 7: Job Stuck in Queue**

**Setup:**
- Install app
- Stop BullMQ workers
- Create job

**Expected Behavior:**
- ✅ Job stays in "pending" state
- ✅ Timeout after 5 minutes
- ✅ Error message: "Job processing timeout"
- ✅ "Retry" button available
- ✅ Worker restart automatically recovers

**Test Steps:**
1. Install app
2. Stop workers (via system tray)
3. Create job
4. Wait 5 minutes
5. ✅ Verify timeout error
6. Start workers (via system tray)
7. Click: "Retry"
8. ✅ Verify job processes successfully

---

## 📊 Test Results Documentation

### **Test Results Template:**

```markdown
# Installer QA Test Results

**Test Date:** YYYY-MM-DD
**Tester:** [Name]
**Installer Version:** 1.0.0
**Installer File:** Obsidian News Desk-Setup-1.0.0.exe
**File Size:** XXX MB
**File Hash (SHA256):** [hash]

---

## Test Matrix Results

| Scenario | Win 10 | Win 11 | Notes |
|----------|--------|--------|-------|
| 1. Clean install (no Docker) | ✅/❌ | ✅/❌ | [Notes] |
| 2. Clean install (Docker installed) | ✅/❌ | ✅/❌ | [Notes] |
| 3. Upgrade from dev version | ✅/❌ | ✅/❌ | [Notes] |
| 4. Uninstall/reinstall | ✅/❌ | ✅/❌ | [Notes] |
| 5. Multiple user accounts | ✅/❌ | ✅/❌ | [Notes] |
| 6. Install to custom location | ✅/❌ | ✅/❌ | [Notes] |
| 7. Low disk space | ✅/❌ | ✅/❌ | [Notes] |
| 8. No internet connection | ✅/❌ | ✅/❌ | [Notes] |

**Pass Rate:** X/16 (XX%)

---

## Error Scenario Results

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Docker not running | ✅/❌ | [Notes] |
| 2. Invalid API key | ✅/❌ | [Notes] |
| 3. Disk full during install | ✅/❌ | [Notes] |
| 4. Port 8347 in use | ✅/❌ | [Notes] |
| 5. Chrome extension not installed | ✅/❌ | [Notes] |
| 6. Whisk token expired | ✅/❌ | [Notes] |
| 7. Job stuck in queue | ✅/❌ | [Notes] |

**Pass Rate:** X/7 (XX%)

---

## Bugs Found

### Critical Bugs (Blocks Release):
1. [Bug description]
   - **Severity:** Critical
   - **Steps to Reproduce:** [Steps]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]
   - **Screenshot:** [Path]

### Major Bugs (Should Fix Before Release):
1. [Bug description]

### Minor Bugs (Can Fix Post-Release):
1. [Bug description]

---

## Summary

**Overall Result:** ✅ PASS / ❌ FAIL

**Recommendation:**
- ✅ Ready for release
- ⚠️ Ready with minor issues (document workarounds)
- ❌ Not ready (fix critical bugs first)

**Next Steps:**
1. [Action item]
2. [Action item]
```

---

## 🐛 Bug Tracking Template

### **Bug Report Template:**

```markdown
# Bug Report: [Short Description]

**Bug ID:** BUG-001
**Reporter:** [Name]
**Date:** YYYY-MM-DD
**Severity:** Critical / Major / Minor
**Status:** Open / In Progress / Fixed / Won't Fix

---

## Environment

- **OS:** Windows 10/11 [Version]
- **Installer Version:** 1.0.0
- **Test Scenario:** [Scenario name]

---

## Description

[Clear description of the bug]

---

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Expected Behavior

[What should happen]

---

## Actual Behavior

[What actually happens]

---

## Screenshots/Logs

[Attach screenshots, error logs, stack traces]

---

## Workaround

[If any workaround exists]

---

## Fix Suggestions

[Ideas for fixing the bug]

---

## Related Issues

- Related to BUG-XXX
- Blocks BUG-YYY
```

---

## 📈 Timeline & Milestones

### **Day 1: Setup & Initial Testing (6-8 hours)**

**Morning (3-4 hours):**
- Create Windows 10 VM
- Create Windows 11 VM
- Install VMware Tools
- Take base snapshots

**Afternoon (3-4 hours):**
- Test Scenario 1 (Clean install, no Docker) on Windows 10
- Test Scenario 2 (Clean install, Docker installed) on Windows 10
- Document results

**Deliverable:** 2/16 tests complete

---

### **Day 2: Comprehensive Testing (8-10 hours)**

**Morning (4-5 hours):**
- Test Scenario 1 (Clean install, no Docker) on Windows 11
- Test Scenario 2 (Clean install, Docker installed) on Windows 11
- Test Scenario 3 (Upgrade from dev) on Windows 10
- Test Scenario 4 (Uninstall/reinstall) on Windows 10

**Afternoon (4-5 hours):**
- Test Scenario 5 (Multiple users) on Windows 10
- Test Scenario 6 (Custom location) on Windows 11
- Test Scenario 7 (Low disk space) on Windows 10
- Test Scenario 8 (No internet) on Windows 11

**Deliverable:** 16/16 tests complete

---

### **Day 3: Error Scenarios & Documentation (6-8 hours)**

**Morning (3-4 hours):**
- Test all 7 error scenarios
- Document results
- Create bug reports for failures

**Afternoon (3-4 hours):**
- Reproduce critical bugs
- Verify fixes (if any)
- Write final test report
- Create release recommendation

**Deliverable:** Test report, bug list, release recommendation

---

## ✅ Success Criteria

### **Must Have (Release Blockers):**
- ✅ 16/16 test scenarios pass (100%)
- ✅ 7/7 error scenarios handled gracefully
- ✅ Zero critical bugs
- ✅ <3 major bugs (with documented workarounds)

### **Should Have:**
- ✅ Clean uninstall (no orphaned files except user data)
- ✅ End-to-end video creation works on all scenarios
- ✅ Setup wizard pages all functional
- ✅ Desktop shortcut + Start menu entry work

### **Nice to Have:**
- ✅ <5 minor bugs total
- ✅ All error messages helpful and actionable
- ✅ Performance acceptable (app starts <15s)

---

## 🚀 Getting Started

### **Step 1: Prerequisites**

**Required Software:**
- VMware Workstation Pro (or VirtualBox)
- Windows 10 ISO
- Windows 11 ISO
- Installer file: `Obsidian News Desk-Setup-1.0.0.exe`

**Required Time:**
- Day 1: 6-8 hours (VM setup + initial tests)
- Day 2: 8-10 hours (comprehensive testing)
- Day 3: 6-8 hours (error scenarios + documentation)
- **Total:** 20-26 hours over 3 days

---

### **Step 2: VM Setup**

```powershell
# Download Windows ISOs
# Windows 10: https://www.microsoft.com/software-download/windows10
# Windows 11: https://www.microsoft.com/software-download/windows11

# Create VMs in VMware
# - VM 1: Windows 10 Pro (50 GB, 4 GB RAM)
# - VM 2: Windows 11 Home (50 GB, 4 GB RAM)

# Install Windows + Updates
# Take snapshot: "Clean Base"
```

---

### **Step 3: Execute Test Plan**

**Follow the test procedures exactly as written:**
1. Start with Test Scenario 1 on Windows 10
2. Document results after each test
3. Take screenshots of any bugs
4. Create bug reports immediately
5. Move to next scenario

**Use the Test Results Template** to track progress.

---

### **Step 4: Report Results**

**Create final report:**
- Overall pass/fail rate
- List of all bugs found
- Release recommendation
- Screenshots of critical bugs

**Deliver to project lead for review.**

---

## 💡 Testing Tips

### **Best Practices:**
- ✅ **Always use VM snapshots** - Revert if test fails
- ✅ **Take screenshots** - Especially of errors
- ✅ **Document everything** - Even minor issues
- ✅ **Test realistic scenarios** - Use real scripts, not "test123"
- ✅ **Test end-to-end** - Don't skip the full video workflow

### **Common Pitfalls:**
- ❌ **Don't skip steps** - Follow procedures exactly
- ❌ **Don't assume it works** - Test everything
- ❌ **Don't test on dev machine** - Use clean VMs only
- ❌ **Don't rush** - Take time to verify each step

### **When You Find Bugs:**
1. **Stop** - Don't continue to next test
2. **Document** - Screenshots, logs, steps to reproduce
3. **Reproduce** - Confirm it's consistent (revert snapshot, try again)
4. **Report** - Create bug report immediately
5. **Continue** - Move to next test

---

## 📝 Deliverables

### **Test Documentation:**
- ✅ Test Results Report (using template above)
- ✅ Bug Reports (one per bug found)
- ✅ Screenshots (in bugs/ folder)
- ✅ Release Recommendation (GO/NO-GO decision)

### **Handoff Package:**
```
docs/testing/
├── PHASE_8B_TEST_RESULTS.md        # Overall test results
├── bugs/
│   ├── BUG-001-installer-crash.md  # Critical bugs
│   ├── BUG-002-wizard-typo.md      # Minor bugs
│   └── screenshots/
│       ├── bug-001-screenshot.png
│       └── bug-002-screenshot.png
└── RELEASE_RECOMMENDATION.md        # Final GO/NO-GO
```

---

## 🎯 Release Decision Criteria

### **GO (Ready for Release):**
- ✅ 16/16 test scenarios pass
- ✅ 7/7 error scenarios handled
- ✅ 0 critical bugs
- ✅ <3 major bugs (with workarounds documented)
- ✅ End-to-end workflow works on all platforms

### **NO-GO (Not Ready):**
- ❌ Any critical bugs
- ❌ <90% test pass rate (14/16)
- ❌ >5 major bugs
- ❌ End-to-end workflow fails on any platform
- ❌ Installer corrupts system

### **CONDITIONAL GO (Release with Caveats):**
- ⚠️ 14-15/16 tests pass (>90%)
- ⚠️ 3-5 major bugs (all with workarounds)
- ⚠️ Minor UX issues only
- **Requires:** Known Issues document for users

---

## 📞 Questions for Implementing Agent

Before starting, clarify:

1. **VMs Ready?** Do you have VMware/VirtualBox installed?
2. **Windows ISOs?** Do you have Windows 10/11 ISOs downloaded?
3. **Time Available?** Can you dedicate 3 full days?
4. **Installer Ready?** Do you have the .exe file from Phase 6?
5. **Bug Reporting?** How should bugs be reported (GitHub Issues, document, etc.)?

---

## 🎯 Next Steps After Phase 8B

**When Phase 8B Complete:**
1. ✅ Installer validated across 16 scenarios
2. ✅ All bugs documented
3. ✅ Release recommendation made

**If GO Decision:**
- Move to Phase 9 (Final Polish)
- Create GitHub Release
- Publish installer
- Write release notes

**If NO-GO Decision:**
- Fix critical bugs
- Re-run failed tests
- Get new GO/NO-GO decision

---

**Ready to test? Full testing procedures above. Start with VM setup!**
