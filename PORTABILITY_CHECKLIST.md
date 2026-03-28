# Portability Verification Checklist

**Before distributing USB installer or testing on fresh laptop**

Use this checklist to verify the system will work on a different machine without errors.

---

## Pre-Distribution Checks

### ✅ Code & Configuration

- [ ] **No hardcoded paths in `.env`**
  - `LOCAL_STORAGE_ROOT=` (blank, auto-detected)
  - `CHROME_PROFILE_PATH=` (blank, auto-detected)

- [ ] **No live API keys in repository**
  - `.env` excluded from git via `.gitignore`
  - Only `.env.example` committed (with placeholders)

- [ ] **All paths use path resolution system**
  - `getBaseStoragePath()` used instead of hardcoded paths
  - `resolveStoragePath()` for all file operations
  - No references to `C:\Users\konra\` in code

- [ ] **Database uses portable connection strings**
  - `localhost:5432` (Docker service name)
  - No machine-specific hostnames or IPs

- [ ] **Docker Compose uses standard ports**
  - PostgreSQL: 5432
  - Redis: 6379
  - Web UI: 8347 (configurable via npm script)

### ✅ Documentation

- [ ] **USB_INSTALLER_README.md exists**
  - Installation steps clear and complete
  - Troubleshooting section comprehensive
  - Whisk token refresh documented

- [ ] **CLAUDE.md updated**
  - References portability improvements
  - Documents auto-detection system

- [ ] **.env.example has helpful comments**
  - All required keys documented
  - Auto-detection explained
  - Link to setup wizard mentioned

### ✅ Setup Tools

- [ ] **First-run setup wizard exists**
  - `scripts/first-run-setup.ts` implemented
  - `npm run first-run` script added to package.json
  - API key validation working

- [ ] **Setup validation enhanced**
  - `scripts/setup.ts` checks Whisk token format
  - Clear error messages for missing keys
  - Guidance to run `npm run first-run`

- [ ] **START.bat includes validation**
  - Runs `npm run setup` before starting
  - Checks Docker services health
  - Clear error messages if prerequisites missing

### ✅ Files to Include

- [ ] **Source code** (obsidian-news-desk/ folder)
- [ ] **.env.example** (template with placeholders)
- [ ] **package.json** (all dependencies listed)
- [ ] **docker-compose.yml** (database configuration)
- [ ] **schema.sql** (database initialization)
- [ ] **START.bat** and **STOP.bat** (launcher scripts)
- [ ] **README.md** (main project documentation)
- [ ] **USB_INSTALLER_README.md** (setup guide)
- [ ] **PORTABILITY_CHECKLIST.md** (this file)
- [ ] **All documentation** in docs/ folder

### ✅ Files to Exclude

- [ ] **.env** (contains live API keys)
- [ ] **node_modules/** (too large, downloaded via npm install)
- [ ] **.next/** (build artifacts, regenerated)
- [ ] **tmp/** (temporary render files)
- [ ] **public/avatars/*.mp4** (large binary files)
- [ ] **.git/** (version control, not needed for distribution)
- [ ] **logs/** (machine-specific log files)
- [ ] **diagnostic-data/** (test artifacts)

---

## Fresh Laptop Test (Mandatory Before Release)

### Prerequisites Installed

- [ ] **Windows 11** (or Windows 10)
- [ ] **Node.js 20+** installed
  - Verify: `node --version`

- [ ] **Docker Desktop** installed and running
  - Verify: `docker ps` (should not error)

### Installation Test

1. [ ] **Copy folder from USB to C:\Projects\obsidian-news-desk\**
   - No errors during copy

2. [ ] **Run `npm install`**
   - All dependencies install successfully
   - No EACCES permission errors
   - No network/registry errors

3. [ ] **Run `npm run first-run`**
   - Wizard starts without errors
   - Prompts for API keys
   - Validates keys successfully
   - Creates `.env` file

4. [ ] **Run `START.bat`**
   - Setup validation passes
   - Docker containers start
   - Services become healthy (Postgres, Redis)
   - Database initialized
   - Workers window opens
   - Web UI window opens
   - Browser opens to http://localhost:8347

### Functional Test

5. [ ] **Create new broadcast job**
   - Paste sample news script
   - Submit successfully

6. [ ] **Script analysis completes**
   - Job moves to `analyzing` state
   - AI provider responds (check API key working)
   - Job moves to `generating_images` state

7. [ ] **Image generation completes**
   - Whisk token works (not expired)
   - Images saved to `C:\Users\<NewUser>\ObsidianNewsDesk\images\`
   - Job moves to `review_assets` state

8. [ ] **Asset review works**
   - Storyboard editor loads
   - Images display correctly
   - Can edit ticker headlines
   - Can regenerate individual scenes

9. [ ] **Avatar upload works**
   - Drag-drop uploads file
   - File saved to `C:\Users\<NewUser>\ObsidianNewsDesk\avatars\`
   - Avatar preview displays

10. [ ] **Video rendering completes**
    - Click "COMPILE & RENDER"
    - Job moves to `rendering` state
    - Render completes without errors
    - Video saved to `C:\Users\<NewUser>\ObsidianNewsDesk\videos\`
    - Job moves to `completed` state

11. [ ] **Download final video**
    - Click download button
    - Video plays in media player
    - All scenes present
    - Avatar visible
    - Ticker scrolling
    - No black screens

### Error Handling Test

12. [ ] **Test invalid Whisk token**
    - Edit `.env` with expired token
    - Restart workers
    - Image generation fails with clear error message
    - Error message explains token refresh process

13. [ ] **Test missing API key**
    - Edit `.env`, remove `OPENAI_API_KEY`
    - Run `npm run setup`
    - Setup fails with clear error message
    - Error suggests running `npm run first-run`

14. [ ] **Test Docker not running**
    - Stop Docker Desktop
    - Run `START.bat`
    - Script fails with clear error message
    - Error explains how to start Docker

### Cleanup Test

15. [ ] **Run `STOP.bat`**
    - Workers window closes
    - Web UI window closes
    - Docker containers stop
    - No orphaned processes (check Task Manager)

16. [ ] **Verify data persistence**
    - Run `START.bat` again
    - Previous jobs still present in database
    - Videos still in storage folder
    - No data loss

---

## Common Issues to Check

### Path Resolution

- [ ] **No `C:\Users\konra\` anywhere in codebase** (except comments/docs)
- [ ] **All storage operations use `resolveStoragePath()`**
- [ ] **Database paths are relative** (e.g., `images/uuid.jpg` not `C:\...`)

### Environment Variables

- [ ] **`.env` not committed to git** (check `.gitignore`)
- [ ] **`.env.example` has all required variables**
- [ ] **No placeholder values in production `.env`** (e.g., `your_key_here`)

### Dependencies

- [ ] **All npm packages in `package.json`**
- [ ] **No global npm packages required** (except `tsx` for scripts)
- [ ] **FFmpeg bundled via `ffmpeg-static`** (no manual install needed)

### Docker

- [ ] **`docker-compose.yml` uses service names** (not `localhost` in db connection)
- [ ] **Volumes use Docker-managed volumes** (not host paths)
- [ ] **Ports are standard and documented** (5432, 6379, 8347)

### Documentation

- [ ] **Whisk token refresh process documented**
- [ ] **Troubleshooting section covers common errors**
- [ ] **System requirements clearly stated**
- [ ] **Estimated setup time mentioned**

---

## Performance Benchmarks (Expected on Fresh Laptop)

Test with a 200-word news script (8 scenes):

| Step | Expected Duration | Notes |
|------|-------------------|-------|
| Script analysis | 30-60 seconds | Depends on AI provider latency |
| Image generation | 15-20 minutes | Whisk API, 8 scenes @ 2min each |
| Human QA review | 2-5 minutes | User reviews storyboard |
| Avatar generation | 3-5 minutes | Manual on HeyGen.com |
| Avatar optimization | 10-15 seconds | FFmpeg re-encode if needed |
| Video rendering | 2-3 minutes | For 60-second video |
| **Total** | **25-40 minutes** | First complete video end-to-end |

**If timings are significantly different:**
- Slower: Check internet speed, CPU performance
- Faster: Normal variation, depends on AI/API latency

---

## Sign-Off

**Tested by:** ___________________
**Date:** ___________________
**Test laptop specs:**
- OS: Windows ___ (version ___)
- CPU: ___________________
- RAM: ___ GB
- Node.js: v___
- Docker Desktop: v___

**Result:** ☐ PASS  ☐ FAIL

**Issues encountered:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

**Notes:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

## Automation Script (Optional)

For repeatable testing, create `scripts/test-portability.ts`:

```typescript
#!/usr/bin/env tsx
/**
 * Automated portability test suite
 *
 * Validates that the system can run on a fresh machine.
 */

import * as fs from 'fs';
import * as path from 'path';

async function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const content = fs.readFileSync(envPath, 'utf8');

  // Check for hardcoded paths
  const konraPath = content.match(/C:\\Users\\konra/);
  if (konraPath) {
    throw new Error('Found hardcoded path in .env: ' + konraPath[0]);
  }

  // Check for live API keys (shouldn't be in repo)
  const liveKeys = content.match(/sk-proj-[a-zA-Z0-9]{50,}/);
  if (liveKeys && process.env.CI) {
    throw new Error('Found live API key in committed .env file');
  }

  console.log('✅ .env file is portable');
}

// Add more automated checks...

checkEnvFile();
```

Run with: `npm run test:portability`

---

## Continuous Integration (Future)

For automated testing on every commit:

```yaml
# .github/workflows/portability.yml
name: Portability Test

on: [push, pull_request]

jobs:
  test-fresh-install:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run portability checks
        run: npm run test:portability

      - name: Verify no hardcoded paths
        run: |
          if (Select-String -Path .env -Pattern "C:\\Users\\konra") {
            throw "Found hardcoded path in .env"
          }
```

---

**END OF CHECKLIST**
