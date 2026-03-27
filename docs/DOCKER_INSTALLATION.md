# Docker Desktop Installation Guide

This guide walks you through installing Docker Desktop on Windows for the Obsidian News Desk application.

## Why Docker is Required

Obsidian News Desk uses Docker to run two critical services:

1. **PostgreSQL Database** (Port 5432) - Stores job metadata, scene data, and configuration
2. **Redis Queue** (Port 6379) - Manages background job processing (script analysis, image generation, rendering)

Docker provides isolated, reproducible environments for these services, eliminating manual database setup and configuration.

---

## System Requirements

### Windows Version
- **Windows 10 64-bit:**
  - Pro, Enterprise, or Education (Build 19041 or higher)
  - Home edition requires WSL 2
- **Windows 11 64-bit:**
  - All editions supported

### Hardware
- **RAM:** 4GB minimum (8GB+ recommended)
- **Disk Space:** 10GB available (for Docker Desktop + container images)
- **Processor:** 64-bit with virtualization support (Intel VT-x or AMD-V)

### BIOS Settings
- **Virtualization must be enabled** in BIOS/UEFI settings
  - Intel: VT-x (Intel Virtualization Technology)
  - AMD: AMD-V (AMD Virtualization)
  - Check: Open Task Manager → Performance → CPU → "Virtualization: Enabled"

---

## Installation Steps

### Step 1: Download Docker Desktop

1. Visit the official Docker Desktop download page:
   - **URL:** https://www.docker.com/products/docker-desktop/

2. Click **"Download for Windows"**
   - File: `Docker Desktop Installer.exe` (~500MB)
   - Latest version: 4.x or higher

3. Wait for download to complete

**[SCREENSHOT PLACEHOLDER: Docker Desktop download page with download button highlighted]**

---

### Step 2: Run the Installer

1. **Locate the installer:**
   - Open Downloads folder
   - Find `Docker Desktop Installer.exe`

2. **Run as Administrator** (right-click → "Run as administrator")

3. **Installation Configuration:**
   - ✅ **Use WSL 2 instead of Hyper-V** (Recommended)
     - WSL 2 is faster and more lightweight than Hyper-V
     - Required for Windows 10 Home edition
   - ✅ Add shortcut to desktop (optional)

4. Click **"OK"** to begin installation

5. **Wait for installation** (~5-10 minutes)
   - Installer downloads ~500MB of container runtime components
   - Progress bar shows download and installation status

**[SCREENSHOT PLACEHOLDER: Docker Desktop installer window with "Use WSL 2" option checked]**

---

### Step 3: Restart Your Computer

1. When prompted, click **"Close and restart"**
   - **Important:** System restart is required to enable WSL 2 or Hyper-V

2. Save all open work before restarting

3. After reboot:
   - Docker Desktop will launch automatically
   - You may see a "Docker Desktop Starting..." notification

**[SCREENSHOT PLACEHOLDER: Docker Desktop restart prompt dialog]**

---

### Step 4: Post-Install Configuration

1. **Docker Service Agreement** (first launch only)
   - Read and click **"Accept"** if you agree

2. **Docker Hub Sign-In** (optional)
   - Click **"Skip"** - not required for Obsidian News Desk
   - Docker Hub is only needed for sharing container images

3. **Wait for Docker to start** (~30-60 seconds)
   - System tray icon changes from gray to blue
   - Tooltip shows: "Docker Desktop is running"

**[SCREENSHOT PLACEHOLDER: Docker Desktop system tray icon showing running state]**

---

### Step 5: Verify Installation

#### Method 1: Obsidian News Desk Installer (Recommended)
1. Run the Obsidian News Desk installer
2. The Prerequisites step will automatically detect Docker
3. Look for green checkmark: "Docker Desktop Installed"

#### Method 2: Command Line
1. Open Command Prompt or PowerShell
2. Run:
   ```bash
   docker --version
   ```
   Expected output: `Docker version 24.0.x, build xxxxx`

3. Run:
   ```bash
   docker info
   ```
   Should display system information without errors

**[SCREENSHOT PLACEHOLDER: Command Prompt showing successful docker --version output]**

---

## Troubleshooting

### Issue 1: "Docker Desktop requires Windows 10 Pro/Enterprise"

**Symptoms:**
- Installer shows error about Windows edition
- "Hyper-V is not available" message

**Solution:**
- Windows 10 Home users must install WSL 2 first
- Follow this guide: https://docs.microsoft.com/en-us/windows/wsl/install
- Then re-run Docker Desktop installer with "Use WSL 2" option checked

---

### Issue 2: "Virtualization is not enabled"

**Symptoms:**
- Docker Desktop fails to start
- Error: "Hardware assisted virtualization and data execution protection must be enabled in the BIOS"

**Solution:**
1. Restart computer
2. Enter BIOS/UEFI settings (usually F2, F10, F12, or DEL during boot)
3. Find "Virtualization Technology" or "Intel VT-x" / "AMD-V"
4. Set to **Enabled**
5. Save and exit BIOS
6. Boot into Windows and start Docker Desktop

**Check if virtualization is enabled:**
- Open Task Manager → Performance → CPU
- Look for "Virtualization: Enabled"

---

### Issue 3: Docker won't start after reboot

**Symptoms:**
- System tray icon shows "Docker Desktop is not running"
- Clicking icon does nothing

**Solution 1: Manual Start**
1. Open Start Menu
2. Search for "Docker Desktop"
3. Click to launch
4. Wait 30-60 seconds for startup

**Solution 2: Restart Docker Service**
1. Open PowerShell as Administrator
2. Run:
   ```powershell
   Restart-Service com.docker.service
   ```

**Solution 3: Reinstall WSL 2** (if using WSL backend)
1. Open PowerShell as Administrator
2. Run:
   ```powershell
   wsl --update
   wsl --shutdown
   ```
3. Restart Docker Desktop

---

### Issue 4: Port conflicts (5432 or 6379 already in use)

**Symptoms:**
- Docker containers fail to start
- Error: "port is already allocated"

**Solution:**
1. **Find process using port 5432 (Postgres):**
   ```bash
   netstat -ano | findstr :5432
   ```
2. **Find process using port 6379 (Redis):**
   ```bash
   netstat -ano | findstr :6379
   ```
3. **Stop conflicting services:**
   - If PostgreSQL is installed locally, stop it via Services
   - If Redis is installed locally, stop it via Services
4. **Restart Docker containers:**
   ```bash
   cd obsidian-news-desk
   docker-compose restart
   ```

---

### Issue 5: "Docker Desktop is starting..." stuck forever

**Symptoms:**
- Docker Desktop never finishes starting
- System tray icon stays gray/orange indefinitely

**Solution 1: Clear Docker Desktop data**
1. Right-click Docker Desktop system tray icon
2. Click **"Troubleshoot"** → **"Reset to factory defaults"**
3. Confirm and wait for reset
4. Restart Docker Desktop

**Solution 2: Reinstall Docker Desktop**
1. Uninstall Docker Desktop via Control Panel
2. Delete Docker data folders:
   - `C:\Program Files\Docker`
   - `C:\ProgramData\Docker`
   - `%APPDATA%\Docker`
3. Restart computer
4. Reinstall Docker Desktop

---

## Advanced Usage: Manual Docker Compose

If you prefer to manage Docker containers manually instead of using the Obsidian News Desk service manager:

### Start Services
```bash
cd obsidian-news-desk
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Check Status
```bash
docker-compose ps
```

---

## Alternative: Docker Desktop Alternatives

If Docker Desktop is not suitable for your environment, consider these alternatives:

### Option 1: Rancher Desktop
- Open-source alternative to Docker Desktop
- Compatible with Docker Compose
- Download: https://rancherdesktop.io/

### Option 2: Podman Desktop
- Daemonless container engine
- Drop-in replacement for Docker
- Download: https://podman-desktop.io/

### Option 3: Manual Database Installation (Advanced)
- Install PostgreSQL 16 manually (port 5432)
- Install Redis 7 manually (port 6379)
- Configure connection strings in `.env` file
- **Not recommended** - requires manual configuration and maintenance

---

## Additional Resources

### Official Documentation
- **Docker Desktop for Windows:** https://docs.docker.com/desktop/install/windows-install/
- **WSL 2 Installation:** https://docs.microsoft.com/en-us/windows/wsl/install
- **Docker Compose Reference:** https://docs.docker.com/compose/

### Obsidian News Desk Documentation
- **Setup Wizard Guide:** `docs/SETUP_WIZARD.md`
- **Architecture Overview:** `CLAUDE.md`
- **Service Manager:** `electron/src/services/manager.ts`

### Support
- **GitHub Issues:** https://github.com/your-org/obsidian-news-desk/issues
- **Discussions:** https://github.com/your-org/obsidian-news-desk/discussions

---

## License

Docker Desktop is free for:
- Personal use
- Small businesses (fewer than 250 employees AND less than $10 million annual revenue)
- Education and non-commercial open-source projects

For larger organizations, Docker Desktop requires a paid subscription. See: https://www.docker.com/pricing/

**Note:** Obsidian News Desk itself is licensed separately - see `LICENSE` file in repository root.

---

## Next Steps

After Docker Desktop is installed and running:

1. ✅ Return to the Obsidian News Desk installer
2. ✅ The Prerequisites step should show green checkmark
3. ✅ Click "Next" to continue to API configuration
4. ✅ Complete the remaining setup steps

**Estimated total setup time:** 30-45 minutes (including Docker installation)
