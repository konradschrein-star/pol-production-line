# Obsidian News Desk - Quick Reference Card

## Essential Commands

### Development
```bash
npm run electron:dev              # Run in development mode
npm run electron:compile          # Compile TypeScript only
```

### Building
```bash
npm run electron:build:dir        # Build unpacked app (fast test)
npm run electron:build            # Build full installer
npm run electron:build:portable   # Build portable version
npm run electron:publish          # Build + publish to GitHub
```

### Testing
```bash
# Reset to first run
rmdir /s "%APPDATA%\obsidian-news-desk-config"

# View logs
explorer "%APPDATA%\obsidian-news-desk\logs"

# Test wizard
rmdir /s "%APPDATA%\obsidian-news-desk-config"
npm run electron:dev

# Reset tutorial
# Edit config.json: "tutorialComplete": false
```

---

## Important Paths

```
Config:     %APPDATA%\obsidian-news-desk-config\config.json
Logs:       %APPDATA%\obsidian-news-desk\logs\
Install:    C:\Program Files\Obsidian News Desk\
Storage:    C:\Users\[user]\ObsidianNewsDesk\
Build:      obsidian-news-desk\dist\
```

---

## Required Ports

```
8347  - Next.js server
5432  - PostgreSQL
6379  - Redis
```

Check conflicts: `netstat -ano | findstr "8347 5432 6379"`

---

## Startup Sequence

```
1. Port Check           (5s)
2. Docker Start        (20s)
3. Health Checks       (10s)
4. DB Initialize        (5s)
5. Workers Spawn        (2s)
6. Next.js Start       (10s)
────────────────────────────
Total: ~50 seconds
```

---

## System Tray

### Icon States
🟢 **Green** - All services running
🟡 **Yellow** - Services starting
🔴 **Red** - Service error

### Menu Actions
- **Open Dashboard** - Show main window
- **Restart Services** - Restart all services
- **View Logs** - Open logs folder
- **Show Tutorial** - Replay tutorial
- **Quit** - Stop services and exit

---

## Keyboard Shortcuts (In App)

```
J / K        Navigate broadcasts
Enter        Open broadcast
N            New broadcast
R            Regenerate scene
?            Show all shortcuts
Esc          Close modal / Go back
```

---

## Tutorial Pages

1. Workflow Overview
2. Keyboard Shortcuts (interactive demo)
3. Whisk Token Setup
4. HeyGen Avatar Guide
5. Ready to Start

Skip: ESC or "Skip Tutorial" button
Replay: Settings → Show Tutorial Again

---

## Troubleshooting

### App Won't Start
```bash
# Check logs
explorer "%APPDATA%\obsidian-news-desk\logs\electron.log"

# Check ports
netstat -ano | findstr "8347 5432 6379"

# Reset config
rmdir /s "%APPDATA%\obsidian-news-desk-config"
```

### Services Won't Start
```bash
# Check Docker
docker ps

# Restart Docker
docker-compose down
docker-compose up

# View service logs
explorer "%APPDATA%\obsidian-news-desk\logs"
```

### Build Fails
```bash
# Missing icons
# Add icon.ico to electron/build/

# TypeScript errors
npm run electron:compile

# Dependencies missing
npm install
```

---

## Build Checklist

- [ ] Icons created (`electron/build/icon.ico`)
- [ ] Version updated (`package.json`)
- [ ] TypeScript compiles (`npm run electron:compile`)
- [ ] Test in dev mode (`npm run electron:dev`)
- [ ] Build installer (`npm run electron:build`)
- [ ] Test installer on clean VM
- [ ] Create GitHub release
- [ ] Upload installer
- [ ] Test download link

---

## File Structure

```
obsidian-news-desk/
├── electron/
│   ├── src/
│   │   ├── main.ts (rewritten)
│   │   ├── logger.ts (NEW)
│   │   ├── tray.ts (NEW)
│   │   ├── updater.ts (NEW)
│   │   ├── services/
│   │   │   ├── manager.ts (NEW)
│   │   │   └── port-checker.ts (NEW)
│   │   ├── installer/
│   │   │   ├── pages/
│   │   │   │   ├── tutorial.html (NEW)
│   │   │   │   └── splash.html (NEW)
│   │   │   └── styles/
│   │   │       └── tutorial.css (NEW)
│   │   └── config/
│   │       └── storage.ts (enhanced)
│   └── build/
│       ├── icon.ico (REQUIRED)
│       ├── installerHeader.bmp (optional)
│       └── installerSidebar.bmp (optional)
├── dist/ (build output)
└── docs/
    ├── INSTALLER_ENHANCEMENT_SUMMARY.md
    ├── INSTALLER_QUICK_START.md
    └── ICON_REQUIREMENTS.md
```

---

## Documentation

**For Development:**
- `IMPLEMENTATION_COMPLETE.md` - Full implementation summary
- `docs/INSTALLER_QUICK_START.md` - Build and test guide
- `docs/INSTALLER_ENHANCEMENT_SUMMARY.md` - Complete details
- `electron/build/ICON_REQUIREMENTS.md` - Icon specifications

**For Users:**
- Built-in tutorial (appears on first run)
- In-app help (? key)
- System tray menu

---

## API Key Storage

**Encrypted (Recommended):**
```typescript
configStorage.setAPIKey('openai', 'sk-xxx')
configStorage.getAPIKey('openai')
```

**Providers:**
- `openai` - OpenAI GPT-4
- `claude` - Anthropic Claude
- `google` - Google Gemini
- `groq` - Groq
- `whisk` - Google Whisk

**Migration:**
```typescript
configStorage.migrateToEncrypted()  // Auto-runs on startup
```

---

## Version Numbers

Current: 1.0.0

Update in:
- `package.json` - `"version": "1.0.0"`
- Git tag: `git tag v1.0.0`

---

## GitHub Release

```bash
# 1. Tag version
git tag v1.0.0
git push origin v1.0.0

# 2. Build installer
npm run electron:build

# 3. Create release on GitHub
# Upload: dist/Obsidian News Desk-Setup-1.0.0.exe

# 4. Share URL
https://github.com/[owner]/[repo]/releases/tag/v1.0.0
```

---

## Support

**Logs Location:**
```
%APPDATA%\obsidian-news-desk\logs\
├── electron.log
├── docker.log
├── workers.log
└── nextjs.log
```

**Config Location:**
```
%APPDATA%\obsidian-news-desk-config\config.json
```

**View Logs:**
- System tray → "View Logs"
- Or: `explorer "%APPDATA%\obsidian-news-desk\logs"`

**Report Issue:**
- Collect logs
- Note error message
- Describe steps to reproduce
- Create GitHub issue

---

## Quick Test Flow

```bash
# 1. Compile
npm run electron:compile

# 2. Test dev mode
npm run electron:dev

# 3. Reset for wizard test
rmdir /s "%APPDATA%\obsidian-news-desk-config"
npm run electron:dev

# 4. Complete wizard

# 5. Complete tutorial

# 6. Build installer
npm run electron:build

# 7. Test installer
cd dist
"Obsidian News Desk-Setup-1.0.0.exe"
```

**Total Time:** ~30 minutes

---

Print this card and keep it handy! 📄
