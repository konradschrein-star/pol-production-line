# Changelog

All notable changes to the Obsidian News Desk project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- System tray integration for background service monitoring
- Auto-update support via GitHub Releases
- Centralized logging system with rotation
- Port conflict detection before startup
- API key validation before job creation
- Comprehensive error messages for all failure modes

---

## [1.1.0] - 2026-03-26 (Desktop Application Release)

**Major Release:** Complete transformation from development environment to distributable desktop application.

### Added - Phase 2 Installer

**Single-File Installer:**
- Self-contained `.exe` installer (~150-200 MB)
- NSIS-based installer with custom wizard pages
- Bundled dependencies (Node.js runtime, FFmpeg binaries, Chrome extension)
- Desktop shortcut and Start Menu entry creation
- Optional auto-start with Windows login

**Setup Wizard (6 pages):**
- Page 1: Welcome screen with system requirements check
- Page 2: Docker Desktop detection and installation guide
- Page 3: Storage location picker with disk space validation
- Page 4: API configuration UI (OpenAI, Claude, Google, Groq)
- Page 5: Database configuration (auto-filled defaults)
- Page 6: Installation progress with detailed logging

**Interactive Tutorial (5 pages):**
- Page 1: Video production workflow overview
- Page 2: Essential keyboard shortcuts reference
- Page 3: Automated Whisk token setup (Chrome extension guide)
- Page 4: HeyGen avatar generation workflow
- Page 5: Ready-to-start checklist

**Background Services:**
- System tray icon with status monitoring (green/red indicator)
- Hidden background processes (no terminal windows)
- Docker container lifecycle management
- BullMQ worker processes (analyze, images, render)
- Next.js development server
- Graceful shutdown on exit

**System Tray Menu:**
- Open Dashboard (launches browser)
- Start/Stop All Services
- View Logs (opens log directory)
- Settings (configuration UI)
- Exit (graceful shutdown)

**Bundled Dependencies:**
- FFmpeg binaries (ffmpeg.exe, ffprobe.exe)
- Portable Node.js 20 runtime
- Chrome extension package (Auto Whisk)
- Application code and assets

**Documentation:**
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Detailed step-by-step guide
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Consolidated troubleshooting
- [QUICKSTART.md](QUICKSTART.md) - 5-minute getting started guide
- [CHANGELOG.md](CHANGELOG.md) - This file

### Changed

**BREAKING CHANGES:**
- **Replaced manual npm/terminal workflow** - No longer requires manual `npm install`, `.env` editing, or `START.bat`/`STOP.bat`
- **Replaced manual .env editing** - Environment variables managed by Settings UI
- **Moved from 3 terminal windows to single background service** - All processes hidden, managed by system tray
- **Updated all user-facing documentation** - README_FOR_FRIEND.md, QUICKSTART.md, README.md now focus on installer workflow

**Documentation Updates:**
- README_FOR_FRIEND.md: Rewritten for installer-based setup (emoji-friendly, non-technical)
- README.md: Added "Installation" section (line 75) with end-user vs developer paths
- INSTALLATION_GUIDE.md: NEW - 300+ line detailed guide with screenshot placeholders
- docs/TROUBLESHOOTING.md: NEW - Consolidated from 5+ scattered docs
- QUICKSTART.md: Updated for installer workflow
- INSTALLER_ROADMAP.md: Marked Phase 2 documentation tasks complete

### Removed

**Deprecated Workflows:**
- ❌ START.bat/STOP.bat batch files (replaced by desktop app launch)
- ❌ Manual npm install requirement (bundled runtime)
- ❌ Manual .env file editing (replaced by wizard UI)
- ❌ Manual FFmpeg installation (bundled binaries)
- ❌ Manual Chrome extension setup (included in tutorial)

### Fixed

**Installation Issues:**
- Port conflicts now detected before Docker startup
- Clear error messages when Docker not installed
- Storage path validation before file operations
- API key format validation in setup wizard
- WSL 2 setup guide for Docker Desktop

**User Experience:**
- No more confusing terminal windows
- Clear visual feedback for all operations
- Consistent dark UI throughout installer and tutorial
- Professional error handling with actionable messages

---

## [1.0.0] - 2026-03-24 (Production Release)

**First Production Release:** Complete video production pipeline with comprehensive UI and documentation.

### Added - Original Application

**Core Video Production Pipeline:**
- AI script analysis with multi-LLM support (OpenAI GPT-4, Claude, Google Gemini, Groq)
- Automated image generation via Whisk API (Google Imagen 3.5)
- Manual HeyGen avatar integration with optimization workflow
- Remotion-based video rendering (1920x1080, 30fps, H.264)
- BullMQ job queue system with 4 workers (analyze, images, avatar, render)

**Database Architecture:**
- PostgreSQL 17 with 3 core tables (news_jobs, news_scenes, style_presets)
- Redis 7 for BullMQ queue backend
- Docker Compose for container orchestration
- Automatic database initialization via `npm run init-db`

**Complete Web UI (35+ React Components):**
- Dashboard with real-time job status updates
- New Broadcast form with AI provider selection
- Storyboard editor with scene management
- Analytics page with production metrics
- Settings panel with API configuration
- Keyboard shortcuts on all pages (press `?` for help)

**Human-in-the-Loop Review:**
- Mandatory `review_assets` state pause before rendering
- Scene image regeneration (hotkey: `R`)
- Ticker headline editing (hotkey: `E`)
- Custom image upload (hotkey: `U`)
- Avatar upload with validation

**Advanced Features:**
- Reference images (style, subject, scene) for visual consistency
- Style presets for reusable configurations
- Content policy auto-sanitization (reduces Whisk violations)
- Adaptive rate limiting (2-8 concurrent workers based on 429 errors)
- Queue pause detection and resume
- Bulk actions (delete, cancel, retry multiple jobs)

**Performance Optimizations:**
- Asset preparation before render (validates and copies images to public folder)
- Avatar optimization script (`optimize-avatar.sh` reduces files to <10MB)
- Remotion bundle caching (40-60% faster re-renders)
- Parallel image generation (8 scenes simultaneously)
- Smart pacing algorithm (frame-perfect timing for hook vs body sections)

**Rendering Features:**
- Ken Burns effect on background images (subtle zoom/pan)
- HeyGen avatar overlay in bottom-right corner (640x360)
- Scrolling CSS `<marquee>` ticker at bottom
- Synchronized subtitles (future enhancement)
- Final output: 1920x1080, 30fps, H.264+AAC 48kHz

### Technical Stack

**Backend:**
- TypeScript, Next.js 14 App Router
- Node.js 20+
- PostgreSQL 17 (Docker)
- Redis 7 (Docker)
- BullMQ 5.0

**Video Production:**
- Remotion 4.0 (React-based video framework)
- FFmpeg (via ffmpeg-static npm package)
- HeyGen API (avatar generation)
- Whisk API (Google Imagen 3.5)

**Frontend:**
- React 18
- TailwindCSS with custom dark design system
- Inter + Roboto Mono fonts
- Keyboard-first navigation

**AI Providers:**
- OpenAI GPT-4 (default, highest quality)
- Anthropic Claude (premium alternative)
- Google Gemini (free tier, 60 req/min)
- Groq (fastest processing)

### Fixed - Critical Bugs

**Black Screen Fix (March 23, 2026):**
- PROBLEM: Videos rendered successfully but showed only first 6 seconds, then black screens
- ROOT CAUSE: Images never copied from storage (`C:\Users\...\ObsidianNewsDesk\images\`) to Remotion's expected location (`public/images/`)
- SOLUTION: Created `asset-preparation.ts` module that validates and copies all assets before rendering
- RESULT: Zero black frames, pre-render validation, clear error messages

**Key Changes:**
- NEW: `src/lib/remotion/asset-preparation.ts` - Comprehensive asset validation
- Enhanced Scene component with error handling and fallback UI
- Render worker now validates assets BEFORE starting 20+ minute render
- Detailed logging for easy debugging

### Performance - Production Benchmarks

**Typical Workflow (60-second video):**
- Script analysis: 30-60 seconds (OpenAI GPT-4)
- Image generation: 15-20 minutes (8 scenes, Whisk API with rate limiting)
- Human review: 2-5 minutes (manual QA)
- Avatar optimization: 10-15 seconds (if needed, automatic for >10MB files)
- Video rendering: 2-3 minutes (Remotion + FFmpeg)
- **Total:** 25-40 minutes end-to-end

**Output Specifications:**
- Resolution: 1920×1080 (Full HD)
- Framerate: 30fps
- Codec: H.264 + AAC 48kHz
- File size: 50-150MB (varies by length)

### Documentation - Complete User Guides

**User-Facing:**
- PRODUCTION_USER_GUIDE.md - Complete workflow guide (DEPRECATED, moved to docs/)
- README_FOR_FRIEND.md - Friendly non-technical guide
- docs/QUICK_START.md - 10-minute getting started
- docs/USER_GUIDE.md - Comprehensive daily operations
- docs/REFERENCE.md - Advanced features and API
- HOTKEYS.md - Keyboard shortcuts reference

**Setup & Configuration:**
- .env.md - Environment variables reference
- docs/WHISK_TOKEN_SETUP.md - Whisk authentication guide
- CHROME_EXTENSION_SETUP.md - Auto Whisk installation
- HEYGEN_AUTOMATION_SETUP.md - Optional avatar automation

**Technical:**
- CLAUDE.md - Architecture and design patterns
- CHECKPOINT.md - Version history and rollback
- docs/BLACK_SCREEN_FIX.md - Rendering troubleshooting
- IMPLEMENTATION_STATUS.md - Build progress tracker

### Known Limitations (v1.0)

- Manual HeyGen workflow (no automation due to anti-bot measures)
- Whisk token expires hourly (Chrome extension auto-refreshes)
- Local storage only (no cloud sync)
- Windows-only (macOS/Linux support planned for v2.0)
- No automated E2E testing suite (planned for v1.1)

---

## [0.9.0] - 2026-03-22 (Beta Testing)

### Added

- End-to-end testing framework
- Performance metrics tracking (job_metrics, generation_history tables)
- Content policy violation detection
- Adaptive rate limiting (dynamic worker concurrency)
- Reference images support (style, subject, scene)

### Fixed

- Port configuration (Redis 6379, Postgres 5432)
- Module separation (types.ts browser vs video-utils.ts server)
- Composition registration (React.createElement() in index.ts)
- Avatar optimization (re-encode to 640x360, <3MB)
- Remotion timeout (increased to 120s for large asset loading)
- Avatar path (now dynamic in NewsVideo.tsx, not hardcoded)

### Testing

**Test Job ID:** 475da744-51f1-43f8-8f9b-5d3c72274bf8
**Status:** ✅ SUCCESSFUL
- Output: 1920x1080, 60 seconds, 21 MB
- Components: 8 scenes + avatar overlay + scrolling ticker
- Total processing time: ~25-40 minutes

---

## [0.5.0] - 2026-03-20 (Alpha Release)

### Added

- Initial Next.js application scaffold
- PostgreSQL database schema (news_jobs, news_scenes)
- Basic BullMQ queue implementation
- Whisk API integration (direct API calls, not browser automation)
- Manual HeyGen workflow
- Basic Remotion rendering

### In Progress

- UI components (basic dashboard)
- Error handling
- Documentation

---

## Upgrade Notes

### From v1.0.0 (Manual) to v1.1.0 (Installer)

**Migration Steps:**

1. **Backup your data:**
   ```bash
   # Export existing jobs and scenes
   docker exec obsidian_postgres pg_dump -U obsidian obsidian_news > backup.sql

   # Copy storage files
   cp -r "C:\Users\konra\ObsidianNewsDesk\" "C:\ObsidianNewsDesk_backup\"
   ```

2. **Uninstall old version:**
   - Stop all services: `STOP.bat`
   - Delete Docker containers: `docker-compose down -v`
   - Keep `ObsidianNewsDesk\` storage folder

3. **Install v1.1.0:**
   - Download and run `ObsidianNewsDesk-Setup-v1.1.0.exe`
   - During setup wizard, point storage location to existing `C:\Users\konra\ObsidianNewsDesk\`
   - Re-enter API keys in setup wizard

4. **Restore database (optional):**
   ```bash
   # If you want to restore old jobs
   docker exec -i obsidian_postgres psql -U obsidian obsidian_news < backup.sql
   ```

**What Carries Over:**
- ✅ All videos, images, and avatars in storage folder
- ✅ Database data (jobs, scenes) if you restore backup
- ✅ API keys (re-enter in wizard, takes 1 minute)

**What Changes:**
- ❌ No more START.bat/STOP.bat (use desktop app instead)
- ❌ No more manual .env editing (use Settings UI)
- ✅ Easier to use, more reliable, professional experience

---

## Links

- **Repository:** https://github.com/konradschrein-star/pol-production-line
- **Releases:** https://github.com/konradschrein-star/pol-production-line/releases
- **Issues:** https://github.com/konradschrein-star/pol-production-line/issues
- **Documentation:** See `docs/` folder and root-level guides

---

## Contributors

- Konrad Schrein ([@konradschrein-star](https://github.com/konradschrein-star)) - Creator and maintainer

---

**For detailed installation instructions, see [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)**

**For troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**
