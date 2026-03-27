# Docker Integration

## Phase 3: Docker Integration ✅ COMPLETE

Real Docker detection, lifecycle management, and health checks are now fully implemented.

### What Was Built

**Files Created:**
- `electron/src/docker/check.ts` - Docker Desktop detection and startup (260 lines)
- `electron/src/docker/lifecycle.ts` - docker-compose lifecycle management (310 lines)
- `electron/src/docker/install.ps1` - PowerShell installer script (120 lines)

**Files Modified:**
- `electron/src/main.ts` - Added IPC handlers for Docker operations
- `electron/src/preload.ts` - Exposed Docker IPC methods to renderer
- `electron/src/installer/wizard.js` - Updated to use real IPC calls

### Features Implemented

#### Docker Detection (`check.ts`)
- `isDockerInstalled()` - Checks if Docker Desktop is installed
- `isDockerRunning()` - Checks if Docker daemon is running
- `getDockerVersion()` - Gets installed Docker version
- `getDockerStatus()` - Comprehensive status check
- `startDockerDesktop()` - Launches Docker Desktop and waits for ready
- `stopDockerDesktop()` - Graceful shutdown
- `installDockerDesktop()` - Downloads and installs Docker with progress
- `requiresRestart()` - Detects if Windows restart needed

#### Docker Lifecycle (`lifecycle.ts`)
- `startDockerCompose()` - Starts Postgres + Redis containers
- `stopDockerCompose()` - Stops containers (preserves volumes)
- `pullDockerImages()` - Pre-pulls postgres:16-alpine and redis:7-alpine
- `waitForPostgres()` - Polls `pg_isready` until database ready
- `waitForRedis()` - Polls `redis-cli ping` until cache ready
- `waitForAllServices()` - Waits for both services with progress
- `getContainerStatus()` - Lists running containers
- `initializeDatabase()` - Verifies database schema loaded
- `getContainerLogs()` - Retrieves container logs
- `restartContainer()` - Restarts specific container
- `removeAllContainers()` - Clean uninstall (with optional volume removal)

#### PowerShell Installer (`install.ps1`)
- Downloads Docker Desktop installer from official URL
- Runs silent installation with `--quiet --accept-license` flags
- Uses BITS transfer for reliable download with resume capability
- Fallback to WebClient if BITS unavailable
- Verifies installation and provides restart warnings
- Cleans up installer file after completion

#### IPC Communication

**Main Process Handlers:**
```typescript
docker:getStatus        → dockerCheck.getDockerStatus()
docker:install          → dockerCheck.installDockerDesktop()
docker:start            → dockerCheck.startDockerDesktop()
docker:pullImages       → dockerLifecycle.pullDockerImages()
docker:startCompose     → dockerLifecycle.startDockerCompose()
docker:stopCompose      → dockerLifecycle.stopDockerCompose()
docker:waitForServices  → dockerLifecycle.waitForAllServices()
docker:getContainerStatus → dockerLifecycle.getContainerStatus()
```

**Renderer API:**
```javascript
window.electronAPI.docker.getStatus()        // Check Docker status
window.electronAPI.docker.install()          // Install Docker Desktop
window.electronAPI.docker.start()            // Start Docker Desktop
window.electronAPI.docker.pullImages()       // Pull images
window.electronAPI.docker.startCompose()     // Start containers
window.electronAPI.docker.waitForServices()  // Wait for ready
window.electronAPI.onProgress(callback)      // Listen for progress
```

### Wizard Integration

**Page 2: Docker Check (Updated)**
- Real Docker detection via IPC
- Shows actual Docker version if installed
- Install button triggers PowerShell script
- Start button launches Docker Desktop
- Progress messages from main process displayed in real-time

**Page 5: Installation Progress (Updated)**
- Real Docker image pull (postgres:16-alpine, redis:7-alpine)
- Real docker-compose up (starts containers)
- Real health checks (waits for pg_isready, redis ping)
- Progress bar updates based on actual operations
- Error handling with detailed messages

### Testing

**Test Docker Detection:**
```bash
cd obsidian-news-desk
npm run electron:compile
npm run electron
```

**Wizard Flow:**
1. Page 1: Click "Get Started"
2. Page 2: Click "Check Docker"
   - Should detect Docker Desktop 29.1.5 (or your version)
   - Should show "Docker is running and ready!" (green)
   - "Next" button enabled
3. Page 5: Click "Start Installation"
   - Should pull real Docker images (~200MB download)
   - Should start containers (obsidian-postgres, obsidian-redis)
   - Should wait for services (pg_isready, redis ping)
   - Should complete successfully

**Verify Containers:**
```bash
docker ps --filter "name=obsidian-"
```

Should show:
- obsidian-postgres (postgres:16-alpine)
- obsidian-redis (redis:7-alpine)

**Check Logs:**
```bash
docker logs obsidian-postgres
docker logs obsidian-redis
```

### Docker Compose Configuration

The wizard uses the existing `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: obsidian-postgres
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/lib/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U obsidian"]
      interval: 10s

  redis:
    image: redis:7-alpine
    container_name: obsidian-redis
    ports: ["6379:6379"]
    command: redis-server --requirepass obsidian_redis_password --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
```

### Health Check Logic

**PostgreSQL:**
```bash
docker exec obsidian-postgres pg_isready -U obsidian
```
Polls every 1 second for up to 30 seconds.

**Redis:**
```bash
docker exec obsidian-redis redis-cli -a obsidian_redis_password ping
```
Expects "PONG" response. Polls every 1 second for up to 30 seconds.

### Error Handling

**Common Errors:**
1. **Docker not installed** → Shows install button
2. **Docker installed but not running** → Shows start button
3. **Docker startup timeout** → Error message after 60 seconds
4. **Image pull failure** → Detailed error with retry suggestion
5. **Container health check timeout** → Error after 30 seconds

### Progress Messages

**During Installation:**
```
[HH:MM:SS] Creating storage directories...
[HH:MM:SS] Generating configuration files...
[HH:MM:SS] Pulling Docker images (this may take several minutes)...
[HH:MM:SS] Pulling Docker image: postgres:16-alpine...
[HH:MM:SS] Pulling Docker image: redis:7-alpine...
[HH:MM:SS] Docker images pulled successfully
[HH:MM:SS] Starting Docker containers...
[HH:MM:SS] Docker containers started
[HH:MM:SS] Waiting for services to be ready...
[HH:MM:SS] Waiting for PostgreSQL to be ready...
[HH:MM:SS] PostgreSQL is ready
[HH:MM:SS] Waiting for Redis to be ready...
[HH:MM:SS] Redis is ready
[HH:MM:SS] All services are ready!
[HH:MM:SS] Initializing database schema...
[HH:MM:SS] Database schema initialized
[HH:MM:SS] Installation complete!
```

### Current Limitations

**Phase 3 (Current):**
- ✅ Real Docker detection
- ✅ Real Docker installation (PowerShell)
- ✅ Real Docker startup
- ✅ Real image pulling
- ✅ Real container management
- ✅ Real health checks
- ❌ Storage directories not created yet (Phase 4)
- ❌ .env file not generated yet (Phase 4)
- ❌ No API key validation yet (Phase 4)

### Next Steps

**Phase 4: Configuration & Workers** (Week 4)
- Create storage directories from wizard path selection
- Generate .env file from wizard inputs
- Implement real API key validation (OpenAI, Claude, Google, Groq)
- Spawn BullMQ worker processes
- Save config to electron-store

---

**Status:** Ready for Phase 4 implementation
**Last Updated:** March 22, 2026
