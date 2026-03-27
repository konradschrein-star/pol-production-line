# Installation Wizard Guide

## Phase 2: Wizard UI ✅ COMPLETE

The 6-page installation wizard is now fully functional with proper styling and navigation.

### Wizard Pages

**Page 1: Welcome**
- Displays branding and introduction
- Checks system requirements (disk space, memory, Node.js)
- Auto-validates requirements when "Get Started" is clicked

**Page 2: Docker Check**
- Detects if Docker Desktop is installed
- Checks if Docker daemon is running
- Provides buttons to install or start Docker if needed
- Simulated detection for testing (will be real IPC in Phase 3)

**Page 3: Storage Path**
- Allows user to select storage directory
- Default: `C:\Users\<username>\ObsidianNewsDesk\`
- Shows subdirectories that will be created (images, avatars, videos)
- Validates path format in real-time
- Browse button placeholder (will use Electron dialog in Phase 4)

**Page 4: API Configuration**
- AI Provider dropdown (OpenAI, Claude, Google, Groq)
- Dynamically shows/hides relevant API key fields
- "Validate Key" button simulates API call (will be real in Phase 4)
- Optional Whisk API token field with instructions
- Links to get API keys for each provider

**Page 5: Installation Progress**
- Real-time log output with color-coded messages
- Progress bar showing installation stages
- Simulated installation steps:
  1. Create directories (5%)
  2. Generate .env file (15%)
  3. Pull Docker images (60%)
  4. Initialize database (80%)
  5. Finalize (100%)
- Auto-scrolling log output
- Disables "Next" until installation completes

**Page 6: Complete**
- Success message with checkmark icon
- Quick start guide showing:
  - Web interface URL (http://localhost:8347)
  - Storage location path
  - Documentation link
- "Launch Application" button to close wizard and start app

### Design System Compliance

**Follows DESIGN.md guidelines:**
- Dark theme: `#1a1a1a` background, `#0f0f0f` for surfaces
- Rounded corners: 8px for inputs/buttons, 50% for status icons
- Typography: Inter for UI, Roboto Mono for code/logs
- Color palette:
  - Primary: `#4a90e2` (blue for buttons/links)
  - Success: `#28a745` (green for validation)
  - Error: `#dc3545` (red for errors)
  - Warning: `#ffc107` (yellow for warnings)
- Shadows: Subtle elevation for inputs and buttons
- Smooth transitions (0.2s) for interactive elements

### Features Implemented

**Navigation:**
- "Back" button (hidden on first page)
- "Next" button (changes to "Launch Application" on last page)
- Progress bar updates automatically
- Page state persists during navigation

**Form Validation:**
- Real-time path validation (format check)
- API key validation with simulated API calls
- Visual feedback (✓ success, ✗ error)
- Disable "Next" until validation passes

**Status Indicators:**
- System requirement checks (pending → checking → success/error)
- Docker status box with color-coded states
- Progress bar for installation
- Colored log messages (info, success, error)

**Responsive UI:**
- Fixed 800x600 wizard window
- Auto-scrolling log output
- Smooth animations for status changes
- Loading spinners for async operations

### File Structure

```
electron/src/installer/
├── pages/
│   └── wizard.html          # All 6 pages in one file
├── styles/
│   └── wizard.css           # Complete styling (dark theme)
└── wizard.js                # Navigation, validation, logic
```

### Testing the Wizard

**Launch Wizard:**
```bash
cd obsidian-news-desk
npm run electron:compile
npm run electron
```

**Test Flow:**
1. Page 1: Click "Get Started" → Requirements auto-check → Auto-advances
2. Page 2: Click "Check Docker" → See simulated detection
3. Page 3: Path auto-fills → Validates in real-time
4. Page 4: Select AI provider → Enter API key → Click "Validate"
5. Page 5: Click "Start Installation" → Watch progress
6. Page 6: See success message → Click "Launch Application"

### Current Limitations (To Be Fixed in Later Phases)

**Phase 2 (Current):**
- ✅ All UI pages complete
- ✅ Navigation working
- ✅ Form validation (simulated)
- ❌ No real Docker detection (simulated)
- ❌ No real API validation (simulated)
- ❌ No real file operations (simulated)
- ❌ Browse button doesn't open dialog

**Phase 3 (Docker Integration):**
- Will implement real Docker detection via IPC
- PowerShell script for Docker installation
- Health check polling for containers

**Phase 4 (Configuration):**
- Real API key validation (HTTP calls)
- Electron file dialog for path selection
- Generate actual .env file
- Create storage directories
- Save config to electron-store

**Phase 5 (Main Application):**
- Close wizard on completion
- Launch main application window
- Start Docker containers
- Spawn BullMQ workers

### Simulated vs Real Functionality

| Feature | Phase 2 (Current) | Final (Phase 4+) |
|---------|-------------------|------------------|
| Docker detection | Simulated (random) | Real (IPC call) |
| API validation | Simulated (80% success) | Real (HTTP API call) |
| Path selection | Manual input | Electron dialog |
| Directory creation | Logged only | Actually created |
| .env generation | Stored in memory | Written to disk |
| Docker image pull | Simulated progress | Real docker-compose pull |

### Next Steps

**Phase 3: Docker Integration** (Week 3)
- Create `electron/docker/check.ts` for Docker detection
- Create `electron/docker/lifecycle.ts` for docker-compose management
- Add IPC handlers in main.ts
- Update wizard.js to use IPC instead of simulation

---

**Status:** Ready for Phase 3 implementation
**Last Updated:** March 22, 2026
