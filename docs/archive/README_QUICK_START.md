# ⚠️ DEPRECATED - See docs/QUICK_START.md

> **This quick start guide has been moved and enhanced.**
>
> **Please use:** **[docs/QUICK_START.md](docs/QUICK_START.md)**
>
> The new guide includes:
> - More detailed setup instructions
> - Troubleshooting section
> - Timeline expectations
> - Complete first video walkthrough
>
> **Last Updated:** March 22, 2026

---

# Obsidian News Desk - Quick Start Guide (ARCHIVED)

## 🚀 First-Time Setup

### Prerequisites
1. **Install Node.js 18+**
   - Download: https://nodejs.org/
   - Verify: Open cmd and run `node --version`

2. **Install Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Make sure it's running (check system tray icon)

3. **Install AutoWhisk Extension**
   - Open Chrome or Edge
   - Visit Chrome Web Store
   - Search for "AutoWhisk" or "Auto Whisk Nano Banana"
   - Install the extension
   - Log into Google Wisk (https://labs.google.com/wisk) in your browser

### Setup Steps

1. **Run First-Time Setup**
   ```
   Double-click: SETUP.bat
   ```
   This will:
   - Check Node.js and Docker installation
   - Install npm dependencies
   - Pull Docker images

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Edit `.env` and add your API keys:
     - `GOOGLE_AI_API_KEY` (for script analysis)
     - `AUTO_WHISK_EXTENSION_ID` (already set)

3. **Initialize Database**
   ```
   npm run init-db
   ```

---

## 🎬 Daily Use

### Start the System
```
Double-click: START.bat
```
This will:
- Start Docker (Postgres + Redis)
- Launch worker processes
- Start web interface
- Open browser to http://localhost:3000

### Stop the System
```
Double-click: STOP.bat
```

---

## 📁 File Structure

```
obsidian-news-desk/
├── SETUP.bat          ← First-time setup
├── START.bat          ← Daily launcher
├── STOP.bat           ← Shutdown
├── .env               ← Your API keys (create from .env.example)
├── docker-compose.yml ← Database config
├── package.json       ← Dependencies
└── src/               ← Application code
```

---

## ⚡ Quick Commands (Alternative to .bat files)

If you prefer manual control:

```bash
# Start infrastructure
docker-compose up -d

# Initialize database (first time only)
npm run init-db

# Start workers (Terminal 1)
npm run workers

# Start web UI (Terminal 2)
npm run dev
```

---

## 🔧 Troubleshooting

### "Docker not found"
- Make sure Docker Desktop is installed and running
- Check system tray for Docker whale icon

### "Port already in use"
- Stop any existing instances: Run `STOP.bat`
- Or manually: `docker-compose down`

### "Workers not starting"
- Check `.env` file exists and has valid API keys
- Make sure Redis is running: `docker ps`

### "AutoWhisk extension not found"
- Ensure AutoWhisk is installed in Chrome or Edge
- Check the extension ID in `.env` matches installed version
- Default ID: `gedfnhdibkfgacmkbjgpfjihacalnlpn`

### "Google login required"
- Open Chrome/Edge manually
- Go to https://labs.google.com/wisk
- Log in with your Google account
- Cookies will be saved in `./playwright-data/`

---

## 📞 Support

- GitHub Issues: [Your repo URL]
- Documentation: See `CLAUDE.md` for architecture details
- Hotkeys: See `HOTKEYS.md` for keyboard shortcuts
