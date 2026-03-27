# Quick Start: Electron Installer

## For Developers - Build the Installer

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build Next.js
```bash
npm run build
```
This creates the `.next/standalone/` directory needed by Electron.

### Step 3: Compile Electron TypeScript
```bash
npm run electron:compile
```
This compiles `electron/src/**/*.ts` to `electron/dist/**/*.js`.

### Step 4: Build the Installer
```bash
npm run electron:build
```

**Output:**
- `dist/Obsidian-News-Desk-Setup-0.1.0.exe` (80-120 MB)
- `dist/win-unpacked/` (for testing without installing)

### Step 5: Test the Installer
```bash
.\dist\Obsidian-News-Desk-Setup-0.1.0.exe
```

---

## For Developers - Test in Development

```bash
npm run electron:dev
```

This will:
1. Start Next.js dev server on port 8347
2. Wait for it to be ready
3. Compile Electron TypeScript
4. Launch Electron window

**To trigger first-run wizard:**
```powershell
Remove-Item -Recurse "$env:APPDATA\obsidian-news-desk-config"
npm run electron:dev
```

---

## For End Users - Install the App

### Step 1: Download
Get `Obsidian-News-Desk-Setup-X.X.X.exe` from GitHub Releases or your developer.

### Step 2: Run Installer
Double-click the `.exe` file and follow the installation wizard:
1. Choose installation directory (default: `C:\Program Files\Obsidian News Desk`)
2. Wait for installation to complete
3. Check "Launch Obsidian News Desk" (optional)

### Step 3: Complete Setup Wizard

**Page 1: Welcome**
- System requirements are checked automatically
- Click "Get Started"

**Page 2: Docker Desktop**
- Click "Check Docker"
- If Docker is missing → Click "Install Docker Desktop" (this may take 5-10 minutes)
- If Docker is stopped → Click "Start Docker Desktop"
- Once green, click "Next"

**Page 3: Storage Location**
- Default: `C:\Users\YourName\ObsidianNewsDesk`
- Or click "Browse..." to choose custom location
- Ensure you have at least 10GB free space
- Click "Next"

**Page 4: API Configuration**
- Select your AI provider (OpenAI, Claude, Google, or Groq)
- Enter your API key
- Click "Validate Key" to verify it works
- (Optional) Add Google Whisk token for image generation
- Click "Next"

**Page 5: Installation**
- Click "Start Installation"
- Wait 5-10 minutes while:
  - Docker images are downloaded
  - Containers are started
  - Services become ready
  - Workers are launched
- Progress log shows each step

**Page 6: Complete**
- Click "Launch Application"
- Main window opens at http://localhost:8347

### Step 4: Start Creating Videos
1. Click "New Broadcast" in the sidebar
2. Paste your news script
3. Select settings (title, AI provider, avatar mode)
4. Click "Create Broadcast"
5. Wait for processing (analysis → image generation → avatar upload → rendering)
6. Download your final video

---

## Troubleshooting

### Wizard doesn't appear
**Fix:** Delete config and restart
```powershell
Remove-Item -Recurse "$env:APPDATA\obsidian-news-desk-config"
```

### Docker fails to start
**Fix:** Restart Docker Desktop manually
```bash
"C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Services won't connect
**Check Docker containers:**
```bash
docker ps
# Should show: obsidian-postgres and obsidian-redis
```

**Restart containers:**
```bash
docker restart obsidian-postgres obsidian-redis
```

### Can't access localhost:8347
**Check if port is in use:**
```bash
netstat -ano | findstr :8347
```

**Restart the app** - Close all Electron windows and relaunch from desktop shortcut.

---

## Uninstall

1. Open "Apps & Features" (Windows Settings)
2. Search for "Obsidian News Desk"
3. Click "Uninstall"

**What gets removed:**
- Application files
- Desktop shortcut
- Start Menu entry

**What's preserved:**
- Your configuration (API keys, storage path)
- Generated videos and images
- Docker containers (you can remove with `docker-compose down -v`)

---

## Need Help?

- **User Guide:** See `USER_GUIDE.md`
- **Developer Docs:** See `ELECTRON_README.md`
- **Testing Guide:** See `ELECTRON_TESTING_GUIDE.md`
- **Full Details:** See `ELECTRON_IMPLEMENTATION_SUMMARY.md`

---

## Version Information

**Current Version:** 0.1.0
**Release Date:** March 22, 2026
**Status:** Production Ready ✅
