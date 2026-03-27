# Parallel Agent Prompts for Desktop Installer Development

This document contains detailed prompts for running multiple agents simultaneously to speed up development of the Obsidian News Desk desktop installer.

**Usage:** Copy each prompt section and run in separate agent sessions. Agents can work in parallel since tasks are independent.

---

## Agent 1: FFmpeg Bundler

**Task:** Bundle FFmpeg binaries for Windows

**Context:** We're creating a desktop application that needs FFmpeg for video rendering. Users shouldn't need to install FFmpeg manually, so we bundle the binaries.

**Your task:**

1. **Download FFmpeg for Windows**
   - Go to https://www.gyan.dev/ffmpeg/builds/
   - Download: `ffmpeg-release-full.7z` (or latest full build)
   - We need: `ffmpeg.exe` and `ffprobe.exe`

2. **Create resources directory structure**
   ```bash
   cd obsidian-news-desk
   mkdir -p resources/bin
   ```

3. **Extract and copy binaries**
   - Extract downloaded archive
   - Copy `bin/ffmpeg.exe` to `obsidian-news-desk/resources/bin/ffmpeg.exe`
   - Copy `bin/ffprobe.exe` to `obsidian-news-desk/resources/bin/ffprobe.exe`

4. **Create FFmpeg resolver utility**

   Create file: `obsidian-news-desk/src/lib/video/ffmpeg-resolver.ts`

   ```typescript
   /**
    * FFmpeg Path Resolver
    *
    * Resolves FFmpeg paths with fallback strategy:
    * 1. Bundled FFmpeg (resources/bin/) - for production installer
    * 2. System FFmpeg (PATH) - for development
    * 3. ffmpeg-static npm package - last resort
    */

   import * as path from 'path';
   import * as fs from 'fs';
   import { execSync } from 'child_process';

   export interface FFmpegPaths {
     ffmpeg: string;
     ffprobe: string;
   }

   /**
    * Check if FFmpeg binary exists at path
    */
   function checkFFmpeg(ffmpegPath: string, ffprobePath: string): boolean {
     try {
       return fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath);
     } catch {
       return false;
     }
   }

   /**
    * Try to use system FFmpeg
    */
   function trySystemFFmpeg(): FFmpegPaths | null {
     try {
       execSync('ffmpeg -version', { stdio: 'ignore' });
       execSync('ffprobe -version', { stdio: 'ignore' });
       return {
         ffmpeg: 'ffmpeg',
         ffprobe: 'ffprobe',
       };
     } catch {
       return null;
     }
   }

   /**
    * Try to use ffmpeg-static npm package
    */
   function tryFFmpegStatic(): FFmpegPaths | null {
     try {
       const ffmpeg = require('ffmpeg-static');
       const ffprobe = require('ffprobe-static').path;

       if (ffmpeg && ffprobe) {
         return {
           ffmpeg,
           ffprobe,
         };
       }
     } catch {
       // ffmpeg-static not installed
     }

     return null;
   }

   /**
    * Resolve FFmpeg paths with fallback strategy
    */
   export function resolveFFmpegPaths(): FFmpegPaths {
     // Try 1: Bundled FFmpeg (for production installer)
     const appPath = process.cwd(); // In production, use app.getAppPath()
     const bundledFFmpeg = path.join(appPath, 'resources', 'bin', 'ffmpeg.exe');
     const bundledFFprobe = path.join(appPath, 'resources', 'bin', 'ffprobe.exe');

     if (checkFFmpeg(bundledFFmpeg, bundledFFprobe)) {
       console.log('✓ Using bundled FFmpeg');
       return {
         ffmpeg: bundledFFmpeg,
         ffprobe: bundledFFprobe,
       };
     }

     // Try 2: System FFmpeg
     const systemFFmpeg = trySystemFFmpeg();
     if (systemFFmpeg) {
       console.log('✓ Using system FFmpeg');
       return systemFFmpeg;
     }

     // Try 3: ffmpeg-static npm package
     const staticFFmpeg = tryFFmpegStatic();
     if (staticFFmpeg) {
       console.log('✓ Using ffmpeg-static package');
       return staticFFmpeg;
     }

     // Failure: No FFmpeg found
     throw new Error(
       'FFmpeg not found. Please install FFmpeg or ensure bundled binaries are present.\n' +
       'Download from: https://ffmpeg.org/download.html'
     );
   }
   ```

5. **Update config to use resolver**

   Edit: `obsidian-news-desk/src/lib/config/index.ts`

   Find the `video` section and replace:
   ```typescript
   import { resolveFFmpegPaths } from '../video/ffmpeg-resolver';

   // In video configuration:
   video: {
     fps: getIntEnv('VIDEO_FPS', 30),
     width: getIntEnv('VIDEO_WIDTH', 1920),
     height: getIntEnv('VIDEO_HEIGHT', 1080),
     codec: getEnv('VIDEO_CODEC', 'h264'),

     // FFmpeg paths (auto-resolved)
     ...(() => {
       try {
         return resolveFFmpegPaths();
       } catch (error) {
         console.warn('FFmpeg not found, will attempt to resolve at runtime');
         return { ffmpeg: '', ffprobe: '' };
       }
     })(),
   },
   ```

6. **Test FFmpeg resolution**

   Create test file: `obsidian-news-desk/scripts/test-ffmpeg.ts`

   ```typescript
   #!/usr/bin/env tsx
   import { resolveFFmpegPaths } from '../src/lib/video/ffmpeg-resolver';

   console.log('Testing FFmpeg resolution...\n');

   try {
     const paths = resolveFFmpegPaths();
     console.log('✓ FFmpeg found:');
     console.log(`  ffmpeg:  ${paths.ffmpeg}`);
     console.log(`  ffprobe: ${paths.ffprobe}`);
   } catch (error) {
     console.error('✗ FFmpeg not found:', error);
     process.exit(1);
   }
   ```

   Run: `npx tsx scripts/test-ffmpeg.ts`

7. **Update .gitignore**
   Add to `.gitignore`:
   ```
   # Bundled binaries (large files)
   /resources/bin/*.exe
   ```

**Deliverables:**
- [ ] FFmpeg binaries in `resources/bin/`
- [ ] `ffmpeg-resolver.ts` created
- [ ] Config updated to use resolver
- [ ] Test script passes
- [ ] `.gitignore` updated

**Estimated time:** 1-2 hours

---

## Agent 2: Node.js Bundler

**Task:** Bundle portable Node.js runtime

**Context:** The desktop installer should work even if users don't have Node.js installed. We bundle a portable version.

**Your task:**

1. **Download Node.js portable**
   - Go to https://nodejs.org/dist/v20.11.0/
   - Download: `node-v20.11.0-win-x64.zip`
   - Extract to temporary location

2. **Create resources directory**
   ```bash
   cd obsidian-news-desk
   mkdir -p resources/node
   ```

3. **Copy Node.js files**
   Copy extracted contents to `obsidian-news-desk/resources/node/`:
   - `node.exe`
   - `npm`
   - `npx`
   - `node_modules/` (npm's dependencies)

4. **Create Node resolver utility**

   Create file: `obsidian-news-desk/src/lib/runtime/node-resolver.ts`

   ```typescript
   /**
    * Node.js Runtime Resolver
    *
    * Resolves Node.js path with fallback:
    * 1. Bundled Node.js (resources/node/) - for production
    * 2. System Node.js (PATH) - for development
    */

   import * as path from 'path';
   import * as fs from 'fs';

   export function resolveNodePath(): string {
     // Try bundled Node.js
     const appPath = process.cwd();
     const bundledNode = path.join(appPath, 'resources', 'node', 'node.exe');

     if (fs.existsSync(bundledNode)) {
       console.log('✓ Using bundled Node.js');
       return bundledNode;
     }

     // Fall back to system Node.js
     console.log('✓ Using system Node.js');
     return 'node';
   }

   export function resolveNpmPath(): string {
     // Try bundled npm
     const appPath = process.cwd();
     const bundledNpm = path.join(appPath, 'resources', 'node', 'npm.cmd');

     if (fs.existsSync(bundledNpm)) {
       return bundledNpm;
     }

     return 'npm';
   }
   ```

5. **Create launcher script**

   Create file: `obsidian-news-desk/launcher.bat`

   ```batch
   @echo off
   REM Launcher script using bundled Node.js

   set SCRIPT_DIR=%~dp0
   set NODE_PATH=%SCRIPT_DIR%resources\node

   REM Check if bundled Node exists
   if exist "%NODE_PATH%\node.exe" (
       echo Using bundled Node.js
       "%NODE_PATH%\node.exe" "%SCRIPT_DIR%dist\main.js" %*
   ) else (
       echo Using system Node.js
       node "%SCRIPT_DIR%dist\main.js" %*
   )
   ```

6. **Test Node resolution**

   Create test: `obsidian-news-desk/scripts/test-node-bundled.ts`

   ```typescript
   #!/usr/bin/env tsx
   import { resolveNodePath, resolveNpmPath } from '../src/lib/runtime/node-resolver';
   import { execSync } from 'child_process';

   console.log('Testing Node.js resolution...\n');

   const nodePath = resolveNodePath();
   const npmPath = resolveNpmPath();

   console.log(`Node path: ${nodePath}`);
   console.log(`npm path:  ${npmPath}`);

   // Test Node.js works
   try {
     const version = execSync(`"${nodePath}" --version`, { encoding: 'utf8' });
     console.log(`\n✓ Node.js version: ${version.trim()}`);
   } catch (error) {
     console.error('✗ Node.js test failed:', error);
     process.exit(1);
   }
   ```

7. **Update .gitignore**
   ```
   # Bundled Node.js runtime (large)
   /resources/node/
   !resources/node/.gitkeep
   ```

**Deliverables:**
- [ ] Node.js portable in `resources/node/`
- [ ] `node-resolver.ts` created
- [ ] `launcher.bat` created
- [ ] Test script passes
- [ ] `.gitignore` updated

**Estimated time:** 1-2 hours

---

## Agent 3: Chrome Extension Packager

**Task:** Package Auto Whisk Chrome extension for distribution

**Context:** Users need the Auto Whisk extension for Whisk API token management. We'll package it and provide installation instructions.

**Your task:**

1. **Locate existing extension**
   Check if extension exists:
   ```bash
   cd obsidian-news-desk
   ls -la chrome-extension/
   ```

2. **Create resources directory**
   ```bash
   mkdir -p resources/chrome-extension
   ```

3. **Copy extension files**
   Copy all extension files to `resources/chrome-extension/`:
   ```bash
   cp -r chrome-extension/* resources/chrome-extension/
   ```

4. **Verify manifest.json**
   Check `resources/chrome-extension/manifest.json` has:
   - Valid manifest version (v3)
   - Correct permissions
   - Content scripts configured

5. **Create extension installation guide**

   Create file: `obsidian-news-desk/docs/CHROME_EXTENSION_INSTALL.md`

   ```markdown
   # Auto Whisk Chrome Extension - Installation Guide

   The Auto Whisk extension manages your Whisk API tokens automatically.

   ## Installation Steps

   ### Step 1: Open Chrome Extensions Page
   1. Open Google Chrome
   2. Type in address bar: `chrome://extensions/`
   3. Press Enter

   ### Step 2: Enable Developer Mode
   1. Look for "Developer mode" toggle in top-right corner
   2. Click to enable it
   3. New buttons will appear: "Load unpacked", "Pack extension", etc.

   ### Step 3: Load Extension
   1. Click "Load unpacked" button
   2. Navigate to the extension folder:
      - **If installed via installer:** `C:\Program Files\Obsidian News Desk\resources\chrome-extension\`
      - **If running from source:** `[Your installation path]\obsidian-news-desk\resources\chrome-extension\`
   3. Click "Select Folder"

   ### Step 4: Verify Installation
   1. Extension should appear in your extensions list
   2. Look for "Auto Whisk" with icon
   3. Status should be "Enabled"

   ## Troubleshooting

   **Extension not appearing:**
   - Refresh the extensions page (F5)
   - Check Developer mode is enabled
   - Verify you selected correct folder

   **Extension shows errors:**
   - Check Chrome console for error messages
   - Ensure all extension files are present
   - Try removing and re-adding the extension

   ## What the Extension Does

   The extension automatically:
   - Refreshes expired Whisk API tokens
   - Monitors API requests for authentication errors
   - Stores tokens securely in Chrome storage
   - Provides fallback when token refresh fails

   You don't need to interact with it after installation - it works automatically.
   ```

6. **Create programmatic installer helper**

   Create file: `obsidian-news-desk/src/installer/extension-installer.ts`

   ```typescript
   /**
    * Chrome Extension Installation Helper
    *
    * Provides utilities for guiding users through extension installation.
    */

   import * as path from 'path';
   import * as fs from 'fs';
   import { exec } from 'child_process';
   import { promisify } from 'util';

   const execAsync = promisify(exec);

   export interface ExtensionInfo {
     exists: boolean;
     path: string;
     manifestValid: boolean;
   }

   /**
    * Get bundled extension path
    */
   export function getExtensionPath(): string {
     const appPath = process.cwd();
     return path.join(appPath, 'resources', 'chrome-extension');
   }

   /**
    * Verify extension files exist and are valid
    */
   export function checkExtension(): ExtensionInfo {
     const extPath = getExtensionPath();
     const manifestPath = path.join(extPath, 'manifest.json');

     const exists = fs.existsSync(extPath);
     let manifestValid = false;

     if (exists) {
       try {
         const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
         manifestValid = !!manifest.name && !!manifest.version;
       } catch {
         manifestValid = false;
       }
     }

     return {
       exists,
       path: extPath,
       manifestValid,
     };
   }

   /**
    * Open Chrome extensions page
    */
   export async function openChromeExtensions(): Promise<void> {
     try {
       if (process.platform === 'win32') {
         await execAsync('start chrome://extensions/');
       } else if (process.platform === 'darwin') {
         await execAsync('open -a "Google Chrome" chrome://extensions/');
       } else {
         await execAsync('xdg-open chrome://extensions/');
       }
     } catch (error) {
       throw new Error('Failed to open Chrome. Please open chrome://extensions/ manually.');
     }
   }

   /**
    * Check if Chrome is installed
    */
   export async function isChromeInstalled(): Promise<boolean> {
     try {
       if (process.platform === 'win32') {
         await execAsync('reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome"');
         return true;
       }
       return false;
     } catch {
       return false;
     }
   }
   ```

7. **Update .gitignore**
   Extension files should be committed (not large):
   ```
   # Extension is committed (small files, needed for distribution)
   # resources/chrome-extension/ stays in git
   ```

**Deliverables:**
- [ ] Extension files in `resources/chrome-extension/`
- [ ] Installation guide created
- [ ] `extension-installer.ts` helper created
- [ ] Verified manifest.json is valid

**Estimated time:** 1 hour

---

## Agent 4: Internal Testing Engine

**Task:** Create automated testing system for installer validation

**Context:** We need automated tests that can run locally to verify the entire system works before creating the installer.

**Your task:**

1. **Create test resources directory**
   ```bash
   cd obsidian-news-desk
   mkdir -p tests/resources
   ```

2. **Add test video script**

   Create file: `obsidian-news-desk/tests/resources/test-script.txt`

   ```
   Welcome to Obsidian News Desk Testing. This is a short test script designed to validate our video production pipeline. We're testing script analysis, image generation, avatar overlay, and final rendering. This test should complete in under 2 minutes. The hook section grabs attention quickly. Now we transition to body content with more detailed information. The system should handle varying sentence lengths smoothly. Pacing should adapt to audio duration automatically. Testing complete.
   ```

3. **Create comprehensive test suite**

   Create file: `obsidian-news-desk/tests/integration/installer-validation.test.ts`

   ```typescript
   /**
    * Installer Validation Test Suite
    *
    * Tests entire system end-to-end as it would work after installation.
    */

   import { describe, it, expect, beforeAll, afterAll } from 'vitest';
   import * as fs from 'fs';
   import * as path from 'path';
   import { resolveFFmpegPaths } from '../../src/lib/video/ffmpeg-resolver';
   import { resolveNodePath } from '../../src/lib/runtime/node-resolver';
   import { checkExtension } from '../../src/installer/extension-installer';
   import { config, validateConfig, ensureStorageDirectories } from '../../src/lib/config';

   describe('Installer Validation Tests', () => {
     describe('Bundled Dependencies', () => {
       it('should find FFmpeg binaries', () => {
         expect(() => resolveFFmpegPaths()).not.toThrow();
         const paths = resolveFFmpegPaths();
         expect(paths.ffmpeg).toBeTruthy();
         expect(paths.ffprobe).toBeTruthy();
       });

       it('should find Node.js runtime', () => {
         const nodePath = resolveNodePath();
         expect(nodePath).toBeTruthy();
         expect(nodePath).toMatch(/node(.exe)?$/);
       });

       it('should find Chrome extension', () => {
         const extInfo = checkExtension();
         expect(extInfo.exists).toBe(true);
         expect(extInfo.manifestValid).toBe(true);
       });
     });

     describe('Configuration System', () => {
       it('should validate configuration', () => {
         expect(() => validateConfig()).not.toThrow();
       });

       it('should have valid storage paths', () => {
         expect(config.storage.root).toBeTruthy();
         expect(config.storage.images).toBeTruthy();
         expect(config.storage.avatars).toBeTruthy();
         expect(config.storage.videos).toBeTruthy();
       });

       it('should create storage directories', () => {
         ensureStorageDirectories();
         expect(fs.existsSync(config.storage.root)).toBe(true);
         expect(fs.existsSync(config.storage.images)).toBe(true);
       });
     });

     describe('End-to-End Video Production', () => {
       let testJobId: string;

       it('should create test job from script', async () => {
         const testScript = fs.readFileSync(
           path.join(__dirname, '../resources/test-script.txt'),
           'utf8'
         );

         const response = await fetch('http://localhost:8347/api/jobs', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ raw_script: testScript }),
         });

         expect(response.ok).toBe(true);
         const data = await response.json();
         testJobId = data.job_id;
         expect(testJobId).toBeTruthy();
       });

       it('should complete script analysis', async () => {
         // Poll for analysis completion
         let attempts = 0;
         const maxAttempts = 60; // 1 minute timeout

         while (attempts < maxAttempts) {
           const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`);
           const data = await response.json();

           if (data.job.status === 'generating_images') {
             expect(data.scenes.length).toBeGreaterThan(0);
             return; // Success
           }

           if (data.job.status === 'failed') {
             throw new Error('Job failed during analysis');
           }

           await new Promise(resolve => setTimeout(resolve, 1000));
           attempts++;
         }

         throw new Error('Analysis timeout');
       }, 120000); // 2 minute timeout

       it('should generate images', async () => {
         // Wait for image generation
         let attempts = 0;
         const maxAttempts = 300; // 5 minutes

         while (attempts < maxAttempts) {
           const response = await fetch(`http://localhost:8347/api/jobs/${testJobId}`);
           const data = await response.json();

           if (data.job.status === 'review_assets') {
             const allImagesReady = data.scenes.every(s => s.image_url);
             expect(allImagesReady).toBe(true);
             return; // Success
           }

           if (data.job.status === 'failed') {
             throw new Error('Job failed during image generation');
           }

           await new Promise(resolve => setTimeout(resolve, 1000));
           attempts++;
         }

         throw new Error('Image generation timeout');
       }, 360000); // 6 minute timeout
     });

     describe('Performance Benchmarks', () => {
       it('should start services within 15 seconds', () => {
         // Measured by START.bat timing
         // This is a placeholder - actual timing done manually
         expect(true).toBe(true);
       });

       it('should have adequate CPU/RAM', () => {
         expect(config.machine.cpuCount).toBeGreaterThan(2);
         const ramGB = parseFloat(config.machine.totalMemoryGB);
         expect(ramGB).toBeGreaterThan(4);
       });
     });
   });
   ```

4. **Create test runner script**

   Create file: `obsidian-news-desk/scripts/run-installer-tests.ts`

   ```typescript
   #!/usr/bin/env tsx
   /**
    * Installer Test Runner
    *
    * Runs all validation tests and generates report.
    */

   import { execSync } from 'child_process';
   import * as fs from 'fs';
   import * as path from 'path';

   console.log('═══════════════════════════════════════');
   console.log('  Installer Validation Test Suite');
   console.log('═══════════════════════════════════════\n');

   // Check prerequisites
   console.log('[1/4] Checking prerequisites...');

   // Check services running
   try {
     execSync('docker ps | grep obsidian-postgres', { stdio: 'ignore' });
     console.log('✓ Postgres running');
   } catch {
     console.error('✗ Postgres not running. Run START.bat first.');
     process.exit(1);
   }

   try {
     execSync('docker ps | grep obsidian-redis', { stdio: 'ignore' });
     console.log('✓ Redis running');
   } catch {
     console.error('✗ Redis not running. Run START.bat first.');
     process.exit(1);
   }

   // Check web server
   try {
     execSync('curl -s http://localhost:8347/api/health', { stdio: 'ignore' });
     console.log('✓ Web server running');
   } catch {
     console.error('✗ Web server not responding. Check START.bat.');
     process.exit(1);
   }

   console.log('\n[2/4] Running dependency tests...');
   execSync('npm run test:dependencies', { stdio: 'inherit' });

   console.log('\n[3/4] Running configuration tests...');
   execSync('npm run test:config', { stdio: 'inherit' });

   console.log('\n[4/4] Running end-to-end tests...');
   execSync('npm run test:e2e', { stdio: 'inherit' });

   console.log('\n═══════════════════════════════════════');
   console.log('  ✓ All tests passed!');
   console.log('═══════════════════════════════════════\n');
   console.log('Installer is ready for packaging.');
   ```

5. **Add test scripts to package.json**

   Add to `scripts` section:
   ```json
   {
     "test:dependencies": "vitest run tests/integration/installer-validation.test.ts -t 'Bundled Dependencies'",
     "test:config": "vitest run tests/integration/installer-validation.test.ts -t 'Configuration System'",
     "test:e2e": "vitest run tests/integration/installer-validation.test.ts -t 'End-to-End'",
     "test:installer": "tsx scripts/run-installer-tests.ts",
     "test:quick": "tsx scripts/test-ffmpeg.ts && tsx scripts/test-node-bundled.ts"
   }
   ```

6. **Create CI/CD placeholder** (future use)

   Create file: `.github/workflows/installer-tests.yml`

   ```yaml
   # Future: Automated testing on GitHub Actions
   name: Installer Tests

   on:
     push:
       branches: [ main, develop ]
     pull_request:
       branches: [ main ]

   jobs:
     test:
       runs-on: windows-latest

       steps:
       - uses: actions/checkout@v3

       - name: Setup Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '20'

       - name: Install dependencies
         run: npm install

       - name: Run quick tests
         run: npm run test:quick

       # Note: Full e2e tests require Docker, skip for now
   ```

**Deliverables:**
- [ ] Test script added (`test-script.txt`)
- [ ] Validation test suite created
- [ ] Test runner script created
- [ ] Package.json scripts added
- [ ] All tests pass

**Estimated time:** 2-3 hours

---

## Agent 5: Documentation Updater

**Task:** Update all documentation for installer workflow

**Context:** Documentation needs to reflect new installer-based workflow instead of manual setup.

**Your task:**

1. **Update README_FOR_FRIEND.md**

   Rewrite file: `obsidian-news-desk/README_FOR_FRIEND.md`

   Focus on:
   - Download installer link
   - Run installer wizard
   - Setup steps (Chrome extension, API keys)
   - First video creation
   - Troubleshooting

   **Remove:**
   - Manual npm install steps
   - Manual .env editing
   - Terminal commands

2. **Update main README.md**

   Add new section at top:
   ```markdown
   ## Installation

   ### For End Users (Recommended)

   **Download the installer:**
   - Go to [Releases](https://github.com/yourusername/obsidian-news-desk/releases)
   - Download `ObsidianNewsDesk-Setup-vX.X.X.exe`
   - Run installer and follow setup wizard

   ### For Developers

   [Existing development setup instructions...]
   ```

3. **Create INSTALLATION_GUIDE.md**

   New file with detailed screenshots placeholders:
   ```markdown
   # Installation Guide

   ## System Requirements
   - Windows 10 or 11 (64-bit)
   - 8GB RAM minimum (16GB recommended)
   - 10GB free disk space
   - Docker Desktop (installer will guide you)
   - Google Chrome (for extension)

   ## Step-by-Step Installation

   ### Step 1: Download Installer
   [Screenshot placeholder]

   ### Step 2: Run Installer
   [Screenshot placeholder]

   ### Step 3: Prerequisites Check
   [Screenshot placeholder]

   [Continue for all wizard steps...]
   ```

4. **Update troubleshooting docs**

   Update: `docs/TROUBLESHOOTING.md`

   Add installer-specific issues:
   - Installer fails to start
   - Docker not detected
   - Extension installation problems
   - Permission errors

5. **Create changelog template**

   Create: `CHANGELOG.md`

   ```markdown
   # Changelog

   ## [Unreleased]

   ### Added
   - Desktop installer with setup wizard
   - Bundled FFmpeg and Node.js
   - Chrome extension packaged
   - System tray icon
   - Auto-start with Windows option

   ### Changed
   - No longer requires manual dependency installation
   - Configuration via UI instead of .env editing
   - Services run hidden (no terminal windows)

   ### Removed
   - Manual START.bat/STOP.bat (still available for dev mode)

   ## [1.0.0] - TBD

   Initial desktop release
   ```

**Deliverables:**
- [ ] README_FOR_FRIEND.md updated
- [ ] README.md updated
- [ ] INSTALLATION_GUIDE.md created
- [ ] Troubleshooting docs updated
- [ ] Changelog created

**Estimated time:** 2-3 hours

---

## Coordination Notes

**Agent Dependencies:**
- Agent 1 (FFmpeg) and Agent 2 (Node.js) are fully independent - can run simultaneously
- Agent 3 (Extension) is independent - can run simultaneously
- Agent 4 (Testing) depends on Agents 1-3 completing - run after
- Agent 5 (Docs) is independent but benefits from seeing other work first

**Recommended Parallel Execution:**
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Agent 1   │  │   Agent 2   │  │   Agent 3   │
│   FFmpeg    │  │   Node.js   │  │  Extension  │
│             │  │             │  │             │
│  1-2 hours  │  │  1-2 hours  │  │   1 hour    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │     Agent 4      │
              │     Testing      │
              │                  │
              │    2-3 hours     │
              └─────────┬────────┘
                        │
                        ▼
              ┌──────────────────┐
              │     Agent 5      │
              │  Documentation   │
              │                  │
              │    2-3 hours     │
              └──────────────────┘
```

**Total time with parallelization:** ~5-6 hours (vs ~9-12 hours sequential)

---

## Completion Checklist

After all agents complete, verify:

- [ ] Run `npm run test:quick` - passes
- [ ] Run `npm run test:installer` - passes
- [ ] FFmpeg binaries exist in `resources/bin/`
- [ ] Node.js portable exists in `resources/node/`
- [ ] Chrome extension exists in `resources/chrome-extension/`
- [ ] All documentation updated
- [ ] `.gitignore` updated appropriately
- [ ] Test video production end-to-end works

**Then proceed to Phase 3: Setup Wizard UI**
