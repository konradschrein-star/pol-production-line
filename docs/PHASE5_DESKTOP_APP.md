# Phase 5: Desktop App User Guide

## Overview

Obsidian News Desk runs as a native **Windows desktop application** with full system integration:

- **System Tray Integration:** Minimize to tray, quick status monitoring
- **Auto-Start on Boot:** Launch automatically when Windows starts (Windows-only in Phase 5)
- **Service Management:** Start/stop all services from tray menu
- **Real-Time Monitoring:** Health checks with automatic crash recovery
- **Graceful Shutdown:** Queue draining before exit to prevent data loss

**Platform Support:**
- ✅ **Windows 10/11:** Fully supported (Phase 5)
- ⏳ **macOS/Linux:** Planned for Phase 6+

---

## System Tray

### Icon States

The tray icon changes color to reflect system health:

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | All Healthy | All services running and healthy |
| 🟡 Yellow | Degraded | One or more services unhealthy |
| 🔴 Red | Critical | Multiple consecutive failures |
| ⚫ Gray | Stopped | Services not started |

### Context Menu

Right-click the tray icon to access:

- **Open Dashboard:** Opens main window (http://localhost:8347)
- **Services:** View status of Docker, PostgreSQL, Redis, Next.js, Workers
- **Restart All Services:** Restart Docker, Next.js, and Workers
- **Stop Services:** Gracefully stop all services
- **View Logs:** Opens logs folder in File Explorer
- **Settings:** Opens settings page for configuration
- **Show Tutorial:** Launches first-run tutorial
- **Quit:** Gracefully shuts down and exits

### Minimize-to-Tray Behavior

- Clicking the window close button (X) minimizes to tray instead of quitting
- To fully quit the app, use **Tray → Quit** or **Ctrl+Q**
- This prevents accidental closure during long-running jobs

---

## Auto-Start Configuration

**⚠️ Windows-Only Feature (Phase 5)**

Auto-start is currently **Windows-only** in Phase 5. macOS and Linux support will be added in Phase 6+.

### Enabling Auto-Start

1. Open **Settings** from system tray menu
2. Navigate to the **STARTUP** section (first card)
3. Toggle **"Start with Windows"** ON
4. (Optional) Toggle **"Start minimized to tray"** if you want the app to start silently

### What It Does

When enabled, the app:
- Adds a registry entry: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Launches automatically when you log in to Windows
- Starts all services (Docker, Next.js, Workers) automatically
- No admin privileges required (uses current user registry hive)

### Start Minimized Option

If enabled:
- App starts in system tray only (no main window shown)
- Services still start normally
- Click "Open Dashboard" in tray menu to show main window
- Useful for keeping the system always ready without UI clutter

### Disabling Auto-Start

1. Open **Settings** from system tray menu
2. Navigate to the **STARTUP** section
3. Toggle **"Start with Windows"** OFF
4. Registry entry is removed immediately (no restart required)

---

## Updating the App

### Automatic Updates

The app checks for updates every 6 hours:

1. **Update Available:** Notification appears in system tray
2. **User Consent:** Click notification to download update
3. **Download:** Update downloads in background
4. **Install:** Click "Restart to Update" when ready
5. **Automatic Installation:** App installs update and relaunches

### Manual Update Check

Not currently exposed in UI. Automatic checks happen every 6 hours.

### Update Source

Updates are fetched from GitHub Releases:
- Repository: `https://github.com/yourusername/obsidian-news-desk` (update this)
- Channel: `latest` (stable releases only)
- Format: `.exe` installer for Windows

---

## Service Lifecycle

### Startup Sequence

When the app starts:

1. **Port Check:** Verify ports 5432 (PostgreSQL) and 6379 (Redis) are free
2. **Docker Start:** Launch Docker Desktop if not running
3. **Container Start:** Start PostgreSQL and Redis containers
4. **Database Init:** Run migrations if needed
5. **Next.js Start:** Launch web server on port 8347
6. **Worker Start:** Launch BullMQ workers for job processing
7. **Health Monitor Start:** Begin continuous health checking (every 5 seconds)
8. **Main Window:** Show main window (unless `--minimized` flag present)

**Typical startup time:** 30-60 seconds

### Shutdown Sequence

When you quit the app (Tray → Quit):

1. **Stop Health Monitor:** Disable health checks to prevent restart loops
2. **Drain Queues:** Wait for in-progress jobs to finish (max 30 seconds)
3. **Stop Workers:** Send SIGTERM to worker process (force kill after 5s)
4. **Stop Next.js:** Send SIGTERM to Next.js process (force kill after 5s)
5. **Stop Docker:** Run `docker-compose down` (stops containers gracefully)
6. **Close Windows:** Close all Electron windows
7. **Exit:** Quit Electron app

**Typical shutdown time:** 5-15 seconds

---

## Health Monitoring & Auto-Restart

### Continuous Health Checks

The app monitors all services every 5 seconds:

- **Docker:** Daemon running + containers running + service connections (pg_isready, redis-cli ping)
- **Workers:** Process PID check (signal 0)
- **Next.js:** HTTP health endpoint check (GET http://localhost:8347/api/health)

### Adaptive Polling

Polling interval adjusts based on service health:

- **2 seconds:** When any service is unhealthy (fast recovery detection)
- **5 seconds:** Normal operation
- **15 seconds:** When all services stable for 5+ minutes (reduce CPU usage)

### Auto-Restart Logic

When a service becomes unhealthy:

1. **Wait for backoff delay:** 1s → 2s → 5s → 10s → 30s (exponential backoff)
2. **Attempt restart:** Run service-specific restart function
3. **Notify user:** Show system notification "Service restarted automatically"
4. **Update tray icon:** Change to yellow (degraded) until service recovers

### Rate Limiting

To prevent restart loops:

- **Max 5 restarts per minute** per service
- **After rate limit:** System waits 60 seconds before retrying
- **User notification:** "Service restart rate-limited, retrying in 60s"

### Crash Recovery

If a service crashes:

1. **HealthMonitor detects:** Service unhealthy (consecutive failures)
2. **AutoRestarter triggers:** After 3 consecutive failures
3. **Restart attempt:** With exponential backoff
4. **Success:** Service recovers, tray icon returns to green
5. **Failure:** After 5 failed restarts in 1 minute, wait 60s and retry

---

## Troubleshooting

### App Won't Start

**Symptoms:** Double-clicking the .exe does nothing

**Solutions:**
1. Check if app is already running (look for tray icon)
2. Check Task Manager for "Obsidian News Desk.exe"
3. Kill existing process and restart
4. Check logs: `%USERPROFILE%\.obsidian-news-desk\logs\electron.log`

### Auto-Start Not Working

**Symptoms:** App doesn't launch on Windows startup

**Solutions:**
1. Open Settings → Check "Start with Windows" is enabled
2. Check registry: `regedit` → `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
3. Verify registry value exists: "Obsidian News Desk" = "path\to\app.exe"
4. Restart Windows to test
5. Check Windows startup apps: Settings → Apps → Startup

### Services Keep Crashing

**Symptoms:** Yellow/red tray icon, frequent auto-restart notifications

**Solutions:**
1. Check logs in: `%USERPROFILE%\.obsidian-news-desk\logs\`
2. View service status: Right-click tray → Services
3. Manually restart all: Tray → Restart All Services
4. Check Docker Desktop is running
5. Verify ports 5432 and 6379 are not in use by other apps
6. Restart app: Tray → Quit, then relaunch

### Main Window Won't Open

**Symptoms:** Tray icon present, but "Open Dashboard" does nothing

**Solutions:**
1. Check if Next.js is running: Tray → Services
2. Open browser manually: http://localhost:8347
3. Check logs: `%USERPROFILE%\.obsidian-news-desk\logs\nextjs.log`
4. Restart Next.js: Tray → Restart All Services
5. Check port 8347 is not blocked by firewall

### Update Fails

**Symptoms:** Update download completes, but installation fails

**Solutions:**
1. Close all app instances
2. Download installer manually from GitHub Releases
3. Run installer as administrator
4. Uninstall old version first (Settings → Apps)
5. Reinstall from fresh download

---

## FAQ

### Q: How do I completely uninstall the app?

**A:**
1. Quit the app: Tray → Quit
2. Uninstall via Windows Settings: Settings → Apps → Obsidian News Desk → Uninstall
3. (Optional) Delete data folders:
   - `%USERPROFILE%\.obsidian-news-desk` (config and logs)
   - `C:\Users\konra\ObsidianNewsDesk` (videos, images, avatars)

### Q: Can I run multiple instances of the app?

**A:** No, only one instance can run at a time. The app checks for existing instances on startup and exits if one is already running.

### Q: How do I export logs?

**A:**
1. Right-click tray icon → View Logs
2. Opens: `%USERPROFILE%\.obsidian-news-desk\logs\`
3. Copy files: `electron.log`, `docker.log`, `workers.log`, `nextjs.log`

### Q: What data does the app store locally?

**A:**
- **Configuration:** `%USERPROFILE%\.obsidian-news-desk\config\` (.env file, encrypted API keys)
- **Logs:** `%USERPROFILE%\.obsidian-news-desk\logs\`
- **Media:** `C:\Users\konra\ObsidianNewsDesk\` (videos, images, avatars)
- **Database:** Docker volume (PostgreSQL data)
- **Queue:** Docker volume (Redis data)

### Q: Does the app send telemetry?

**A:** No, the app does not send any usage data or analytics. All processing happens locally.

### Q: How do I change the default storage location?

**A:**
1. Open Settings
2. Scroll to "Storage" section (if available)
3. Change the path
4. Restart app for changes to take effect

**Note:** Changing storage location after videos are created will not move existing files. You must manually copy them to the new location.

### Q: Can I use a different browser for HeyGen?

**A:** Yes, open Settings → Browser Automation → Default Browser. Choose Chrome, Edge, or Chromium. Make sure the browser is installed.

---

## Keyboard Shortcuts

### Main Window

- **Ctrl+Q:** Quit app (same as Tray → Quit)
- **F5:** Refresh page
- **Ctrl+R:** Reload page
- **F11:** Toggle fullscreen
- **F12:** Open DevTools (development mode only)

### System Tray

- Right-click tray icon to open menu
- Left-click tray icon to open dashboard (same as double-click)

---

## System Requirements

- **OS:** Windows 10 or later (Windows 11 recommended)
- **RAM:** 8 GB minimum, 16 GB recommended
- **Disk:** 10 GB free space for app + Docker + video output
- **CPU:** 4 cores minimum, 8 cores recommended for faster rendering
- **Docker:** Docker Desktop 20.10 or later

---

## Support

For issues, bug reports, or feature requests:

- GitHub Issues: [Create an issue](https://github.com/yourusername/obsidian-news-desk/issues)
- Email: support@example.com (update this)
- Documentation: `docs/` folder in installation directory

---

**Last Updated:** March 27, 2026
**App Version:** 1.0.0
**Phase:** 5 (Desktop App Shell Complete)
