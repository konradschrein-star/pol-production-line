# Node.js Runtime Bundling

**Status:** ✅ PRODUCTION-READY (Phase 2, Task 2.2 complete)

This document describes the portable Node.js runtime bundling system for the Obsidian News Desk desktop installer.

## Overview

The application bundles a portable Node.js v20.11.0 runtime to ensure:

- **Zero user dependencies:** No Node.js installation required on target systems
- **Version consistency:** All installations use the same Node.js version
- **Reliability:** Eliminates "Node.js not found" errors
- **Portability:** Truly self-contained desktop application

## Architecture

### Resolution Strategy

The system resolves Node.js with the following priority:

1. **Bundled Node.js** (primary): `resources/node/node.exe`
2. **System Node.js** (fallback): PATH lookup via `where node`
3. **Error**: Clear diagnostic if neither found

This bundled-first approach ensures version consistency and eliminates environment issues.

### Integration Points

**1. Node Resolver (`src/lib/runtime/node-resolver.ts`)**
- Core utility for locating Node.js executable
- Synchronous API (spawn commands need immediate paths)
- Caches resolved path in memory (no repeated file system checks)
- Supports both development and production environments

**2. Service Manager (`electron/src/services/manager.ts`)**
- Resolves Node.js once during initialization
- Uses bundled Node to spawn Next.js server directly (no `npm run` wrapper)
- Passes `nodePath` to worker spawner

**3. Worker Spawner (`electron/src/workers/spawner.ts`)**
- Accepts `nodePath` parameter
- Spawns BullMQ workers using `node tsx` (no `npx` wrapper)
- Direct execution for better performance

**4. Electron Builder (`electron-builder.yml`)**
- Bundles `resources/node/` directory into installer
- Copied to app installation directory as `resources/node/`

## File Locations

### Development Environment

```
obsidian-news-desk/
├── resources/
│   └── node/                  # Manual download (see setup instructions)
│       ├── node.exe
│       ├── npm.cmd
│       ├── npx.cmd
│       └── node_modules/
└── src/lib/runtime/
    └── node-resolver.ts       # Resolution logic
```

### Production Environment (Installed App)

```
C:\Program Files\Obsidian News Desk\
├── resources/
│   └── node/                  # Bundled by electron-builder
│       ├── node.exe
│       ├── npm.cmd
│       ├── npx.cmd
│       └── node_modules/
└── ...
```

### Production Environment (Portable)

```
ObsidianNewsDesk-Portable\
├── resources/
│   └── node/                  # Bundled in portable package
│       ├── node.exe
│       ├── npm.cmd
│       ├── npx.cmd
│       └── node_modules/
└── ...
```

## Setup Instructions (Development)

### Step 1: Download Node.js Portable

1. Download: [node-v20.11.0-win-x64.zip](https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip)
2. Extract ZIP file
3. Copy contents to `obsidian-news-desk/resources/node/`

**Expected directory structure:**

```
obsidian-news-desk/
└── resources/
    └── node/
        ├── node.exe           # Node.js runtime
        ├── npm                # NPM script (Unix)
        ├── npm.cmd            # NPM wrapper (Windows)
        ├── npx                # NPX script (Unix)
        ├── npx.cmd            # NPX wrapper (Windows)
        ├── node_modules/      # Core Node modules
        └── ...
```

### Step 2: Verify Setup

Run the test script to verify Node.js is correctly resolved:

```bash
npm run test:node-resolver
```

**Expected output:**

```
=== Node.js Runtime Resolver Tests ===

[Test 1] Resolving Node.js path...
✓ Resolved: C:\...\resources\node\node.exe

[Test 2] Validating Node.js executable...
✓ Valid: Node.js executable can run --version

[Test 3] Getting Node.js version...
✓ Version: v20.11.0

[Test 4] Getting full runtime info...
✓ Runtime info retrieved:
  Path: C:\...\resources\node\node.exe
  Version: v20.11.0
  Source: bundled
  NPM: C:\...\resources\node\npm.cmd
  NPX: C:\...\resources\node\npx.cmd
✓ Using bundled Node.js (optimal)

...

✅ All tests passed!
```

### Step 3: Test Worker Spawning

Verify that workers can be spawned using bundled Node.js:

```bash
npm run test:portable-node
```

**Expected output:**

```
=== Portable Node.js Integration Test ===

[Step 1] Resolving Node.js runtime...
✓ Resolved: C:\...\resources\node\node.exe
  Version: v20.11.0
  Source: bundled

[Step 2] Preparing worker script paths...
  ...

[Step 3] Spawning worker process...
✓ Worker process spawned
  PID: 12345

[Step 4] Capturing output...
  [stdout] Node.js version: v20.11.0
  [stdout] Environment variable TEST_VAR: integration_test

[Step 5] Worker process completed
  Exit code: 0
✓ Worker exited successfully

[Step 6] Verifying output...
✓ Node.js version detected in output
✓ Environment variable passed correctly

✅ All integration tests passed!
```

## Testing Procedures

### Unit Tests

Test Node.js resolution logic:

```bash
npm run test:node-resolver
```

**Tests:**
- Resolves bundled Node.js when present
- Falls back to system Node.js when bundled missing
- Throws error when neither found
- Validates executable functionality
- Returns correct version string
- Identifies source (bundled vs system)

### Integration Tests

Test worker spawning with bundled Node:

```bash
npm run test:portable-node
```

**Tests:**
- Spawns worker using bundled Node.js
- Worker can import TypeScript modules via tsx
- Environment variables passed correctly
- stdout/stderr captured properly

### Manual Testing

**Scenario 1: With bundled Node.js (production mode)**

1. Extract Node.js to `resources/node/`
2. Run `npm run electron:dev`
3. Check logs: Should show "Using bundled Node.js"
4. Verify all services start successfully

**Scenario 2: Without bundled Node.js (fallback mode)**

1. Rename `resources/node/` → `resources/node.bak/`
2. Run `npm run electron:dev`
3. Check logs: Should show warning about using system Node.js
4. Verify app still works (development fallback)

**Scenario 3: Production build**

1. Extract Node.js to `resources/node/`
2. Build installer: `npm run electron:build`
3. Install on clean Windows VM (no Node.js installed)
4. Verify app works without system Node.js

## Troubleshooting

### Issue: "Node.js runtime not found"

**Symptom:** App fails to start with error message

**Cause:** Bundled Node.js missing AND system Node.js not in PATH

**Solution:**
1. Download Node.js v20.11.0 portable (see setup instructions)
2. Extract to `resources/node/` directory
3. Verify with `npm run test:node-resolver`

### Issue: "Using system Node.js" warning

**Symptom:** App starts but shows warning in logs

**Cause:** Bundled Node.js not found, falling back to system Node.js

**Solution:**
- For development: This is acceptable (fallback mode works)
- For production builds: Download and bundle Node.js (see setup instructions)

### Issue: Worker spawning fails

**Symptom:** Workers fail to start with "tsx not found" error

**Cause:** Node modules not installed or tsx missing

**Solution:**
```bash
npm install
npm run test:portable-node
```

### Issue: Version mismatch

**Symptom:** App works but uses different Node.js version than expected

**Cause:** System Node.js being used instead of bundled

**Solution:**
1. Verify bundled Node.js exists: `dir resources\node\node.exe`
2. Check node-resolver output: `npm run test:node-resolver`
3. Clear cache and retry: Restart app

## Performance Considerations

### Startup Time

- **Node resolution:** <10ms (file system check, cached after first call)
- **No measurable difference** in service startup
- **Direct execution** is slightly faster than `npm run` (no shell overhead)

### Disk Space

- **Bundled Node.js:** ~70 MB uncompressed
- **Installer size increase:** ~30 MB (NSIS compression)
- **Total installer size:** ~200 MB (acceptable for desktop app)

### Memory

- **No additional overhead:** Same Node.js process architecture as before
- **Single runtime instance:** Shared by Next.js server and workers

## Version Updates

### Updating Node.js Version

To update the bundled Node.js version:

1. Download new version: `https://nodejs.org/dist/vX.Y.Z/node-vX.Y.Z-win-x64.zip`
2. Extract to `resources/node/`
3. Test: `npm run test:node-resolver`
4. Update documentation to reference new version
5. Rebuild installer: `npm run electron:build`

### Version Pinning

**Why v20.11.0?**

- LTS (Long Term Support) release
- Stable and production-tested
- Compatible with all dependencies
- Good balance of features and stability

**When to update:**

- Security patches for v20.x line
- New LTS release (v22.x, v24.x, etc.) with testing
- Breaking changes in dependencies requiring newer Node.js

## Launcher Scripts

### Electron App (Primary)

**Usage:** Double-click desktop shortcut

- Uses bundled Node.js automatically
- No manual configuration needed
- Managed service lifecycle

### Portable Launcher (`launcher.bat`)

**Usage:** `launcher.bat` (command-line)

- Standalone launcher without Electron
- Checks for bundled Node.js first
- Falls back to system Node.js with warning
- Starts Docker, workers, and Next.js manually

**Target users:**
- Advanced users who prefer command-line control
- Developers testing portable mode
- CI/CD environments

### Development Launcher (`START.bat`)

**Usage:** `START.bat` (development only)

- Uses system Node.js (no bundling)
- Faster iteration during development
- Three terminal windows (Docker, workers, Next.js)

**Target users:**
- Developers working on the codebase
- Contributors testing changes

## Integration with Installer

### Build Process

```bash
npm run electron:build
```

**Steps:**
1. Next.js production build
2. TypeScript compilation (Electron code)
3. electron-builder packages app
4. Bundles `resources/node/` → installer
5. Creates NSIS installer (~200 MB)

### Installer Behavior

When user installs the app:

1. NSIS extracts files to installation directory
2. Bundled Node.js copied to `resources/node/`
3. Desktop shortcut created
4. First launch: Node resolver validates bundled runtime
5. Services start using bundled Node.js

### Uninstaller Behavior

When user uninstalls:

1. All application files removed (including `resources/node/`)
2. User data preserved (Docker volumes, local storage)
3. No system-wide changes (PATH, registry, etc.)

## API Reference

### `resolveNodePath(): string`

Resolves Node.js executable path with bundled-first priority.

**Returns:** Absolute path to `node.exe`

**Throws:** Error if Node.js runtime cannot be found

**Example:**
```typescript
import { resolveNodePath } from './src/lib/runtime/node-resolver';

const nodePath = resolveNodePath();
// Returns: "C:\\...\\resources\\node\\node.exe"
```

### `getNodeRuntimeInfo(): NodeRuntimeInfo`

Gets full runtime information including version and source.

**Returns:**
```typescript
{
  path: string;        // Absolute path to node.exe
  version: string;     // e.g., "v20.11.0"
  source: 'bundled' | 'system';
  npm: string;         // Path to npm
  npx: string;         // Path to npx
}
```

**Example:**
```typescript
import { getNodeRuntimeInfo } from './src/lib/runtime/node-resolver';

const info = getNodeRuntimeInfo();
console.log(`Using ${info.source} Node.js ${info.version}`);
```

### `validateNodeRuntime(nodePath: string): boolean`

Validates that a Node.js executable is functional.

**Parameters:**
- `nodePath`: Path to `node.exe`

**Returns:** `true` if executable exists and can run `--version`

**Example:**
```typescript
import { validateNodeRuntime } from './src/lib/runtime/node-resolver';

if (validateNodeRuntime('C:\\path\\to\\node.exe')) {
  console.log('Valid Node.js runtime');
}
```

### `getNodeVersion(nodePath: string): string | null`

Gets Node.js version string.

**Parameters:**
- `nodePath`: Path to `node.exe`

**Returns:** Version string (e.g., `"v20.11.0"`) or `null` if failed

**Example:**
```typescript
import { getNodeVersion } from './src/lib/runtime/node-resolver';

const version = getNodeVersion('C:\\path\\to\\node.exe');
// Returns: "v20.11.0"
```

### `clearCache(): void`

Clears cached Node.js path (for testing purposes).

**Example:**
```typescript
import { clearCache } from './src/lib/runtime/node-resolver';

clearCache(); // Force re-resolution on next call
```

## Related Documentation

- [INSTALLER_ROADMAP.md](../INSTALLER_ROADMAP.md) - Overall installer project plan
- [CHROME_EXTENSION_SETUP.md](../CHROME_EXTENSION_SETUP.md) - Chrome extension packaging
- [electron-builder.yml](../electron-builder.yml) - Build configuration
- [CLAUDE.md](../CLAUDE.md) - Project architecture and development guide

## Changelog

### 2026-03-27 (Phase 2, Task 2.2 Complete)

- ✅ Created node-resolver utility
- ✅ Integrated with ServiceManager
- ✅ Updated worker spawner
- ✅ Added electron-builder configuration
- ✅ Created portable launcher script
- ✅ Implemented test scripts
- ✅ Added documentation

**Status:** Production-ready. Node.js bundling fully operational.

## Next Steps

After Node.js bundling is complete:

1. **Task 2.1:** Bundle FFmpeg binaries (similar pattern)
2. **Task 2.3:** Package Chrome extension
3. **Task 2.4:** Docker Desktop handling strategy
4. **Phase 3:** Setup wizard UI
5. **Phase 4:** Background service architecture
6. **Phase 5:** Desktop application shell
7. **Phase 6:** Installer packaging (NSIS)
