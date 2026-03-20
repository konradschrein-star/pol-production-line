# Production Deployment Plan - Obsidian News Desk

**Goal:** Make this application production-ready, scalable, and deployable on any Windows machine with a professional installer.

**Status:** Planning Phase - DO NOT CODE YET

---

## Table of Contents
1. [Edge Cases & Error Handling](#edge-cases--error-handling)
2. [Scalability Requirements](#scalability-requirements)
3. [Windows Portability](#windows-portability)
4. [Deployment Strategy](#deployment-strategy)
5. [Installer Design](#installer-design)
6. [Configuration Management](#configuration-management)
7. [Testing & Validation](#testing--validation)
8. [Update Mechanism](#update-mechanism)

---

## Edge Cases & Error Handling

### 1. Database Failures

**Edge Cases:**
- PostgreSQL not running
- Connection pool exhausted
- Database corruption
- Migration failures
- Disk space full
- Concurrent write conflicts

**Error Handling Strategy:**
```typescript
// Graceful degradation
try {
  await db.query(...)
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // Database not running
    showUserFriendlyError('Database service is not running. Please restart the application.');
    attemptAutoRestart('postgresql');
  } else if (error.code === '53300') {
    // Too many connections
    logError('Connection pool exhausted');
    waitAndRetry(query, maxRetries: 3);
  } else if (error.code === '23505') {
    // Unique constraint violation
    showUserError('This record already exists');
  } else {
    // Unknown database error
    logToFile(error);
    showGenericError('Database error occurred');
  }
}
```

**Mitigations:**
- ✅ Connection retry logic with exponential backoff
- ✅ Health check endpoint (`/api/health`)
- ✅ Auto-restart database service if crashed
- ✅ Database connection pooling with limits
- ✅ Transaction rollback on errors
- ✅ Error logging to file (`logs/errors.log`)

---

### 2. Redis Queue Failures

**Edge Cases:**
- Redis not running
- Queue worker crashed
- Job stuck in processing state
- Memory exhausted
- Jobs failing repeatedly (poison messages)

**Error Handling Strategy:**
```typescript
// Job retry with backoff
const imageWorker = new Worker('queue_images', async (job) => {
  try {
    await generateImage(job.data);
  } catch (error) {
    if (job.attemptsMade < 3) {
      throw error; // BullMQ will retry
    } else {
      // Max retries reached - mark as failed
      await db.query('UPDATE news_scenes SET generation_status = $1, error_message = $2',
        ['failed', error.message]);
      logError(`Scene ${job.data.sceneId} failed after 3 attempts`);
    }
  }
}, {
  connection: redisConnection,
  limiter: {
    max: 5,        // Max 5 jobs per interval
    duration: 1000 // 1 second
  },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // 2s, 4s, 8s
  }
});
```

**Mitigations:**
- ✅ Worker health monitoring
- ✅ Automatic worker restart on crash
- ✅ Job timeout limits (5 minutes for images, 30 minutes for render)
- ✅ Dead letter queue for failed jobs
- ✅ Manual job retry from UI
- ✅ Redis persistence (AOF enabled)

---

### 3. AI API Failures

**Edge Cases:**
- Rate limit exceeded (429)
- API key invalid (401)
- Timeout (network issues)
- Malformed JSON response
- API service down (503)
- Token limit exceeded
- Invalid model name

**Error Handling Strategy:**
```typescript
async function callAIProvider(prompt: string): Promise<AIResponse> {
  const provider = getProvider(process.env.AI_PROVIDER);

  try {
    const response = await provider.generate(prompt, {
      timeout: 60000,  // 60s timeout
      retry: {
        retries: 2,
        factor: 2,
        minTimeout: 1000
      }
    });

    // Validate response schema with Zod
    const validated = AIResponseSchema.parse(response);
    return validated;

  } catch (error) {
    if (error.status === 429) {
      // Rate limited
      const retryAfter = error.headers['retry-after'] || 60;
      await delay(retryAfter * 1000);
      return callAIProvider(prompt); // Retry once
    } else if (error.status === 401) {
      // Invalid API key
      showUserError('AI API key is invalid. Please update in Settings.');
      markJobAsFailed(jobId, 'Invalid API credentials');
    } else if (error instanceof ZodError) {
      // Malformed response
      logError('AI returned invalid JSON', error);
      // Fallback: Try another provider
      return callBackupProvider(prompt);
    } else if (error.code === 'ETIMEDOUT') {
      // Network timeout
      logError('AI API timeout');
      throw new Error('AI service is not responding. Please try again.');
    } else {
      throw error;
    }
  }
}
```

**Mitigations:**
- ✅ Multi-provider fallback (Claude → Google → Groq)
- ✅ API key validation on startup
- ✅ Response schema validation (Zod)
- ✅ Rate limit detection and backoff
- ✅ Timeout handling (60s max)
- ✅ User-friendly error messages in UI
- ✅ Log all AI interactions for debugging

---

### 4. Image Generation Failures

**Edge Cases:**
- G-Labs webhook not running
- Prompt too long
- Invalid characters in prompt
- Generation timeout (5+ minutes)
- Download failed (corrupt file)
- R2 upload failed
- Disk space full

**Error Handling Strategy:**
```typescript
async function generateSceneImage(scene: Scene): Promise<string> {
  // Check G-Labs is running
  if (!await isGLabsHealthy()) {
    throw new Error('G-Labs service is not running. Please start it.');
  }

  // Sanitize prompt
  const sanitizedPrompt = sanitizePrompt(scene.image_prompt);

  // Generate with timeout
  const generationId = await startGeneration(sanitizedPrompt);

  const imageUrl = await pollWithTimeout(
    async () => {
      const status = await checkGenerationStatus(generationId);
      if (status.state === 'completed') return status.imageUrl;
      if (status.state === 'failed') throw new Error(status.error);
      return null; // Still processing
    },
    {
      timeout: 300000,  // 5 minutes
      interval: 5000,   // Check every 5s
    }
  );

  if (!imageUrl) {
    throw new Error('Image generation timed out after 5 minutes');
  }

  // Download and validate
  const imageBuffer = await downloadImage(imageUrl);
  if (!isValidImage(imageBuffer)) {
    throw new Error('Downloaded file is not a valid image');
  }

  // Upload to R2 with retry
  const r2Url = await uploadToR2WithRetry(imageBuffer, `scenes/${scene.id}.png`);

  return r2Url;
}
```

**Mitigations:**
- ✅ G-Labs health check before generation
- ✅ Prompt sanitization (remove special chars, length limit)
- ✅ Generation timeout (5 minutes)
- ✅ Image validation (check file signature)
- ✅ R2 upload retry (3 attempts)
- ✅ Fallback to manual upload if generation fails
- ✅ Disk space check before download

---

### 5. Playwright Browser Automation Failures

**Edge Cases:**
- Browser not installed
- Extension not found
- Extension disabled by user
- Download folder permissions denied
- Multiple Chrome instances interfere
- User closes browser manually
- Anti-virus blocks automation

**Error Handling Strategy:**
```typescript
async function launchBrowserWithExtension(): Promise<Page> {
  const browserPath = await detectBrowserPath();
  if (!browserPath) {
    throw new UserFacingError(
      'Browser not found',
      'Please install Chrome or Edge to use image generation.'
    );
  }

  const extensionPath = process.env.AUTO_WHISK_EXTENSION_PATH;
  if (!fs.existsSync(extensionPath)) {
    throw new UserFacingError(
      'Extension not installed',
      'Please install Auto Whisk extension in your browser.'
    );
  }

  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      executablePath: browserPath,
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-blink-features=AutomationControlled'
      ],
      timeout: 30000
    });

    return await context.newPage();

  } catch (error) {
    if (error.message.includes('Timeout')) {
      throw new Error('Browser took too long to start. Please try again.');
    } else if (error.message.includes('Could not find')) {
      throw new Error('Browser extension failed to load. Please reinstall.');
    } else {
      throw error;
    }
  }
}
```

**Mitigations:**
- ✅ Auto-detect browser installation path
- ✅ Validate extension exists before launch
- ✅ User-friendly error messages
- ✅ Fallback to manual browser launch
- ✅ Close browser tabs after use (cleanup)
- ✅ Handle user closing browser mid-generation

---

### 6. File System Failures

**Edge Cases:**
- Permission denied (temp folder)
- Disk space full
- File path too long (Windows 260 char limit)
- Corrupt files
- Antivirus quarantine
- Network drive disconnected

**Error Handling Strategy:**
```typescript
async function safeFileOperation<T>(
  operation: () => Promise<T>,
  fallbackPath?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'EACCES') {
      // Permission denied
      if (fallbackPath) {
        return await operation(); // Retry with fallback
      } else {
        throw new UserFacingError(
          'Permission denied',
          'Please run the application as administrator.'
        );
      }
    } else if (error.code === 'ENOSPC') {
      // Disk space full
      throw new UserFacingError(
        'Disk space full',
        'Please free up disk space and try again.'
      );
    } else if (error.code === 'ENAMETOOLONG') {
      // Path too long
      throw new Error('File path is too long. Please use a shorter project name.');
    } else {
      throw error;
    }
  }
}

// Check disk space before operations
async function ensureDiskSpace(requiredMB: number): Promise<void> {
  const free = await getDiskSpace();
  if (free < requiredMB * 1024 * 1024) {
    throw new Error(`Not enough disk space. ${requiredMB}MB required.`);
  }
}
```

**Mitigations:**
- ✅ Disk space check before downloads
- ✅ Use Windows short paths if needed (8.3 format)
- ✅ Temp file cleanup on exit
- ✅ Permission check on startup
- ✅ Fallback to user's temp directory
- ✅ File validation (magic bytes check)

---

### 7. Network Failures

**Edge Cases:**
- No internet connection
- Firewall blocking requests
- Proxy settings
- DNS resolution failures
- SSL certificate errors
- Slow connection (uploads timeout)

**Error Handling Strategy:**
```typescript
async function fetchWithRetry(url: string, options: RequestInit = {}) {
  const maxRetries = 3;
  const timeout = 30000; // 30s

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HTTPError(response.status, response.statusText);
      }

      return response;

    } catch (error) {
      if (attempt === maxRetries) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection.');
        } else if (error.code === 'ENOTFOUND') {
          throw new Error('Cannot reach server. Please check your internet connection.');
        } else {
          throw error;
        }
      }

      // Exponential backoff
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

**Mitigations:**
- ✅ Network connectivity check on startup
- ✅ Retry logic with exponential backoff
- ✅ Timeout handling
- ✅ Offline mode (queue jobs for later)
- ✅ User notification when offline

---

### 8. User Input Validation

**Edge Cases:**
- Empty script
- Script too short (< 100 chars)
- Script too long (> 10,000 chars)
- Special characters breaking prompts
- SQL injection attempts
- XSS attempts
- Invalid file types (non-image, non-video)
- File size too large (> 500MB)

**Validation Strategy:**
```typescript
// Frontend validation
const scriptSchema = z.object({
  raw_script: z.string()
    .min(100, 'Script must be at least 100 characters')
    .max(10000, 'Script cannot exceed 10,000 characters')
    .regex(/^[\s\S]*$/, 'Invalid characters detected'),
});

// Backend validation (always validate on backend too!)
export async function POST(req: Request) {
  const body = await req.json();

  try {
    const validated = scriptSchema.parse(body);
  } catch (error) {
    return Response.json(
      { error: error.errors },
      { status: 400 }
    );
  }

  // Sanitize for SQL (use parameterized queries)
  await db.query(
    'INSERT INTO news_jobs (raw_script) VALUES ($1)',
    [validated.raw_script] // Safe from SQL injection
  );
}

// File upload validation
async function validateUpload(file: File, type: 'image' | 'video') {
  const maxSizeMB = type === 'image' ? 10 : 500;
  const allowedTypes = type === 'image'
    ? ['image/png', 'image/jpeg', 'image/webp']
    : ['video/mp4', 'video/quicktime'];

  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File too large. Max ${maxSizeMB}MB.`);
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Expected ${allowedTypes.join(', ')}`);
  }

  // Check file signature (magic bytes)
  const buffer = await file.arrayBuffer();
  const signature = new Uint8Array(buffer.slice(0, 4));
  if (!isValidFileSignature(signature, type)) {
    throw new Error('File is corrupted or not a valid ' + type);
  }
}
```

**Mitigations:**
- ✅ Frontend + backend validation (defense in depth)
- ✅ Zod schemas for type safety
- ✅ SQL parameterized queries (no injection)
- ✅ Sanitize HTML output (prevent XSS)
- ✅ File type validation (magic bytes)
- ✅ File size limits
- ✅ Rate limiting on API endpoints

---

## Scalability Requirements

### 1. Database Scaling

**Current Setup:** Single PostgreSQL instance

**Scalability Concerns:**
- 1000+ jobs → slow queries
- Concurrent job creation
- Large scene tables (10,000+ rows)

**Solutions:**
```typescript
// Database indexes (critical for performance)
CREATE INDEX idx_news_jobs_status_created ON news_jobs(status, created_at DESC);
CREATE INDEX idx_news_scenes_job_id_order ON news_scenes(job_id, scene_order);

// Connection pooling
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
});

// Pagination (never fetch all jobs)
SELECT * FROM news_jobs
ORDER BY created_at DESC
LIMIT 20 OFFSET $1;

// Archive old jobs (6 months+)
CREATE TABLE news_jobs_archive AS
SELECT * FROM news_jobs
WHERE created_at < NOW() - INTERVAL '6 months';

DELETE FROM news_jobs
WHERE created_at < NOW() - INTERVAL '6 months';
```

**Mitigations:**
- ✅ Database indexes on hot paths
- ✅ Connection pooling (max 20)
- ✅ Pagination everywhere
- ✅ Archive old jobs (> 6 months)
- ✅ Query optimization (use EXPLAIN ANALYZE)
- ✅ Vacuum database regularly

---

### 2. Queue Scaling

**Current Setup:** Single Redis instance, single worker per queue

**Scalability Concerns:**
- 100+ concurrent image generations
- Render queue blocking analysis queue
- Worker crashes halting all jobs

**Solutions:**
```typescript
// Multiple workers per queue (concurrency)
const imageWorker = new Worker('queue_images', handler, {
  concurrency: 5,  // Process 5 jobs in parallel
});

// Priority queues
await queueImages.add('generate-image', data, {
  priority: 1,  // Higher priority (1 = highest, 10 = lowest)
});

// Rate limiting (prevent overwhelming external APIs)
{
  limiter: {
    max: 10,       // Max 10 jobs
    duration: 1000 // Per second
  }
}

// Separate workers for different job types
const urgentWorker = new Worker('queue_images', handler, {
  limiter: { max: 10, duration: 1000 }
});

const backgroundWorker = new Worker('queue_images', handler, {
  limiter: { max: 2, duration: 1000 }
});
```

**Mitigations:**
- ✅ Worker concurrency (5 parallel image jobs)
- ✅ Priority queues (urgent jobs first)
- ✅ Rate limiting (prevent API abuse)
- ✅ Separate worker processes (isolate failures)
- ✅ Queue monitoring dashboard
- ✅ Auto-restart workers on crash

---

### 3. File Storage Scaling

**Current Setup:** R2 for permanent, local filesystem for temp

**Scalability Concerns:**
- 10,000+ videos = TBs of storage
- R2 costs
- Slow uploads (large files)
- Temp file cleanup

**Solutions:**
```typescript
// Lifecycle policies (delete old files)
// R2 Bucket Settings:
{
  "lifecycle": [
    {
      "id": "delete-old-renders",
      "status": "Enabled",
      "expiration": { "days": 90 },
      "filter": { "prefix": "videos/" }
    }
  ]
}

// Multipart uploads (large files)
async function uploadLargeFile(file: Buffer, key: string) {
  const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks

  if (file.length < CHUNK_SIZE) {
    return uploadToR2(file, key);
  }

  const uploadId = await s3.createMultipartUpload({ Bucket, Key: key });

  const parts = [];
  for (let i = 0; i < file.length; i += CHUNK_SIZE) {
    const chunk = file.slice(i, i + CHUNK_SIZE);
    const partNumber = Math.floor(i / CHUNK_SIZE) + 1;

    const { ETag } = await s3.uploadPart({
      Bucket,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: chunk
    });

    parts.push({ ETag, PartNumber: partNumber });
  }

  await s3.completeMultipartUpload({
    Bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts }
  });
}

// Temp file cleanup (on startup and periodically)
async function cleanupTempFiles() {
  const tempDir = path.join(os.tmpdir(), 'obsidian-news');
  const files = await fs.readdir(tempDir);
  const now = Date.now();

  for (const file of files) {
    const filePath = path.join(tempDir, file);
    const stats = await fs.stat(filePath);
    const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

    if (ageHours > 24) {
      await fs.unlink(filePath); // Delete files older than 24h
    }
  }
}
```

**Mitigations:**
- ✅ R2 lifecycle policies (auto-delete after 90 days)
- ✅ Multipart uploads for large files
- ✅ Temp file cleanup (24h retention)
- ✅ Compression (gzip videos before upload)
- ✅ CDN caching (CloudFlare for R2 public URLs)

---

### 4. Remotion Rendering Scaling

**Current Setup:** Single render process, blocks until complete

**Scalability Concerns:**
- Rendering 60s video takes 5+ minutes
- Blocks other renders
- High CPU/memory usage

**Solutions:**
```typescript
// Render in separate process (don't block main app)
import { spawn } from 'child_process';

async function renderVideoAsync(jobId: string): Promise<void> {
  const renderProcess = spawn('node', [
    'scripts/render-worker.js',
    jobId
  ], {
    detached: true,  // Run independently
    stdio: 'ignore'
  });

  renderProcess.unref(); // Don't wait for it
}

// Set concurrency limit
const renderWorker = new Worker('queue_render', handler, {
  concurrency: 1,  // Only 1 render at a time (CPU intensive)
});

// Timeout protection
await renderMedia({
  ...options,
  timeoutInMilliseconds: 600000,  // 10 minutes max
});

// Memory limit (prevent crashes)
await renderMedia({
  ...options,
  chromiumOptions: {
    args: ['--max-old-space-size=4096']  // 4GB heap
  }
});
```

**Mitigations:**
- ✅ Render in separate process (isolation)
- ✅ Concurrency = 1 (prevent CPU exhaustion)
- ✅ Timeout limit (10 minutes)
- ✅ Memory limit (4GB heap)
- ✅ Priority queue (urgent renders first)
- ✅ Progress tracking (update UI during render)

---

## Windows Portability

### 1. File Path Handling

**Problem:** Windows uses backslashes (`\`), Node.js prefers forward slashes (`/`)

**Solutions:**
```typescript
import path from 'path';
import { fileURLToPath } from 'url';

// Always use path.join() - never string concatenation
const filePath = path.join(process.cwd(), 'uploads', 'image.png');
// ✅ Works: C:\Users\konra\app\uploads\image.png

// BAD - Don't do this:
const badPath = process.cwd() + '/uploads/image.png';
// ❌ Breaks on Windows: C:\Users\konra\app/uploads/image.png

// Normalize paths (convert to OS-specific)
const normalized = path.normalize('C:/Users/konra/app\\uploads/../image.png');
// ✅ Result: C:\Users\konra\app\image.png

// Convert between formats
const windowsPath = 'C:\\Users\\konra\\file.txt';
const unixPath = windowsPath.split(path.sep).join('/');
// ✅ Result: C:/Users/konra/file.txt
```

**Mitigations:**
- ✅ Use `path.join()` everywhere
- ✅ Use `path.resolve()` for absolute paths
- ✅ Use `path.normalize()` for user inputs
- ✅ Never hardcode `\` or `/` in paths
- ✅ Use `__dirname` and `process.cwd()` for base paths

---

### 2. Browser Detection

**Problem:** Chrome/Edge installation paths vary per user

**Solutions:**
```typescript
async function detectBrowserPath(): Promise<string | null> {
  const possiblePaths = [
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA!, 'Google\\Chrome\\Application\\chrome.exe'),

    // Edge
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',

    // Brave
    path.join(process.env.LOCALAPPDATA!, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
  ];

  for (const browserPath of possiblePaths) {
    if (await fs.pathExists(browserPath)) {
      return browserPath;
    }
  }

  // Fallback: Check Windows Registry
  const registryPath = await getFromRegistry(
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe'
  );

  return registryPath || null;
}
```

**Mitigations:**
- ✅ Check multiple installation paths
- ✅ Query Windows Registry as fallback
- ✅ Let user manually select browser executable
- ✅ Save detected path to config file

---

### 3. Extension Installation

**Problem:** Extension path depends on browser profile

**Solutions:**
```typescript
async function findExtensionPath(extensionId: string): Promise<string | null> {
  const userDataPaths = [
    // Edge
    path.join(process.env.LOCALAPPDATA!, 'Microsoft\\Edge\\User Data\\Default\\Extensions'),

    // Chrome
    path.join(process.env.LOCALAPPDATA!, 'Google\\Chrome\\User Data\\Default\\Extensions'),
  ];

  for (const userDataPath of userDataPaths) {
    const extensionPath = path.join(userDataPath, extensionId);

    if (await fs.pathExists(extensionPath)) {
      // Find latest version
      const versions = await fs.readdir(extensionPath);
      versions.sort((a, b) => b.localeCompare(a)); // Descending

      return path.join(extensionPath, versions[0]);
    }
  }

  return null;
}

// Auto-detect Auto Whisk extension
const autoWhiskId = 'your-extension-id-here'; // Get from edge://extensions
const extensionPath = await findExtensionPath(autoWhiskId);
```

**Mitigations:**
- ✅ Auto-detect extension by ID
- ✅ Handle multiple browser profiles
- ✅ Find latest version automatically
- ✅ Provide manual path input as fallback
- ✅ Installer copies extension to known location

---

### 4. Environment Variables

**Problem:** `.env` file not cross-platform friendly, users can't edit easily

**Solutions:**
```typescript
// Use Windows-friendly config file
const configPath = path.join(
  process.env.APPDATA!,  // C:\Users\konra\AppData\Roaming
  'ObsidianNewsDesk',
  'config.json'
);

// Store config as JSON
interface Config {
  AI_PROVIDER: 'claude' | 'google' | 'groq';
  ANTHROPIC_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  GROQ_API_KEY?: string;
  DATABASE_URL: string;
  REDIS_HOST: string;
  R2_BUCKET: string;
  // ... etc
}

// Load config with defaults
function loadConfig(): Config {
  if (fs.existsSync(configPath)) {
    const json = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(json);
  }

  // Default config
  return {
    AI_PROVIDER: 'google',
    DATABASE_URL: 'postgresql://localhost:5432/obsidian_news',
    REDIS_HOST: 'localhost',
    // ...
  };
}

// Save config
function saveConfig(config: Config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
```

**Mitigations:**
- ✅ Use `AppData/Roaming` for config (user-specific)
- ✅ JSON config file (easy to edit)
- ✅ Settings UI for all config (no manual editing)
- ✅ Validation on load (detect corrupt config)
- ✅ Backup config before saving

---

### 5. Service Management

**Problem:** PostgreSQL, Redis must run as Windows services

**Solutions:**
```typescript
// Use NSSM (Non-Sucking Service Manager) to create Windows services

// Install service (during installer)
execSync('nssm install ObsidianPostgreSQL "C:\\ObsidianNewsDesk\\postgresql\\bin\\pg_ctl.exe" start -D "C:\\ObsidianNewsDesk\\data"');
execSync('nssm set ObsidianPostgreSQL Start SERVICE_AUTO_START');

// Check service status
async function isServiceRunning(serviceName: string): Promise<boolean> {
  try {
    const output = execSync(`sc query "${serviceName}"`, { encoding: 'utf-8' });
    return output.includes('RUNNING');
  } catch {
    return false;
  }
}

// Start service
async function startService(serviceName: string): Promise<void> {
  execSync(`net start "${serviceName}"`);
}

// Stop service
async function stopService(serviceName: string): Promise<void> {
  execSync(`net stop "${serviceName}"`);
}
```

**Mitigations:**
- ✅ Install PostgreSQL/Redis as Windows services
- ✅ Auto-start services on boot
- ✅ Health check services on app startup
- ✅ Auto-restart crashed services
- ✅ Uninstaller removes services

---

### 6. Permissions

**Problem:** User may not have admin rights

**Solutions:**
```typescript
// Check if running as admin
function isAdmin(): boolean {
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Request elevation (relaunch as admin)
async function requestAdminRights() {
  const { app } = require('electron');

  if (!isAdmin()) {
    const options = {
      type: 'warning',
      buttons: ['Relaunch as Admin', 'Continue Anyway'],
      title: 'Admin Rights Required',
      message: 'This app needs admin rights to install services. Relaunch as administrator?',
    };

    const { response } = await dialog.showMessageBox(options);

    if (response === 0) {
      // Relaunch with admin
      app.relaunch({ args: ['--admin'] });
      app.exit();
    }
  }
}

// Fallback: Use portable mode (SQLite, no services)
if (!isAdmin()) {
  console.log('Running in portable mode (no admin rights)');
  usePortableMode();  // SQLite instead of PostgreSQL
}
```

**Mitigations:**
- ✅ Request admin elevation on first run
- ✅ Fallback to portable mode if denied
- ✅ Install to user directory (no admin needed)
- ✅ Detect permission issues early

---

## Deployment Strategy

### Option A: Electron Desktop App (RECOMMENDED)

**Why Electron:**
- ✅ Bundles everything: Node.js, PostgreSQL, Redis, Chrome
- ✅ No terminal commands - GUI-based
- ✅ Auto-updater built-in
- ✅ System tray icon
- ✅ Native Windows feel
- ✅ Code signing for trust

**Architecture:**
```
ObsidianNewsDesk.exe
├── Main Process (Electron)
│   ├── Backend (Next.js API)
│   ├── Workers (BullMQ)
│   ├── Database (Embedded PostgreSQL)
│   └── Queue (Embedded Redis)
└── Renderer Process (Electron)
    └── Frontend (React UI)
```

**User Experience:**
1. Download `ObsidianNewsDesk-Setup.exe` (150MB)
2. Run installer → Installs to `C:\Program Files\ObsidianNewsDesk`
3. Desktop shortcut created
4. Double-click → App opens (no terminal)
5. System tray icon → Right-click → Start/Stop services

**Tech Stack:**
- **Electron Forge** - Packaging
- **electron-builder** - Windows installer (.exe)
- **pg-embed** - Embedded PostgreSQL
- **redis-server-windows** - Embedded Redis
- **electron-updater** - Auto-updates

**Pros:**
- ✅ Professional installer
- ✅ No dependencies required
- ✅ Works on any Windows machine
- ✅ Auto-updates (push updates remotely)
- ✅ System tray app (always accessible)

**Cons:**
- ❌ Large download size (~150MB)
- ❌ More complex development
- ❌ Code signing costs money (~$300/year)

---

### Option B: Docker Desktop Installer

**Why Docker:**
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Easy updates (`docker-compose pull`)
- ✅ Isolated environment
- ✅ No Windows-specific bugs

**Architecture:**
```
docker-compose.yml
├── app (Next.js + Workers)
├── postgres (Database)
├── redis (Queue)
└── nginx (Reverse proxy)
```

**User Experience:**
1. Download `ObsidianNewsDesk-Docker.zip`
2. Extract and run `install.bat`
3. Script installs Docker Desktop (if not present)
4. Runs `docker-compose up -d`
5. Opens browser to `http://localhost:3000`

**Tech Stack:**
- **Docker Compose** - Container orchestration
- **Docker Desktop** - Required dependency
- **Nginx** - Reverse proxy

**Pros:**
- ✅ Cross-platform
- ✅ Easy to update
- ✅ Isolated environment (no conflicts)

**Cons:**
- ❌ Requires Docker Desktop (4GB download)
- ❌ Docker has resource overhead
- ❌ Some users unfamiliar with Docker
- ❌ WSL2 required on Windows (extra complexity)

---

### Option C: Portable Executable (Simplified)

**Why Portable:**
- ✅ No installation needed
- ✅ Runs from USB stick
- ✅ Smallest download size

**Architecture:**
```
ObsidianNewsDesk-Portable/
├── obsidian-news-desk.exe (Node.js bundled with pkg)
├── data/ (SQLite database)
└── config.json
```

**User Experience:**
1. Download `ObsidianNewsDesk-Portable.zip` (50MB)
2. Extract to any folder
3. Run `obsidian-news-desk.exe`
4. Opens browser to `http://localhost:3000`

**Tech Stack:**
- **pkg** - Bundle Node.js app into .exe
- **SQLite** - Instead of PostgreSQL
- **ioredis-mock** - In-memory queue (no Redis)

**Pros:**
- ✅ No installation
- ✅ Portable (USB stick)
- ✅ Small download (~50MB)

**Cons:**
- ❌ Less powerful (SQLite slower than PostgreSQL)
- ❌ No persistent queue (jobs lost on restart)
- ❌ Manual updates (re-download .zip)

---

### Recommendation: **Option A (Electron Desktop App)**

**Rationale:**
- Most professional user experience
- No dependencies to install
- Auto-updater (critical for production)
- Native Windows integration
- Supports full PostgreSQL + Redis (no compromises)

**Next Steps:**
1. Build Electron wrapper around Next.js app
2. Embed PostgreSQL + Redis
3. Create Windows installer with electron-builder
4. Add system tray icon + auto-start
5. Implement auto-updater
6. Code sign for Windows SmartScreen bypass

---

## Installer Design (Option A - Electron)

### Installation Flow

```
1. User downloads ObsidianNewsDesk-Setup.exe (150MB)
2. Runs installer (NSIS or Squirrel.Windows)
3. License agreement screen
4. Choose installation directory (default: C:\Program Files\ObsidianNewsDesk)
5. Installer extracts files:
   ├── ObsidianNewsDesk.exe (Electron app)
   ├── resources/
   │   ├── postgresql/ (embedded database)
   │   ├── redis/ (embedded queue)
   │   └── app/ (Next.js bundle)
6. Installer creates Windows services:
   - ObsidianPostgreSQL (auto-start)
   - ObsidianRedis (auto-start)
7. Installer initializes database:
   - Runs schema.sql
   - Creates default config
8. Creates desktop shortcut
9. Creates Start Menu entry
10. Registers uninstaller
11. Launches app
```

### Uninstaller Flow

```
1. User runs uninstaller (Control Panel → Programs)
2. Stops Windows services
3. Removes services (NSSM)
4. Deletes application files
5. KEEPS user data:
   - %APPDATA%\ObsidianNewsDesk\config.json
   - Database files (optional deletion prompt)
6. Removes shortcuts
7. Done
```

### First-Run Wizard

```
Welcome Screen
├── "Welcome to Obsidian News Desk"
├── Brief description
└── [Next]

API Key Setup
├── "Configure AI Provider"
├── Dropdown: Claude / Google / Groq
├── Input: API Key
├── [Test Connection] button
└── [Next]

Browser Setup
├── "Select Browser for Automation"
├── Auto-detected: Microsoft Edge (C:\Program Files\...)
├── [Browse...] to select manually
└── [Next]

Extension Setup
├── "Install Auto Whisk Extension"
├── Instructions:
│   1. Open Edge
│   2. Go to edge://extensions
│   3. Install Auto Whisk
│   4. Come back here
├── [I've installed it]
└── [Next]

Ready Screen
├── "Setup Complete!"
├── Summary of configuration
├── [Launch Obsidian News Desk]
```

### Auto-Updater

```typescript
import { autoUpdater } from 'electron-updater';

// Check for updates on startup
autoUpdater.checkForUpdatesAndNotify();

// Update available
autoUpdater.on('update-available', (info) => {
  showNotification('Update available', 'Downloading in background...');
});

// Update downloaded
autoUpdater.on('update-downloaded', (info) => {
  const options = {
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    title: 'Update Ready',
    message: 'A new version has been downloaded. Restart to apply?',
  };

  const { response } = await dialog.showMessageBox(options);

  if (response === 0) {
    autoUpdater.quitAndInstall();
  }
});

// Check for updates every 6 hours
setInterval(() => {
  autoUpdater.checkForUpdatesAndNotify();
}, 6 * 60 * 60 * 1000);
```

**Update Server:**
- Host releases on GitHub Releases
- Or use custom S3 bucket
- Semver versioning (1.0.0 → 1.0.1)
- Delta updates (only download changed files)

---

## Configuration Management

### Config File Structure

**Location:** `%APPDATA%\ObsidianNewsDesk\config.json`

```json
{
  "version": "1.0.0",
  "ai": {
    "provider": "google",
    "anthropic_key": "sk-ant-...",
    "google_key": "AI...",
    "groq_key": "gsk_..."
  },
  "browser": {
    "type": "edge",
    "executable_path": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "extension_path": "C:\\Users\\konra\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\..."
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "obsidian_news",
    "user": "obsidian",
    "password": "auto-generated-password"
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": "auto-generated-password"
  },
  "storage": {
    "r2_access_key": "...",
    "r2_secret_key": "...",
    "r2_bucket": "titan-production-v1",
    "r2_endpoint": "https://...",
    "r2_public_url": "https://pub-..."
  },
  "app": {
    "auto_start": true,
    "minimize_to_tray": true,
    "check_updates": true
  }
}
```

### Settings UI Enhancements

**Add to Settings Page:**
- ✅ Test AI Connection button (validates key)
- ✅ Test Database Connection button
- ✅ Test Redis Connection button
- ✅ Browse for browser executable
- ✅ Browse for extension path
- ✅ Reset to defaults button
- ✅ Export/Import config button

---

## Testing & Validation

### Pre-Release Checklist

**Installer Testing:**
- [ ] Fresh Windows 11 install (VM)
- [ ] Fresh Windows 10 install (VM)
- [ ] Install as admin
- [ ] Install as standard user
- [ ] Install to custom directory
- [ ] Install with antivirus enabled
- [ ] Uninstall completely
- [ ] Reinstall over existing installation
- [ ] Upgrade from older version

**Functionality Testing:**
- [ ] Create job → Analyze → Generates scenes
- [ ] Image generation → All scenes complete
- [ ] Edit ticker headlines → Saves
- [ ] Regenerate scene → Re-queues
- [ ] Upload manual image → Displays
- [ ] Launch browser → Opens HeyGen
- [ ] Upload avatar → Triggers render
- [ ] Final video download → Plays correctly

**Error Handling Testing:**
- [ ] Kill PostgreSQL mid-job → Recovers
- [ ] Kill Redis mid-job → Recovers
- [ ] Invalid AI key → Shows error
- [ ] No internet → Shows error
- [ ] Disk full → Shows error
- [ ] Browser not found → Shows error
- [ ] Extension not found → Shows error

**Performance Testing:**
- [ ] 100 jobs in database → UI responsive
- [ ] 10 concurrent image generations → No crashes
- [ ] 60-second video render → Completes under 10 minutes
- [ ] Memory usage < 2GB under normal load
- [ ] CPU usage < 50% while idle

---

## Update Mechanism

### Versioning Strategy

**Semantic Versioning:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (database schema changes)
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

**Examples:**
- `1.0.0` → Initial release
- `1.0.1` → Bug fix (hotkey not working)
- `1.1.0` → New feature (scene rating system)
- `2.0.0` → Breaking change (new database schema)

### Update Process

```
1. App checks for updates on startup
2. If update available:
   a. Download in background (delta update)
   b. Show notification: "Update available (5.2MB)"
   c. Click notification → Show changelog
3. Update downloaded:
   a. Prompt: "Restart to apply update?"
   b. If "Yes":
      - Stop workers gracefully
      - Close app
      - Apply update
      - Relaunch app
4. If "Later":
   - Prompt again in 6 hours
```

### Migration Strategy (Database)

```typescript
// migrations/001_add_scene_rating.sql
ALTER TABLE news_scenes ADD COLUMN rating INTEGER;
CREATE INDEX idx_scenes_rating ON news_scenes(rating);

// Migration runner (auto-runs on app start)
async function runMigrations() {
  const currentVersion = await getCurrentDBVersion();
  const migrations = await loadMigrations();

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration ${migration.version}...`);
      await db.query(migration.sql);
      await setDBVersion(migration.version);
    }
  }
}
```

---

## Cost Estimation

### Development Costs
- **Electron development:** 40 hours
- **Installer setup:** 20 hours
- **Error handling:** 30 hours
- **Testing:** 40 hours
- **Total:** ~130 hours @ $100/hr = **$13,000**

### Operational Costs
- **Code signing certificate:** $300/year
- **R2 storage:** $0.015/GB/month (~$5/month for 300GB)
- **GitHub Actions (CI/CD):** Free for public repos
- **Total:** **~$360/year**

---

## Next Steps (DO NOT CODE YET)

### Phase 1: Planning & Design
1. Review this document
2. Enter plan mode for detailed audit
3. Make decisions:
   - Deployment strategy (Electron vs Docker vs Portable)
   - Error handling priorities
   - Scalability targets

### Phase 2: Error Handling Implementation
1. Add try-catch blocks everywhere
2. Implement retry logic
3. Add logging system
4. Create error monitoring dashboard

### Phase 3: Windows Portability
1. Fix all file paths (use path.join)
2. Auto-detect browser paths
3. Handle registry lookups
4. Test on fresh Windows VM

### Phase 4: Electron Wrapper
1. Create Electron main process
2. Embed Next.js app
3. Bundle PostgreSQL + Redis
4. Add system tray icon

### Phase 5: Installer
1. electron-builder configuration
2. NSIS installer script
3. Service installation (NSSM)
4. First-run wizard

### Phase 6: Testing
1. VM testing (Windows 10/11)
2. Permission testing (admin/user)
3. Error scenario testing
4. Performance benchmarks

### Phase 7: Release
1. Code signing
2. GitHub Release
3. Auto-updater setup
4. Documentation

---

## Open Questions (For Planning Mode)

1. **Deployment:** Electron, Docker, or Portable? (Recommend: Electron)
2. **Database:** Keep PostgreSQL or switch to SQLite for portability?
3. **Queue:** Keep Redis or use in-memory queue?
4. **Updates:** Auto-update or manual download?
5. **Licensing:** Open source or proprietary?
6. **Monetization:** Free, paid, or freemium?
7. **Telemetry:** Anonymous usage stats? (for debugging)

---

**Status:** ✅ Planning Complete - Ready for Plan Mode Audit

**Next:** User reviews document → Enter plan mode → Make decisions → Begin implementation
