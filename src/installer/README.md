# Installer Components

React components and hooks for the Obsidian News Desk setup wizard.

## Overview

This directory contains the UI components for the installer wizard, specifically the **Prerequisites Step** that checks for Docker Desktop installation.

## Components

### `DockerStatusCard`

Visual status indicator showing Docker Desktop installation state.

**States:**
- ✅ **Success** (Green) - Docker installed and running
- ⚠️ **Warning** (Yellow) - Docker installed but not running (with "Start Docker" button)
- ❌ **Error** (Red) - Docker not installed (with "Download Docker Desktop" button)
- 🔄 **Loading** (Gray) - Checking Docker status

**Usage:**
```tsx
import { DockerStatusCard } from './components/DockerStatusCard';

function MyComponent() {
  const [status, setStatus] = useState<'checking' | 'installed' | 'not-installed' | 'error'>('checking');

  return (
    <DockerStatusCard
      onStatusChange={setStatus}
    />
  );
}
```

---

### `DockerInstallGuide`

Step-by-step visual guide for installing Docker Desktop on Windows.

**Features:**
- 4-step wizard with progress indicator
- System requirements checklist
- Installation tips and warnings
- Screenshot placeholders
- External download link

**Usage:**
```tsx
import { DockerInstallGuide } from './components/DockerInstallGuide';

function MyComponent() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <button onClick={() => setShowGuide(true)}>
        Show Installation Guide
      </button>

      {showGuide && (
        <DockerInstallGuide onDismiss={() => setShowGuide(false)} />
      )}
    </>
  );
}
```

---

### `PrerequisitesStep`

Complete wizard step that combines Docker status checking and installation guide.

**Features:**
- Real-time Docker status checking
- Collapsible installation guide
- Navigation buttons (Back/Next)
- "Next" button disabled until Docker running

**Usage:**
```tsx
import { PrerequisitesStep } from './components/PrerequisitesStep';

function SetupWizard() {
  const [currentStep, setCurrentStep] = useState('prerequisites');

  return (
    <PrerequisitesStep
      onNext={() => setCurrentStep('configuration')}
      onBack={() => setCurrentStep('welcome')}
    />
  );
}
```

---

## Hooks

### `useDockerStatus`

React hook for monitoring Docker Desktop status via Electron IPC.

**Features:**
- Real-time status checking via IPC
- Optional polling for status changes
- Control functions: `checkStatus`, `startDocker`, `installDocker`

**Usage:**
```tsx
import { useDockerStatus } from './hooks/useDockerStatus';

function MyComponent() {
  const { status, isLoading, checkStatus, startDocker } = useDockerStatus(5000); // Poll every 5s

  if (isLoading) return <div>Checking Docker...</div>;
  if (!status?.running) {
    return <button onClick={startDocker}>Start Docker</button>;
  }

  return <div>Docker is running (v{status.version})</div>;
}
```

**Parameters:**
- `pollInterval` (number, default: 0) - Milliseconds between status checks (0 = no polling)

**Returns:**
```typescript
{
  status: DockerStatus | null;        // Current Docker status
  isLoading: boolean;                 // True during status check
  checkStatus: () => Promise<void>;   // Manually trigger status check
  startDocker: () => Promise<void>;   // Start Docker Desktop
  installDocker: () => Promise<void>; // Download + install Docker
}
```

**TypeScript Types:**
```typescript
interface DockerStatus {
  installed: boolean;       // Docker Desktop installed
  running: boolean;         // Docker daemon running
  version?: string;         // Docker version (e.g., "24.0.7")
  error?: string;           // Error message if check failed
  requiresRestart?: boolean; // System restart needed
}
```

---

## IPC Handlers

The components communicate with Electron main process via these IPC handlers (already registered in `electron/src/main.ts`):

### `docker:getStatus`

Returns current Docker Desktop status.

**Returns:**
```typescript
{
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
}
```

### `docker:start`

Starts Docker Desktop application.

**Behavior:**
- Launches `Docker Desktop.exe`
- Waits up to 60 seconds for daemon to be ready
- Throws error if startup fails

### `docker:install`

Downloads and silently installs Docker Desktop.

**Behavior:**
- Downloads installer from official Docker site (~500MB)
- Runs silent install with `--quiet --accept-license` flags
- Requires system restart after installation
- **Note:** Requires admin privileges

---

## File Structure

```
src/installer/
├── components/
│   ├── DockerStatusCard.tsx      # Visual status indicator
│   ├── DockerInstallGuide.tsx    # Step-by-step installation wizard
│   ├── PrerequisitesStep.tsx     # Complete prerequisites step
│   └── index.ts                   # Barrel export
├── hooks/
│   ├── useDockerStatus.ts        # Docker status React hook
│   └── index.ts                   # Barrel export
├── utils/
│   └── (future utility functions)
└── README.md                      # This file
```

---

## Design System

All components follow the Obsidian News Desk design system:

**Colors:**
- Background: `#1a1a1a` (surface)
- Cards: `#252525` (surface_container)
- Borders: `#404040` (gray-700)
- Text: `#FFFFFF` (primary), `#9ca3af` (gray-400)
- Success: `#10b981` (green-500)
- Warning: `#f59e0b` (yellow-500)
- Error: `#ef4444` (red-500)

**Border Radius:**
- Small elements (inputs, buttons): `8px`
- Cards and containers: `12px` (`rounded-xl`)
- Pills/badges: `9999px` (fully rounded)

**Shadows:**
- Standard cards: `shadow` (Tailwind)
- Elevated elements: `shadow-md`
- Focused states: `shadow-lg`

**Typography:**
- Font: Inter (sans-serif)
- Headings: `font-semibold` or `font-bold`
- Body text: `text-gray-300`
- Secondary text: `text-gray-400`

---

## Testing

### Manual Testing Scenarios

1. **Docker Installed + Running:**
   - Expected: Green checkmark, version displayed, "Next" enabled

2. **Docker Installed + Not Running:**
   - Expected: Yellow warning, "Start Docker" button visible
   - Action: Click "Start Docker" → Status changes to green after ~30s

3. **Docker Not Installed:**
   - Expected: Red error, "Download Docker Desktop" button visible
   - Action: Click button → Opens official Docker download page in browser

4. **Installation Guide:**
   - Expected: 4 steps with progress indicator
   - Action: Click "Next"/"Previous" → Step changes correctly
   - Action: Click "I've Installed Docker Desktop" → Guide closes, status refreshes

### Integration Testing

```tsx
// Example test (pseudocode)
describe('PrerequisitesStep', () => {
  it('blocks navigation when Docker not running', () => {
    render(<PrerequisitesStep onNext={mockOnNext} />);

    // Wait for status check
    await waitFor(() => expect(screen.getByText('Docker Desktop Not Running')).toBeInTheDocument());

    // Next button should be disabled
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();

    // Should not call onNext
    fireEvent.click(nextButton);
    expect(mockOnNext).not.toHaveBeenCalled();
  });
});
```

---

## Documentation

- **User Guide:** `docs/DOCKER_INSTALLATION.md` (comprehensive installation instructions)
- **Implementation Plan:** See `INSTALLER_ROADMAP.md` → Task 2.4
- **Backend Code:** `electron/src/docker/check.ts` (Docker detection logic)

---

## Future Enhancements

Potential additions to PrerequisitesStep:

1. **Node.js Version Check**
   - Verify Node.js 20+ is available
   - Show "Update Node.js" message if outdated

2. **Chrome Extension Check**
   - Detect if Auto Whisk extension installed
   - Link to extension installation guide

3. **FFmpeg Check**
   - Verify FFmpeg binaries are available
   - Show resolution status (bundled/system/npm)

4. **Disk Space Check**
   - Ensure sufficient disk space for storage path
   - Recommend at least 10GB free

5. **Port Conflict Check**
   - Verify ports 8347, 5432, 6379 are available
   - Show conflicting processes if ports occupied

---

## Support

For issues or questions:
- **GitHub Issues:** https://github.com/your-org/obsidian-news-desk/issues
- **Discussions:** https://github.com/your-org/obsidian-news-desk/discussions
- **Documentation:** `docs/` directory

---

**Last Updated:** March 27, 2026
