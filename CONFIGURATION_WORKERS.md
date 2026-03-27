# Configuration & Workers

## Phase 4: Configuration & Workers ✅ COMPLETE

Real configuration management, API key validation, environment generation, and worker spawning are now fully implemented.

### What Was Built

**Files Created:**
- `electron/src/config/storage.ts` - electron-store integration (160 lines)
- `electron/src/config/validator.ts` - API key validation for 4 providers (220 lines)
- `electron/src/config/env-generator.ts` - .env file generation (180 lines)
- `electron/src/workers/spawner.ts` - BullMQ worker process management (120 lines)

**Files Modified:**
- `electron/src/main.ts` - Added 12 IPC handlers for config and workers
- `electron/src/preload.ts` - Exposed config and worker APIs
- `electron/src/installer/wizard.js` - Updated to use real operations

### Features Implemented

#### Configuration Storage (`storage.ts`)
Uses `electron-store` for persistent configuration across sessions.

**Methods:**
- `isFirstRun()` - Check if wizard needs to be shown
- `setFirstRunComplete()` - Mark wizard as completed
- `getConfig()` - Get full configuration object
- `updateConfig()` - Update partial configuration
- `getStoragePath()` / `setStoragePath()` - Manage storage location
- `getAIConfig()` / `setAIConfig()` - Manage AI provider and keys
- `getWhiskToken()` / `setWhiskToken()` - Manage Whisk API token
- `saveWindowState()` / `getWindowState()` - Remember window position
- `resetConfig()` - Clear all settings (for uninstall)

**Stored Config:**
```typescript
{
  isFirstRun: boolean;
  appDirectory: string;
  storagePath: string;
  aiProvider: 'openai' | 'claude' | 'google' | 'groq';
  openaiKey?: string;
  claudeKey?: string;
  googleKey?: string;
  groqKey?: string;
  whiskToken?: string;
  windowState?: { width, height, x, y, isMaximized };
  installationDate?: string;
  lastLaunch?: string;
}
```

**Config Location:**
```
C:\Users\<username>\AppData\Roaming\obsidian-news-desk-config\config.json
```

#### API Key Validation (`validator.ts`)
Real HTTP requests to validate API keys for all 4 supported providers.

**OpenAI Validation:**
- Endpoint: `GET https://api.openai.com/v1/models`
- Header: `Authorization: Bearer sk-...`
- Returns: List of available models (gpt-4, gpt-3.5-turbo, etc.)

**Claude Validation:**
- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Body: Minimal test message (1 token)
- Returns: Success if key is valid

**Google Validation:**
- Endpoint: `GET https://generativelanguage.googleapis.com/v1/models?key=...`
- Returns: List of Gemini models

**Groq Validation:**
- Endpoint: `GET https://api.groq.com/openai/v1/models`
- Header: `Authorization: Bearer gsk_...`
- Returns: List of available models

**Result Format:**
```typescript
{
  valid: boolean;
  error?: string;
  provider?: string;
  modelAccess?: string[];  // List of models user has access to
}
```

#### Environment Generator (`env-generator.ts`)

**Generate .env File:**
Creates production-ready `.env` file from wizard inputs.

**Example Output:**
```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:8347

# Database
DATABASE_URL=postgresql://obsidian:obsidian_password@localhost:5432/obsidian_news

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=obsidian_redis_password

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Google Whisk
WHISK_API_TOKEN=ya29...
WHISK_IMAGE_MODEL=IMAGEN_3_5

# Avatar Mode
AVATAR_MODE=manual

# Remotion
REMOTION_TIMEOUT_MS=300000
REMOTION_CONCURRENCY=4
```

**Storage Directory Creation:**
Creates these directories in the user-selected location:
- `images/` - Whisk-generated scene backgrounds
- `avatars/` - HeyGen avatar MP4 files
- `videos/` - Final rendered broadcasts

**Disk Space Check:**
Uses WMIC on Windows to check available disk space:
```bash
wmic logicaldisk where "DeviceID='C:'" get FreeSpace,Size
```

**Path Validation:**
- Creates test directory
- Writes test file
- Verifies write permissions
- Cleans up test file

#### Worker Spawner (`spawner.ts`)

**Spawn BullMQ Workers:**
Launches `scripts/start-workers.ts` as a child process.

```typescript
spawnWorkers(appDir, envVars, onOutput)
```

**Environment Variables Passed:**
- `NODE_ENV=production`
- `DATABASE_URL` (Postgres connection)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `AI_PROVIDER` (openai/claude/google/groq)
- `OPENAI_API_KEY` (or provider-specific key)
- `WHISK_API_TOKEN` (if provided)

**Process Management:**
- Captures stdout/stderr
- Forwards output to progress callback
- Handles process exit/errors
- Graceful shutdown (SIGTERM → wait 5s → SIGKILL)

**Worker Lifecycle:**
```typescript
workerSpawner.spawnWorkers(appDir, envVars)  // Start
workerSpawner.killWorkers()                   // Stop
workerSpawner.restartWorkers(appDir, envVars) // Restart
workerSpawner.getWorkerStatus()               // Check if running
```

### Wizard Integration

**Page 3: Storage Path (Updated)**
- "Browse..." button opens native directory picker
- Real path validation (checks write permissions)
- Real disk space check (shows available GB)
- Warning if <10GB available
- Default: `C:\Users\<username>\ObsidianNewsDesk`

**Page 4: API Configuration (Updated)**
- Real API validation for all 4 providers
- Shows model access info (e.g., "gpt-4, gpt-3.5-turbo")
- HTTP requests take 1-3 seconds
- Displays detailed error messages
- Whisk token saved to config

**Page 5: Installation (Updated)**
- Creates real storage directories
- Generates real .env file
- Saves config to electron-store
- Pulls Docker images
- Starts Docker containers
- Waits for services
- Starts BullMQ workers
- All operations fully functional

### Testing

**Test Full Wizard Flow:**
```bash
cd obsidian-news-desk
npm run electron
```

**Expected Behavior:**

1. **Page 3:** Storage Path
   - Default path auto-filled
   - Click "Browse" → Opens native dialog
   - Path validation shows disk space
   - "Next" enabled if valid

2. **Page 4:** API Keys
   - Select AI provider (e.g., OpenAI)
   - Enter API key (real key required)
   - Click "Validate" → Makes HTTP request
   - Shows: "OpenAI API key is valid! (Access to: gpt-4, gpt-3.5-turbo)"
   - "Next" enabled if valid

3. **Page 5:** Installation
   - Creates directories at storage path
   - Generates .env file in app directory
   - Saves config to AppData
   - Pulls Docker images
   - Starts containers
   - Waits for Postgres + Redis
   - Starts workers
   - Progress: 100%

**Verify After Installation:**

**Check Storage Directories:**
```bash
dir C:\Users\<username>\ObsidianNewsDesk
```
Should show: `images\`, `avatars\`, `videos\`

**Check .env File:**
```bash
cd obsidian-news-desk
type .env
```
Should contain your AI provider and API key.

**Check Config:**
```bash
type "%APPDATA%\obsidian-news-desk-config\config.json"
```
Should show:
```json
{
  "isFirstRun": false,
  "storagePath": "C:\\Users\\...\\ObsidianNewsDesk",
  "aiProvider": "openai",
  "openaiKey": "sk-...",
  "installationDate": "2026-03-22T..."
}
```

**Check Workers:**
```bash
# Should see worker process in task manager
tasklist | findstr node
```

**Check Docker:**
```bash
docker ps --filter "name=obsidian-"
```
Should show both containers running.

### What's Real Now

| Feature | Phase 3 (Before) | Phase 4 (Now) |
|---------|------------------|---------------|
| Storage path selection | ❌ Manual input | ✅ Native dialog |
| Path validation | ❌ Format check | ✅ Write test |
| Disk space check | ❌ N/A | ✅ Real WMIC query |
| Directory creation | ❌ Logged only | ✅ Actually created |
| .env generation | ❌ In memory | ✅ Written to disk |
| API validation | ❌ Simulated | ✅ Real HTTP requests |
| Config persistence | ❌ N/A | ✅ electron-store |
| Worker spawning | ❌ N/A | ✅ Real child process |
| First run detection | ❌ Hardcoded | ✅ electron-store check |

### IPC Communication

**Configuration:**
```javascript
window.electronAPI.config.validateAPIKey(provider, key)   // Validate
window.electronAPI.config.selectDirectory()                // Browse dialog
window.electronAPI.config.validateStoragePath(path)        // Check writable
window.electronAPI.config.getDiskSpace(path)               // Get free space
window.electronAPI.config.createStorageDirectories(path)   // Create dirs
window.electronAPI.config.generateEnv(config)              // Generate .env
window.electronAPI.config.save(config)                     // Save to store
window.electronAPI.config.get()                            // Load config
```

**Workers:**
```javascript
window.electronAPI.workers.start()        // Spawn workers
window.electronAPI.workers.stop()         // Kill workers
window.electronAPI.workers.getStatus()    // Check if running
```

### Error Handling

**Common Errors:**

1. **Invalid API key** → Shows provider-specific error message
2. **Path not writable** → "Path is not writable" error
3. **Low disk space** → Warning if <10GB, error if <1GB
4. **Worker spawn failure** → Detailed error with command/exit code
5. **Docker not ready** → Waits up to 30s, then shows error

### Next Steps

**Phase 5: Main Application** (Week 5)
- Close wizard on completion
- Launch main application window
- Implement full startup sequence (Docker → workers → Next.js → window)
- Add system tray integration
- Graceful shutdown

---

**Status:** Ready for Phase 5 implementation
**Last Updated:** March 22, 2026
