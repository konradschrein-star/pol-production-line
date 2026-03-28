# Electron Application Architecture

## Overview

Obsidian News Desk is built as an Electron desktop application with full system integration, service management, and health monitoring. This document provides a technical overview of the architecture for developers.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         ELECTRON APP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     MAIN PROCESS                           │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Window     │  │    Tray      │  │   Auto       │    │ │
│  │  │   Manager    │  │   Manager    │  │   Updater    │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │             SERVICE MANAGER (Phase 4)                │ │ │
│  │  ├──────────────────────────────────────────────────────┤ │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │ │ │
│  │  │  │   Health    │  │    Auto     │  │  Service   │  │ │ │
│  │  │  │  Monitor    │  │  Restarter  │  │   Graph    │  │ │ │
│  │  │  └─────────────┘  └─────────────┘  └────────────┘  │ │ │
│  │  │  ┌─────────────────────────────────────────────┐    │ │ │
│  │  │  │       Graceful Shutdown Manager             │    │ │ │
│  │  │  └─────────────────────────────────────────────┘    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │             IPC HANDLERS (22 handlers)               │ │ │
│  │  ├──────────────────────────────────────────────────────┤ │ │
│  │  │  • Docker (8)    • Workers (3)    • Auto-Start (3)  │ │ │
│  │  │  • Config (7)    • Tutorial (2)                      │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │          AUTO-START MANAGER (Phase 5)                │ │ │
│  │  ├──────────────────────────────────────────────────────┤ │ │
│  │  │  • Windows Registry Integration (HKCU)               │ │ │
│  │  │  • --minimized Flag Handler                          │ │ │
│  │  │  • IPC API (enable, disable, isEnabled, toggle)      │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   RENDERER PROCESS                         │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  • Wizard Window (setup)                                   │ │
│  │  • Tutorial Window (onboarding)                            │ │
│  │  • Main Window (Next.js at localhost:8347)                 │ │
│  │  • Splash Screen (startup progress)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     BACKGROUND SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│  • Docker (PostgreSQL + Redis containers)                       │
│  • Next.js Server (port 8347)                                   │
│  • BullMQ Workers (4 queues: analyze, images, avatar, render)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Main Process Components

### Window Manager

**Location:** `electron/src/main.ts`

**Responsibilities:**
- Create and manage Electron browser windows
- Handle window lifecycle events (show, hide, close, minimize)
- Implement minimize-to-tray behavior
- Route IPC messages to appropriate handlers

**Window Types:**

| Window | Size | Purpose | Lifecycle |
|--------|------|---------|-----------|
| Wizard | 800x700 | First-run setup | Closes after completion |
| Tutorial | 900x700 | Post-setup onboarding | Closes after completion or skip |
| Main | 1600x900 | Production UI (Next.js) | Minimizes to tray on close |
| Splash | 500x400 | Startup progress | Auto-closes after startup |

**Key Functions:**
```typescript
createWizardWindow()   // First-run setup
createTutorialWindow() // Post-setup onboarding
createMainWindow()     // Production UI
createSplashWindow()   // Startup progress
```

**Minimize-to-Tray Implementation:**
```typescript
mainWindow.on('close', (event) => {
  if (!(app as any).isQuitting) {
    event.preventDefault();
    mainWindow.hide();
  }
});
```

---

### ServiceManager (Phase 4)

**Location:** `electron/src/services/manager.ts`

**Responsibilities:**
- Orchestrate Docker, Next.js, and Worker services
- Coordinate HealthMonitor, AutoRestarter, ServiceGraph, GracefulShutdown
- Emit startup progress events for splash screen
- Handle service lifecycle (start, stop, restart)

**Startup Sequence:**
```typescript
async startAll(onProgress?: (progress: StartupProgress) => void): Promise<void> {
  1. Check ports (5432, 6379)
  2. Start Docker Desktop
  3. Start Docker Compose (PostgreSQL + Redis)
  4. Wait for service readiness (pg_isready, redis-cli ping)
  5. Start Next.js server (port 8347)
  6. Start BullMQ workers
  7. Start HealthMonitor
  8. Emit 'startup:complete'
}
```

**Shutdown Sequence:**
```typescript
async stopAll(): Promise<void> {
  1. Stop HealthMonitor (prevent restart loops)
  2. Graceful shutdown: Drain queues (max 30s)
  3. Stop Workers (SIGTERM → SIGKILL after 5s)
  4. Stop Next.js (SIGTERM → SIGKILL after 5s)
  5. Stop Docker Compose (docker-compose down)
}
```

**Integration Points:**
- `HealthMonitor`: Continuous service health checking
- `AutoRestarter`: Crash recovery with exponential backoff
- `ServiceGraph`: Dependency ordering (Docker → Next.js → Workers)
- `GracefulShutdown`: Queue draining before exit

---

### HealthMonitor (Phase 4)

**Location:** `electron/src/services/health-monitor.ts`

**Responsibilities:**
- Check service health every 5 seconds (adaptive polling)
- Emit events on state transitions (service-down, service-up, degraded)
- Implement multi-tier health checks (daemon + containers + connections)

**Health Check Methods:**

| Service | Check Method | Success Criteria |
|---------|--------------|------------------|
| Docker | 3-tier check | Daemon running + containers running + connections |
| PostgreSQL | `pg_isready -U postgres` | Exit code 0 |
| Redis | `redis-cli ping` | Response "PONG" |
| Workers | PID check (signal 0) | Process exists |
| Next.js | HTTP GET /api/health | Status 200 |

**Adaptive Polling:**
```typescript
- 2 seconds:  Any service unhealthy (fast recovery detection)
- 5 seconds:  Normal operation
- 15 seconds: All services stable for 5+ minutes (reduce CPU usage)
```

**Event Emission:**
```typescript
this.emit('health:service-down', service, status);  // Triggers auto-restart
this.emit('health:service-up', service, status);    // Updates tray icon
this.emit('health:degraded', service, status);      // After 3 consecutive failures
```

---

### AutoRestarter (Phase 4)

**Location:** `electron/src/services/auto-restart.ts`

**Responsibilities:**
- Automatically restart failed services
- Implement exponential backoff (1s → 2s → 5s → 10s → 30s)
- Rate limiting (max 5 restarts per minute)
- Notify user of auto-restarts

**Restart Flow:**
```typescript
1. HealthMonitor detects service-down
2. AutoRestarter checks rate limit
3. Wait for backoff delay (exponential)
4. Call service-specific restart function
5. Emit 'restart:success' or 'restart:failed'
6. Update backoff level on success
7. If rate-limited, wait 60s and retry
```

**Rate Limiting (Phase 4 Bug Fix #2):**
```typescript
if (recentRestarts.length >= 5) {
  const retryInSeconds = this.getTimeUntilRateLimitReset(service);
  setTimeout(() => {
    this.restart(service);  // Retry after rate limit window
  }, retryInSeconds * 1000);
}
```

---

### TrayManager

**Location:** `electron/src/tray.ts`

**Responsibilities:**
- Create and manage system tray icon
- Build context menu with service status
- Handle tray icon clicks and menu selections
- Update icon based on service health

**Icon States:**

| Color | File | Condition |
|-------|------|-----------|
| Green | `tray-icon-green.png` | All services healthy |
| Yellow | `tray-icon-yellow.png` | One or more services unhealthy |
| Red | `tray-icon-red.png` | Multiple consecutive failures |
| Gray | `tray-icon-gray.png` | Services not started |

**Status Polling:**
```typescript
setInterval(async () => {
  const status = await this.serviceManager.getStatus();
  this.updateIcon(status);
  this.updateContextMenu(status);
}, 10000);  // Every 10 seconds
```

**Context Menu Structure:**
```typescript
- 🎬 Obsidian News Desk
- [Status: All Services Running ✓]
- ───────────────────
- Open Dashboard
- Services ▶
  - Docker: ✓ Running
    - PostgreSQL: ✓ Running
    - Redis: ✓ Running
  - Next.js: ✓ Running (PID 12345)
  - Workers: ✓ Running (PID 67890)
  - ───────────────────
  - Restart All Services
- Stop Services
- View Logs
- Settings
- ───────────────────
- Show Tutorial
- ───────────────────
- Quit
```

---

### Auto-Start Manager (Phase 5)

**Location:** `electron/src/auto-start.ts`

**Platform Support:** Windows-only in Phase 5 (macOS/Linux deferred to Phase 6+)

**Responsibilities:**
- Add/remove Windows registry entry for auto-start
- Support --minimized flag for tray-only startup
- Show user-facing error dialogs on failure
- Expose IPC API for settings UI

**Registry Integration:**
```typescript
Registry Key:  HKCU\Software\Microsoft\Windows\CurrentVersion\Run
Value Name:    Obsidian News Desk
Value Data:    \"C:\path\to\app.exe\" --minimized
```

**IPC API:**
```typescript
enable(options: { enabled: boolean, minimized?: boolean }): Promise<void>
disable(): Promise<void>
isEnabled(): Promise<boolean>
toggle(enable: boolean, minimized?: boolean): Promise<boolean>
```

**Static Helper:**
```typescript
AutoStartManager.shouldStartMinimized(): boolean
// Returns true if --minimized flag is present in process.argv
```

**Error Handling:**
```typescript
// Show user-facing dialogs on registry errors
await dialog.showMessageBox({
  type: 'error',
  title: 'Auto-Start Error',
  message: 'Failed to enable auto-start',
  detail: err.message,
});
```

---

### Auto-Updater

**Location:** `electron/src/updater.ts`

**Responsibilities:**
- Check for updates every 6 hours
- Download updates on user consent
- Notify user when update is ready
- Quit and install on user request

**Update Flow:**
```typescript
1. Check GitHub Releases for latest version
2. Compare with current app version
3. If newer version exists, notify user
4. On user consent, download .exe installer
5. When download complete, show "Restart to Update" notification
6. On user request, quit app and run installer
```

**Configuration:**
```typescript
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'yourusername',
  repo: 'obsidian-news-desk',
  private: false,
});
```

---

## IPC Communication

### Handler Categories

**Docker Operations (8 handlers):**
```typescript
docker:getStatus         // Check if Docker daemon is running
docker:install           // Open Docker Desktop download page
docker:start             // Start Docker Desktop
docker:pullImages        // Pull PostgreSQL + Redis images
docker:startCompose      // Start docker-compose up -d
docker:stopCompose       // Stop docker-compose down
docker:waitForServices   // Poll until pg_isready + redis-cli ping succeed
docker:getContainerStatus // List running containers
```

**Config Operations (7 handlers):**
```typescript
config:validateAPIKey         // Test API key with provider
config:validateStoragePath    // Check if path exists and is writable
config:getDiskSpace           // Get available/total disk space
config:selectDirectory        // Open native directory picker
config:createStorageDirectories // Create images/, avatars/, videos/ folders
config:generateEnv            // Write .env file from wizard inputs
config:save                   // Update .env file
config:get                    // Read current .env values
```

**Worker Operations (3 handlers):**
```typescript
workers:start      // Spawn BullMQ workers
workers:stop       // Kill worker process
workers:getStatus  // Get worker PID and running state
```

**Tutorial/Navigation (2 handlers):**
```typescript
tutorial:skip     // Skip tutorial, go to main window
tutorial:finish   // Complete tutorial, go to main window
```

**Auto-Start Operations (3 handlers - Phase 5):**
```typescript
auto-start:toggle    // Enable/disable auto-start with optional minimized flag
auto-start:getStatus // Check if auto-start is currently enabled
auto-start:enable    // Enable auto-start (convenience method)
```

### Security Model

**Context Isolation:**
```typescript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  nodeIntegration: false,      // Disable Node.js in renderer
  contextIsolation: true,      // Separate renderer context
}
```

**Preload Script Boundary:**

The preload script (`electron/src/preload.ts`) is the only bridge between main and renderer processes:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  docker: { /* ... */ },
  config: { /* ... */ },
  workers: { /* ... */ },
  autoStart: { /* ... */ },  // Phase 5
});
```

**API Surface Restrictions:**

Only whitelisted methods are exposed to renderer. Direct access to Electron APIs (fs, child_process, etc.) is blocked.

---

## Build & Packaging

### Development Build

```bash
# Start Electron in development mode
cd obsidian-news-desk
npm run dev

# Starts 3 terminals:
# 1. Docker logs (docker-compose logs -f)
# 2. BullMQ workers (npm run workers)
# 3. Electron main process (npm run electron:dev)
```

### Production Build

```bash
# Build Next.js app
npm run build

# Build Electron app
npm run electron:build

# Create installer
npm run build:installer
```

**Output:**
```
dist/
  ObsidianNewsDesk-Setup-v1.0.0.exe  (150-200 MB)
```

### Installer Configuration

**Location:** `electron-builder.yml`

```yaml
appId: com.obsidian.newsdesk
productName: Obsidian News Desk
copyright: Copyright © 2026

win:
  target: nsis
  icon: electron/assets/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  runAfterFinish: true
```

---

## Debugging Tips

### Enable DevTools

**In main.ts:**
```typescript
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools();
}
```

### View Logs

**Location:** `%USERPROFILE%\.obsidian-news-desk\logs\`

```
electron.log  - Main process logs
docker.log    - Docker Compose output
nextjs.log    - Next.js server logs
workers.log   - BullMQ worker logs
```

**Tail logs in real-time:**
```bash
# Windows PowerShell
Get-Content "$env:USERPROFILE\.obsidian-news-desk\logs\electron.log" -Wait -Tail 50
```

### Check Registry

**Open Registry Editor:**
```
regedit
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
```

**Look for:**
```
Name:  Obsidian News Desk
Type:  REG_SZ
Data:  "C:\path\to\app.exe" --minimized
```

### Monitor Services

**System Tray:**
- Right-click tray icon
- Services → View status of all components

**Task Manager:**
- Look for processes:
  - Obsidian News Desk.exe (main process)
  - node.exe (Next.js server)
  - node.exe (BullMQ workers)

**Docker Desktop:**
- Check containers: obsidian-postgres, obsidian-redis
- View logs for containers

---

## Code Structure

```
obsidian-news-desk/
├── electron/                    # Electron main process
│   ├── src/
│   │   ├── main.ts              # Entry point, window manager, IPC handlers
│   │   ├── preload.ts           # Context bridge (IPC API surface)
│   │   ├── tray.ts              # System tray manager
│   │   ├── updater.ts           # Auto-updater
│   │   ├── logger.ts            # Logging utility
│   │   ├── auto-start.ts        # Auto-start manager (Phase 5)
│   │   ├── docker/
│   │   │   ├── check.ts         # Docker status checks
│   │   │   └── lifecycle.ts     # Docker start/stop
│   │   ├── config/
│   │   │   ├── storage.ts       # Config file persistence
│   │   │   ├── validator.ts     # API key validation
│   │   │   └── env-generator.ts # .env file generation
│   │   ├── services/
│   │   │   ├── manager.ts       # Service orchestrator (Phase 4)
│   │   │   ├── health-monitor.ts # Health checking (Phase 4)
│   │   │   ├── auto-restart.ts  # Crash recovery (Phase 4)
│   │   │   ├── service-graph.ts # Dependency ordering (Phase 4)
│   │   │   └── graceful-shutdown.ts # Queue draining (Phase 4)
│   │   ├── workers/
│   │   │   └── spawner.ts       # BullMQ worker process spawner
│   │   └── installer/
│   │       ├── components/      # React components for wizard/tutorial
│   │       └── pages/           # HTML pages for wizard/tutorial
│   ├── assets/
│   │   ├── icon.ico             # App icon (Windows)
│   │   └── tray-*.png           # Tray icons (green/yellow/red/gray)
│   └── package.json
│
├── src/                         # Next.js application
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx         # Broadcast list
│   │   │   ├── new/page.tsx     # New broadcast form
│   │   │   ├── [id]/page.tsx    # Storyboard editor
│   │   │   └── settings/page.tsx # Settings page (auto-start UI)
│   │   └── api/
│   │       ├── jobs/            # Job CRUD endpoints
│   │       ├── settings/        # Settings API
│   │       └── health/          # Health check endpoint
│   ├── components/
│   │   ├── broadcast/           # Job-specific UI
│   │   ├── data/                # Data tables
│   │   ├── layout/              # Page structure
│   │   ├── settings/            # Settings UI
│   │   └── ui/                  # Reusable primitives
│   └── lib/
│       ├── remotion/            # Video rendering
│       ├── whisk/               # Image generation
│       └── services/            # BullMQ workers
│
├── docs/
│   ├── PHASE5_DESKTOP_APP.md     # User guide (Phase 5)
│   ├── ELECTRON_ARCHITECTURE.md  # Developer guide (Phase 5)
│   └── INSTALLER_ROADMAP.md      # Implementation roadmap
│
├── electron-builder.yml          # Installer configuration
├── package.json
└── README.md
```

---

## Testing

### Manual Testing

**Startup Test:**
1. Launch app
2. Verify splash screen appears
3. Verify all services start (check tray icon → Services)
4. Verify main window opens after startup

**Auto-Start Test:**
1. Enable auto-start in Settings
2. Restart Windows
3. Verify app launches automatically
4. Verify services start automatically

**Crash Recovery Test:**
1. Start app
2. Kill worker process: `taskkill /F /PID <pid>`
3. Wait 5 seconds
4. Verify auto-restart notification appears
5. Verify worker process restarts

**Graceful Shutdown Test:**
1. Start render job
2. Quit app via tray menu
3. Verify queue drains before exit
4. Check logs for "Graceful shutdown complete"

### Automated Testing (Not Implemented in Phase 5)

**Future: Spectron/Playwright Integration:**

```typescript
import { _electron as electron } from 'playwright';

test('App starts and loads main window', async () => {
  const app = await electron.launch({
    args: ['obsidian-news-desk/electron/src/main.ts'],
  });

  const window = await app.firstWindow();
  expect(await window.title()).toBe('Obsidian News Desk');

  await app.close();
});
```

---

## Phase 4 Bug Fixes (Implemented March 27, 2026)

### Bug #1 (CRITICAL): Worker Health Check Fixed

**Problem:** Health monitor read `(global as any).workerProcess?.pid` but spawner stores PID differently

**Fix:**
```typescript
// OLD (broken):
const workerPid = (global as any).workerProcess?.pid;

// NEW (fixed):
import { getWorkerStatus } from '../workers/spawner';
const workerStatus = getWorkerStatus();
const workerPid = workerStatus.pid;
```

**Impact:** Worker crashes now properly detected, auto-restart works

---

### Bug #2 (MODERATE): Rate Limit Recovery Added

**Problem:** After 5 restarts in 1 minute, system stopped trying forever

**Fix:**
```typescript
if (state.recentRestarts.length >= MAX_RESTARTS_PER_MINUTE) {
  const retryInSeconds = this.getTimeUntilRateLimitReset(service);

  // NEW: Schedule retry after rate limit window
  setTimeout(() => {
    logger.info(`Rate limit window expired for ${service}, retrying restart`);
    this.restart(service);
  }, retryInSeconds * 1000);

  return;
}
```

**Impact:** Services recover automatically after rate limit expires

---

### Bug #3 (MODERATE): Adaptive Polling Logic Fixed

**Problem:** Checked "time since last check" instead of "time since state change"

**Fix:**
```typescript
// Added lastStateChange field to HealthStatus interface
export interface HealthStatus {
  service: string;
  healthy: boolean;
  lastCheck: Date;
  lastStateChange: Date;  // NEW: Track state changes separately
  consecutiveFailures: number;
  details?: string;
}

// Fixed adaptive polling logic
const allStableLongTerm = statuses.every(s => {
  const timeSinceStateChange = Date.now() - s.lastStateChange.getTime();
  return s.healthy && timeSinceStateChange > 300000;  // 5 minutes
});
```

**Impact:** Polling interval now correctly slows to 15s after 5 minutes of stability

---

## Phase 5 Enhancements (Implemented March 27, 2026)

### Auto-Start on Windows Boot

**Registry Integration:**
- Location: `electron/src/auto-start.ts` (150 lines)
- Registry Key: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- No admin privileges required
- Proper quote escaping for paths with spaces

**IPC Handlers:**
- `auto-start:toggle` - Enable/disable with optional minimized flag
- `auto-start:getStatus` - Check current state
- `auto-start:enable` - Convenience method for enabling

**--minimized Flag Handler:**
- Checks `process.argv.includes('--minimized')`
- Skips showing main window on startup
- App starts in tray only

### Settings UI

**Location:** `src/app/(dashboard)/settings/page.tsx`

**Features:**
- Toggle: "Start with Windows"
- Toggle: "Start minimized to tray"
- Visual feedback with custom toggle switches
- Informational panel about registry entry
- Electron-only (hidden in browser mode)

### Tray Menu "Settings" Item

**Location:** `electron/src/tray.ts`

**Implementation:**
```typescript
{
  label: 'Settings',
  click: () => this.openSettings(),
}

private openSettings(): void {
  if (this.mainWindow && !this.mainWindow.isDestroyed()) {
    this.mainWindow.webContents.loadURL('http://localhost:8347/settings');
    this.mainWindow.show();
    this.mainWindow.focus();
  } else {
    shell.openExternal('http://localhost:8347/settings');
  }
}
```

---

## Future Enhancements (Phase 6+)

### Code Signing (Phase 6)

**Why:** Eliminate Windows SmartScreen warning

**How:**
1. Purchase code signing certificate
2. Sign .exe with `signtool.exe`
3. Configure electron-builder:
```yaml
win:
  certificateFile: certs/code-signing.pfx
  certificatePassword: ${env:CERT_PASSWORD}
```

### Deep Linking (Phase 9)

**Why:** Launch app from browser links (obsidian://...)

**How:**
1. Register protocol handler in electron-builder.yml
2. Handle protocol URLs in main.ts
3. Example: `obsidian://open-job/123`

### MSIX Packaging (Phase 6)

**Why:** Microsoft Store distribution

**How:**
1. Convert NSIS installer to MSIX
2. Submit to Microsoft Partner Center
3. Configure electron-builder:
```yaml
win:
  target: [nsis, appx]
```

### Telemetry System (Phase 9)

**Why:** Understand usage patterns (opt-in only)

**How:**
1. Integrate analytics library (e.g., Mixpanel, Segment)
2. Track events: app_launch, video_created, job_failed
3. Add opt-out toggle in Settings

---

**Last Updated:** March 27, 2026
**Phase:** 5 (Desktop App Shell Complete)
**Next Phase:** 6 (Installer Packaging & Distribution)
