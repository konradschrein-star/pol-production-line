# Obsidian News Desk - Electron Desktop App

## Status: COMPLETE ✅

The Electron one-click installer is fully implemented with:
- ✅ Complete 6-page setup wizard
- ✅ Docker Desktop detection and installation
- ✅ Storage path configuration
- ✅ API key validation for all providers
- ✅ Automated service startup
- ✅ Windows installer (NSIS) configuration
- ✅ GitHub Actions CI/CD workflow

---

## Table of Contents

1. [For Developers](#for-developers)
2. [For End Users](#for-end-users)
3. [Building the Installer](#building-the-installer)
4. [Architecture](#architecture)
5. [Troubleshooting](#troubleshooting)

---

## For Developers

### Development Mode

**Option 1: Run Electron with existing Next.js server**
```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Compile and run Electron
npm run electron:compile
npm run electron
```

**Option 2: Automatic (recommended)**
```bash
# Starts Next.js, waits for it, compiles Electron, then launches
npm run electron:dev
```

### Project Structure

```
electron/
├── src/
│   ├── main.ts                  # Electron main process
│   ├── preload.ts               # IPC bridge (secure)
│   ├── config/
│   │   ├── storage.ts           # electron-store configuration
│   │   ├── env-generator.ts     # .env file generation
│   │   └── validator.ts         # API key validation
│   ├── docker/
│   │   ├── check.ts             # Docker Desktop detection
│   │   └── lifecycle.ts         # Docker Compose management
│   ├── workers/
│   │   └── spawner.ts           # BullMQ worker spawning
│   └── installer/
│       ├── pages/
│       │   └── wizard.html      # 6-page wizard UI
│       ├── styles/
│       │   └── wizard.css       # Dark theme styles
│       └── wizard.js            # Wizard logic
├── dist/                        # Compiled JavaScript
└── build/                       # Icon and installer resources
```

### Making Changes

**1. Edit Electron Code:**
```bash
# Edit files in electron/src/
# Then recompile:
npm run electron:compile
```

**2. Edit Wizard UI:**
- HTML: `electron/src/installer/pages/wizard.html`
- CSS: `electron/src/installer/styles/wizard.css`
- JavaScript: `electron/src/installer/wizard.js`
- No compilation needed - changes are live

**3. Test First Run Experience:**
```bash
# Delete electron-store config to trigger wizard
rm -rf %APPDATA%/obsidian-news-desk-config
npm run electron:dev
```

---

## For End Users

### System Requirements

- **OS:** Windows 10 or 11 (64-bit)
- **RAM:** 8GB minimum, 16GB recommended
- **Disk:** 10GB free space
- **Other:** Docker Desktop will be installed if not present

### Installation Steps

1. **Download Installer**
   - Get `Obsidian-News-Desk-Setup-X.X.X.exe` from GitHub Releases
   - Or build it yourself (see [Building the Installer](#building-the-installer))

2. **Run Installer**
   - Double-click the `.exe` file
   - Choose installation directory (default: `C:\Program Files\Obsidian News Desk`)
   - Installer creates desktop shortcut and Start Menu entry

3. **First Launch - Setup Wizard**
   - **Page 1: Welcome** - System requirements check
   - **Page 2: Docker Check** - Detects or installs Docker Desktop
   - **Page 3: Storage Path** - Choose where to store videos/images
   - **Page 4: API Keys** - Configure AI provider (OpenAI/Claude/Google/Groq)
   - **Page 5: Installation** - Pulls Docker images, starts services
   - **Page 6: Complete** - Click "Launch Application"

4. **Use the App**
   - Main window opens at `http://localhost:8347`
   - Docker containers auto-start on launch
   - BullMQ workers run in background

### Updating

**Manual Update:**
1. Download new installer
2. Run it (will upgrade in-place)
3. Your settings and data are preserved

**Automatic Updates:** (Coming soon with electron-updater)

### Uninstallation

**Via Control Panel:**
1. Open "Apps & Features"
2. Find "Obsidian News Desk"
3. Click "Uninstall"

**What Gets Removed:**
- Application files
- Desktop/Start Menu shortcuts

**What's Preserved:**
- Configuration (`%APPDATA%/obsidian-news-desk-config`)
- Storage directory (videos, images, avatars)
- Docker containers (you can remove manually with `docker-compose down -v`)

---

## Building the Installer

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Build Next.js app
npm run build

# 3. Compile Electron TypeScript
npm run electron:compile
```

### Local Build

```bash
# Build installer (creates dist/Obsidian-News-Desk-Setup-X.X.X.exe)
npm run electron:build
```

**Output:**
- `dist/Obsidian-News-Desk-Setup-X.X.X.exe` - Full installer (80-120 MB)
- `dist/win-unpacked/` - Unpacked files (for testing)

### GitHub Actions (CI/CD)

**Automatic Build on Tag:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will:
1. Build Next.js app
2. Compile Electron
3. Create Windows installer
4. Upload to GitHub Releases

**Manual Trigger:**
1. Go to GitHub repository
2. Actions → "Build Electron Installer"
3. Click "Run workflow"

### Configuration

**electron-builder.yml:**
- NSIS installer settings
- File inclusion/exclusion
- Icon and branding
- Update: `publish.owner` and `publish.repo` with your GitHub info

**.github/workflows/build-installer.yml:**
- GitHub Actions workflow
- Runs on `v*.*.*` tags
- Uploads artifacts and creates releases

---

## Architecture

### Electron Process Model

```
Main Process (Node.js)
├── Window Management
├── Docker Lifecycle
├── Worker Spawning
└── IPC Handlers
    └── Context Bridge (secure)
        └── Renderer Process (Browser)
            └── Next.js App (http://localhost:8347)
```

### First Run Flow

```
Launch App
    ↓
Check isFirstRun (electron-store)
    ↓
[YES] → Show Wizard Window
    ├── Page 1: System check
    ├── Page 2: Docker check/install
    ├── Page 3: Storage path
    ├── Page 4: API keys (validate via IPC)
    ├── Page 5: Docker pull + compose up
    └── Page 6: Save config → setFirstRunComplete()
        ↓
Close Wizard → Open Main Window

[NO] → Open Main Window directly
```

### Services Managed by Electron

1. **Docker Desktop**
   - Detection via `docker --version` and `docker info`
   - Auto-start via `Docker Desktop.exe`
   - Container lifecycle via `docker-compose`

2. **PostgreSQL** (Docker)
   - Image: `postgres:16-alpine`
   - Health check: `pg_isready`
   - Auto-initializes schema from `schema.sql`

3. **Redis** (Docker)
   - Image: `redis:7-alpine`
   - Health check: `redis-cli ping`
   - Password: `obsidian_redis_password`

4. **BullMQ Workers** (Node.js child process)
   - Spawned via `tsx scripts/start-workers.ts`
   - Managed lifecycle (start/stop/restart)
   - Logs piped to Electron console

5. **Next.js Server** (Standalone)
   - Runs on port 8347
   - Built with `output: 'standalone'`
   - Loaded in Electron BrowserWindow

### Security

- **Context Isolation:** Enabled (renderer cannot access Node.js directly)
- **Node Integration:** Disabled
- **IPC Bridge:** Whitelisted APIs via `preload.ts`
- **API Keys:** Stored in electron-store (encrypted on disk)

---

## Troubleshooting

### Wizard doesn't appear after fresh install

**Fix:** Delete config and restart
```bash
rmdir /s "%APPDATA%\obsidian-news-desk-config"
```

### Docker fails to start

**Check:**
1. Docker Desktop installed? (Check `C:\Program Files\Docker\Docker\`)
2. Windows features enabled? (WSL 2, Hyper-V)
3. System restart required? (After first Docker install)

**Manual start:**
```bash
"C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Services won't start (PostgreSQL/Redis)

**Check Docker containers:**
```bash
docker ps -a
```

**Restart containers:**
```bash
cd "C:\Program Files\Obsidian News Desk\resources\app"
docker-compose down
docker-compose up -d
```

**View logs:**
```bash
docker logs obsidian-postgres
docker logs obsidian-redis
```

### BullMQ workers crash

**Check environment variables:**
- .env file exists in app directory
- API keys are valid
- Redis connection works

**Restart workers manually:**
```bash
cd "C:\Program Files\Obsidian News Desk\resources\app"
npx tsx scripts/start-workers.ts
```

### Can't connect to localhost:8347

**Check Next.js server:**
```bash
# Is port 8347 in use?
netstat -ano | findstr :8347

# Try restarting the app
```

**Manually start Next.js:**
```bash
cd "C:\Program Files\Obsidian News Desk\resources\app"
npm run start
```

### Installer build fails

**Common issues:**

1. **Missing icon.ico:**
   - Create placeholder: Copy any .ico to `electron/build/icon.ico`
   - Or comment out `icon:` in `electron-builder.yml`

2. **TypeScript errors:**
   ```bash
   npm run electron:compile
   # Fix any errors in electron/src/
   ```

3. **Next.js not built:**
   ```bash
   npm run build
   ```

4. **Out of disk space:**
   - electron-builder creates ~500MB of temp files
   - Clean: `rm -rf dist node_modules/.cache`

### App won't launch after update

**Fix:**
1. Uninstall completely
2. Delete `%APPDATA%\obsidian-news-desk-config`
3. Reinstall fresh

---

## Advanced

### Custom Icon

1. Create 256x256 PNG logo
2. Convert to .ico: https://www.convertico.com/
3. Save as `electron/build/icon.ico`
4. Rebuild: `npm run electron:build`

### Code Signing (Optional)

**For trusted installer:**
1. Get code signing certificate (DigiCert, Sectigo)
2. Update `electron-builder.yml`:
   ```yaml
   win:
     certificateFile: cert.pfx
     certificatePassword: $CERT_PASSWORD
   ```
3. Build with: `npm run electron:build`

### Auto-Updates

**Enable in production:**
1. Update `electron-builder.yml` publish config
2. Implement `electron-updater` in `main.ts`
3. App will check for updates on launch

---

## Files Reference

### Configuration Files

- `electron-builder.yml` - Installer configuration
- `tsconfig.electron.json` - TypeScript for Electron
- `.github/workflows/build-installer.yml` - CI/CD pipeline
- `LICENSE` - MIT License for installer

### Electron Source

- `electron/src/main.ts` - Main process (275 lines)
- `electron/src/preload.ts` - IPC bridge (110 lines)
- `electron/src/config/storage.ts` - Config management (223 lines)
- `electron/src/config/env-generator.ts` - .env generation (212 lines)
- `electron/src/config/validator.ts` - API validation (245 lines)
- `electron/src/docker/check.ts` - Docker detection (217 lines)
- `electron/src/docker/lifecycle.ts` - Docker lifecycle (291 lines)
- `electron/src/workers/spawner.ts` - Worker management (149 lines)

### Wizard UI

- `electron/src/installer/pages/wizard.html` - 6-page HTML (265 lines)
- `electron/src/installer/styles/wizard.css` - Dark theme CSS (510 lines)
- `electron/src/installer/wizard.js` - Logic + validation (538 lines)

**Total Electron Code:** ~2,840 lines

---

## Credits

Built with:
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [electron-builder](https://www.electron.build/) - Installer creation
- [electron-store](https://github.com/sindresorhus/electron-store) - Config storage
- [Next.js](https://nextjs.org/) - React framework

**Status:** Production Ready
**Last Updated:** March 22, 2026
