# OBSIDIAN NEWS DESK - COMPREHENSIVE SYSTEM MAP

Based on a thorough code analysis of the production codebase, here is the complete architecture documentation (Generated: March 29, 2026):

---

## DIRECTORY STRUCTURE

```
obsidian-news-desk/
├── src/
│   ├── app/                           # Next.js 14 App Router
│   │   ├── (dashboard)/               # Main dashboard layout group
│   │   │   ├── page.tsx               # Dashboard home (metrics, recent jobs)
│   │   │   ├── broadcasts/
│   │   │   │   ├── page.tsx           # Job list with pagination/filtering
│   │   │   │   ├── new/page.tsx       # New broadcast creation form
│   │   │   │   └── [id]/page.tsx      # Storyboard editor (detailed QA)
│   │   │   ├── analytics/page.tsx     # Performance metrics dashboard
│   │   │   ├── settings/page.tsx      # System configuration
│   │   │   ├── personas/page.tsx      # AI provider persona management
│   │   │   ├── security/page.tsx      # Audit log viewer
│   │   │   ├── consoles/page.tsx      # Real-time logs (Docker, workers, Next.js)
│   │   │   ├── terminal/page.tsx      # System terminal interface
│   │   │   ├── logs/page.tsx          # Historical log viewer
│   │   │   └── layout.tsx             # Dashboard layout wrapper
│   │   ├── api/                       # REST API routes
│   │   │   ├── jobs/
│   │   │   │   ├── route.ts           # GET/POST job CRUD
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts       # GET/PATCH job details
│   │   │   │   │   ├── cancel/route.ts  # POST cancel job
│   │   │   │   │   ├── compile/route.ts # POST avatar upload + transition to render
│   │   │   │   │   ├── retry/route.ts   # POST retry failed job
│   │   │   │   │   ├── launch-browser/route.ts # POST open HeyGen browser
│   │   │   │   │   ├── scenes/[scene_id]/
│   │   │   │   │   │   ├── route.ts           # PATCH scene (headline/prompt)
│   │   │   │   │   │   ├── upload/route.ts    # POST manual image upload
│   │   │   │   │   │   ├── regenerate/route.ts # POST re-queue scene to queue_images
│   │   │   │   │   │   └── references/route.ts # PATCH scene reference images
│   │   │   │   │   ├── seo/route.ts          # GET/POST YouTube SEO metadata
│   │   │   │   │   └── thumbnail/route.ts    # GET/POST custom thumbnail
│   │   │   │   └── bulk/route.ts     # POST bulk delete/cancel/retry
│   │   │   ├── analyze/route.ts       # POST create job + queue analysis
│   │   │   ├── health/route.ts        # GET system health check
│   │   │   ├── settings/route.ts      # GET/PATCH system settings (requires ADMIN_API_KEY)
│   │   │   ├── style-presets/route.ts # CRUD style presets
│   │   │   ├── persona*/route.ts      # AI provider personas
│   │   │   ├── queue/resume/route.ts  # POST resume queue processing
│   │   │   ├── analytics/route.ts     # GET job analytics
│   │   │   ├── consoles/{docker,nextjs,render,workers}/route.ts # Real-time logs
│   │   │   ├── whisk/
│   │   │   │   ├── token/route.ts     # GET current token status
│   │   │   │   ├── refresh-token/route.ts  # POST manual token refresh
│   │   │   │   └── extension-status/route.ts # GET browser extension status
│   │   │   ├── media/serve/route.ts   # GET stream video/images
│   │   │   ├── files/route.ts         # GET available files in storage
│   │   │   ├── system/disk-space/route.ts # GET disk usage
│   │   │   ├── security/events/route.ts   # GET audit log events
│   │   │   ├── tools/prompt-preview/route.ts # POST preview AI prompts
│   │   │   └── [other utilities]      # Migration, debug routes
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Root redirect
│   ├── components/                    # React UI components
│   │   ├── broadcast/                 # Job-specific UI
│   │   │   ├── JobStatusPanel.tsx     # Real-time job state display
│   │   │   ├── SceneCard.tsx          # Individual scene editor (image + headline + prompt)
│   │   │   ├── AvatarUploadZone.tsx   # Drag-drop avatar upload
│   │   │   ├── BatchImageUpload.tsx   # Multi-scene image batch upload
│   │   │   ├── StylePresetSelector.tsx # Style preset dropdown
│   │   │   ├── RenderingProgress.tsx  # Real-time render progress
│   │   │   └── ConsoleLog.tsx         # Live console output
│   │   ├── data/
│   │   │   ├── DataTable.tsx          # Sortable/filterable job list
│   │   │   ├── Pagination.tsx         # Page navigation
│   │   │   └── BulkActionToolbar.tsx  # Multi-select actions
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx         # App shell (sidebar + top nav + content)
│   │   │   ├── SideNavBar.tsx         # Left navigation menu
│   │   │   ├── TopNavBar.tsx          # Top action/status bar
│   │   │   ├── PageHeader.tsx         # Page title + breadcrumbs + actions
│   │   │   └── Ticker.tsx             # Animated ticker component
│   │   ├── settings/
│   │   │   ├── StylePresetManager.tsx # CRUD interface for presets
│   │   │   ├── StylePresetCreator.tsx # Create new preset form
│   │   │   └── StylePresetEditModal.tsx # Edit preset modal
│   │   ├── analytics/
│   │   │   ├── MetricCard.tsx         # Metric display card
│   │   │   ├── PerformanceChart.tsx   # Charts (performance breakdown)
│   │   │   ├── ErrorBreakdown.tsx     # Error rate breakdown
│   │   │   └── WorkerHealthPanel.tsx  # Queue worker status
│   │   ├── security/
│   │   │   └── SecurityTimeline.tsx   # Audit log timeline
│   │   ├── personas/
│   │   │   └── PersonaCard.tsx        # AI provider persona card
│   │   ├── system/
│   │   │   ├── DiskSpaceWidget.tsx    # Storage usage indicator
│   │   │   ├── WhiskExtensionStatus.tsx # Extension availability
│   │   │   ├── UpdateButton.tsx       # Auto-update trigger
│   │   │   └── UpdateNotification.tsx # Update available notification
│   │   ├── ui/                        # Design system primitives
│   │   │   ├── Button.tsx             # Variants: primary, secondary, danger
│   │   │   ├── Input.tsx, TextArea.tsx
│   │   │   ├── Select.tsx             # Dropdown select
│   │   │   ├── Badge.tsx              # Status pills
│   │   │   ├── Card.tsx               # Container with elevation
│   │   │   ├── Icon.tsx               # SVG icon wrapper
│   │   │   ├── Tooltip.tsx            # Hover tooltips
│   │   │   ├── ConfirmationModal.tsx  # Delete/cancel confirmations
│   │   │   ├── ErrorDisplay.tsx       # Error message formatting
│   │   │   ├── SearchInput.tsx        # Debounced search
│   │   │   ├── ProgressBar.tsx        # Linear progress
│   │   │   └── RelativeTime.tsx       # "2 minutes ago" formatting
│   │   ├── shared/
│   │   │   ├── GrainOverlay.tsx       # Subtle texture overlay
│   │   │   └── HotkeyHelp.tsx         # Keyboard shortcut reference
│   │   ├── analytics/
│   │   │   └── [various metric components]
│   │   ├── common/
│   │   │   └── ToastContainer.tsx     # Global toast notifications
│   │   └── installer/
│   │       ├── components/
│   │       │   ├── DockerInstallGuide.tsx
│   │       │   ├── DockerStatusCard.tsx
│   │       │   └── PrerequisitesStep.tsx
│   │       └── hooks/useDockerStatus.ts
│   ├── lib/                           # Business logic & utilities
│   │   ├── ai/                        # AI script analysis engine
│   │   │   ├── index.ts               # AI provider factory
│   │   │   ├── types.ts               # Zod schemas + TS types for AI analysis
│   │   │   ├── providers/
│   │   │   │   ├── openai.ts          # OpenAI GPT-4 provider (implements AIProvider)
│   │   │   │   ├── claude.ts          # Anthropic Claude provider
│   │   │   │   ├── google.ts          # Google Gemini provider
│   │   │   │   └── groq.ts            # Groq LLaMA provider
│   │   │   ├── prompts/
│   │   │   │   ├── script-analyzer.ts # Script-to-scene analysis prompts
│   │   │   │   ├── scene-based-analyzer.ts # Sentence-level prompts per scene
│   │   │   │   └── visual-guidelines.ts # Visual direction context
│   │   │   ├── script-segmenter.ts    # Break script into sentences + narrative position
│   │   │   ├── scene-segmenter.ts     # Group sentences into broad scenes (Phase 2)
│   │   │   ├── prompt-sanitizer.ts    # Handle Whisk content policy violations
│   │   │   ├── prompt-simplifier.ts   # Simplify prompts on retry
│   │   │   └── youtube-seo.ts         # Generate YouTube metadata
│   │   ├── queue/                     # BullMQ queue orchestration
│   │   │   ├── index.ts               # Redis connection config
│   │   │   ├── queues.ts              # Queue instances (analyze, images, render, avatar_automation)
│   │   │   ├── workers/               # BullMQ job processors
│   │   │   │   ├── analyze.worker.ts  # Script → scenes (Node 1)
│   │   │   │   ├── images.worker.ts   # Whisk API image generation (Node 3)
│   │   │   │   ├── render.worker.ts   # Remotion video rendering (Node 5)
│   │   │   │   └── avatar.worker.ts   # HeyGen automation (optional, manual by default)
│   │   │   ├── rate-limiter.ts        # Adaptive concurrency for Whisk API
│   │   │   ├── retry-manager.ts       # Retry logic + exponential backoff
│   │   │   ├── cleanup.ts             # Queue maintenance (dead-letter cleanup)
│   │   │   └── recovery.ts            # Queue recovery on startup
│   │   ├── whisk/                     # Google Whisk API integration (Node 3)
│   │   │   ├── api.ts                 # WhiskAPIClient class (direct API calls, bearer token)
│   │   │   ├── types.ts               # WhiskImageGenerateRequest, WhiskGenerateResponse, etc.
│   │   │   ├── token-store.ts         # In-memory + .env token cache
│   │   │   ├── token-refresh.ts       # Browser automation token refresh (Playwright)
│   │   │   ├── token-refresher.ts     # Token refresh orchestration
│   │   │   ├── token-refresh-lock.ts  # Prevent concurrent refresh races
│   │   │   ├── extension-integration.ts # Chrome extension token refresh
│   │   │   ├── reference-manager.ts   # Resolve scene reference images (style/subject/scene)
│   │   │   ├── generate-with-retry.ts # Image generation with retry + sanitization
│   │   │   └── retry-strategy.ts      # Backoff strategies (exponential, linear)
│   │   ├── remotion/                  # Remotion video rendering (Node 5)
│   │   │   ├── index.ts               # Remotion registration
│   │   │   ├── compositions/
│   │   │   │   └── NewsVideo.tsx      # Main composition (scenes + avatar + ticker)
│   │   │   ├── components/
│   │   │   │   ├── Scene.tsx          # Individual scene with Ken Burns effect
│   │   │   │   ├── AvatarOverlay.tsx  # Avatar MP4 in bottom-right (640x360)
│   │   │   │   ├── NewsTickerOverlay.tsx # Scrolling ticker at bottom
│   │   │   │   ├── Subtitles.tsx      # Word-level subtitles (if transcribed)
│   │   │   │   └── Ticker.tsx         # Individual ticker text component
│   │   │   ├── render.ts              # renderNewsVideo() - Remotion entry point
│   │   │   ├── pacing.ts              # Critical: Scene timing algorithm (hook/body)
│   │   │   ├── video-utils.ts         # FFmpeg integration (avatar duration, optimization)
│   │   │   ├── asset-preparation.ts   # Copy images to public/ + validate before render
│   │   │   ├── animations/
│   │   │   │   ├── config.ts          # Animation duration constants
│   │   │   │   ├── index.ts           # Export animation utilities
│   │   │   │   ├── patterns.ts        # Reusable animation patterns
│   │   │   │   └── subtitle-styles.ts # Subtitle styling
│   │   │   ├── cache.ts               # Remotion composition cache
│   │   │   └── types.ts               # WordTimestamp, SceneSentenceInfo, etc.
│   │   ├── db/                        # Database layer
│   │   │   ├── index.ts               # PostgreSQL pool connection
│   │   │   ├── transactions.ts        # transitionJobState() + advisory locks
│   │   │   └── migrations/
│   │   │       └── 006_audit_log.sql  # Audit table schema + indexes
│   │   ├── video/                     # Video processing utilities
│   │   │   ├── ffmpeg.ts              # FFmpeg wrapper (encoding, muxing)
│   │   │   ├── ffmpeg-resolver.ts     # Find ffmpeg-static binary
│   │   │   ├── optimize-avatar.ts     # Re-encode avatar to 640x360 + ~2.9MB
│   │   │   ├── quality-check.ts       # Pre-render validation
│   │   │   ├── scene-count-validator.ts # Verify scene count
│   │   │   └── types.ts               # Video format types
│   │   ├── transcription/             # Whisper + sentence matching
│   │   │   ├── whisper.ts             # transcribeFile() - OpenAI Whisper API
│   │   │   └── sentence-matcher.ts    # Map sentences to audio word timestamps
│   │   ├── storage/                   # Local filesystem storage
│   │   │   ├── local.ts               # initStorage(), saveFile(), resolveFilePath()
│   │   │   └── path-resolver.ts       # getBaseStoragePath(), resolveStoragePath()
│   │   ├── style-presets/             # Style preset manager
│   │   │   └── manager.ts             # CRUD + apply to prompts + build context
│   │   ├── browser/                   # Browser automation (deprecated)
│   │   │   ├── auto-whisk.ts          # Playwright Whisk automation (legacy)
│   │   │   ├── ban-detection.ts       # Detect if account banned
│   │   │   ├── folder-monitor.ts      # Watch folder for downloads
│   │   │   └── index.ts               # Browser utilities
│   │   ├── config/
│   │   │   ├── index.ts               # Runtime config (env vars)
│   │   │   └── validate-paths.ts      # Storage path validation
│   │   ├── hooks/                     # React hooks (client-side)
│   │   │   ├── useJob.ts              # Fetch job + poll status
│   │   │   ├── usePolling.ts          # Generic polling hook
│   │   │   ├── useToast.ts            # Toast notification state
│   │   │   └── useHotkeys.ts          # Keyboard shortcuts
│   │   ├── logging/
│   │   │   └── logger.ts              # Structured logging
│   │   ├── metrics/
│   │   │   └── manager.ts             # Performance metrics tracking
│   │   ├── monitoring/
│   │   │   ├── alert-definitions.ts   # Alert rule definitions
│   │   │   └── alert-service.ts       # Alert dispatch
│   │   ├── personas/
│   │   │   └── manager.ts             # AI persona CRUD + selection
│   │   ├── pexels/                    # Pexels stock video integration
│   │   │   ├── api.ts                 # Pexels API client
│   │   │   ├── client.ts              # HTTP client wrapper
│   │   │   ├── cache.ts               # API response caching
│   │   │   ├── config.ts              # API configuration
│   │   │   ├── errors.ts              # Pexels error types
│   │   │   ├── logger.ts              # Pexels request logging
│   │   │   ├── index.ts               # Exports
│   │   │   └── types.ts               # PexelsVideo, PexelsResponse, etc.
│   │   ├── integrations/
│   │   │   ├── heygen/
│   │   │   │   ├── python-bridge.ts   # Python subprocess for HeyGen automation
│   │   │   │   └── tracking-parser.ts # Parse HeyGen job status
│   │   │   └── thumbnail-api.ts       # Generate custom thumbnails
│   │   ├── security/
│   │   │   ├── audit-logger.ts        # Log security events
│   │   │   ├── audit-types.ts         # Event type definitions
│   │   │   └── headers.ts             # Security headers middleware
│   │   ├── errors/
│   │   │   ├── error-codes.ts         # Error code enumeration + response factory
│   │   │   └── safe-errors.ts         # Error sanitization (remove stack traces)
│   │   ├── validation/
│   │   │   ├── schemas.ts             # Zod schemas for API request validation
│   │   │   └── bulk-schemas.ts        # Bulk action schemas
│   │   ├── middleware/
│   │   │   └── rate-limiter.ts        # Request rate limiting
│   │   ├── utils/
│   │   │   ├── api.ts                 # Fetch wrappers (updateScene, regenerateScene, etc.)
│   │   │   ├── format.ts              # formatRelativeTime(), formatFileSize(), etc.
│   │   │   ├── status.ts              # Job status type + utilities
│   │   │   ├── progress.ts            # Progress calculation utilities
│   │   │   └── image-processing.ts    # Image dimension validation
│   │   ├── runtime/
│   │   │   └── node-resolver.ts       # Runtime Node.js module resolution
│   │   ├── audio/
│   │   │   └── transcribe.ts          # Audio transcription (Whisper)
│   │   └── mcp/
│   │       └── pexels-server.ts       # MCP server for Pexels integration
│   ├── db/
│   │   └── migrations/
│   │       └── 006_audit_log.sql
│   ├── types/
│   │   └── [empty - types in schema files]
│   ├── installer/
│   │   ├── components/
│   │   └── hooks/
│   ├── mcp/
│   │   └── pexels-server.ts
│   └── middleware.ts                  # Next.js middleware (global handlers)
├── public/                            # Static assets + Remotion temp images
│   ├── images/                        # Scene images (copied from C:\Users\...\images\ before render)
│   └── avatars/                       # Optimized avatar MP4s
├── src/db/
│   └── migrations/
├── scripts/
│   ├── init-db.ts                    # Database schema initialization
│   ├── migrate.ts                     # Run migrations
│   ├── optimize-avatar.sh             # Re-encode avatar (FFmpeg wrapper)
│   ├── cleanup.ts                     # Queue cleanup + dead-letter recovery
│   └── [startup scripts]
├── dist-portable/                     # Portable build output (Electron)
├── chrome-extension/                  # Auto Whisk browser extension (deprecated)
├── .env.example                       # Environment variable template
├── package.json                       # Dependencies + scripts
├── tsconfig.json                      # TypeScript config
├── tailwind.config.js                 # TailwindCSS design system
├── next.config.js                     # Next.js configuration
└── [Docker files, git, etc.]
```

---

## BACKEND NODES

### Node 1: Unified AI Brain (Script Analyst)

**Location:** `src/lib/ai/` and `src/lib/queue/workers/analyze.worker.ts`

**Service Class: AIProvider Interface**
- **File:** `src/lib/ai/types.ts`
- **Methods:**
  - `analyzeScript(rawScript: string): Promise<AIAnalysisOutput>` - Basic script analysis
  - `analyzeScriptWithContext(systemPrompt: string, userPrompt: string): Promise<AIAnalysisOutput>` - Style-aware analysis
  - `analyzeScriptSceneBasedWithDuration(rawScript: string, avatarDurationSeconds: number, styleContext?: any): Promise<AIAnalysisOutput>` - Phase 2: Sentence-level prompts grouped by scene

**Implementations:**
1. **OpenAI Provider** (`src/lib/ai/providers/openai.ts`)
   - Model: `gpt-4-turbo`
   - Temperature: 0.7
   - Response format: JSON
   - Timeout: 120s

2. **Claude Provider** (`src/lib/ai/providers/claude.ts`)
   - Model: Anthropic Claude (via @anthropic-ai/sdk)

3. **Google Provider** (`src/lib/ai/providers/google.ts`)
   - Model: Google Gemini

4. **Groq Provider** (`src/lib/ai/providers/groq.ts`)
   - Model: Groq LLaMA

**Analyzer Worker**
- **File:** `src/lib/queue/workers/analyze.worker.ts`
- **Queue:** `queue_analyze`
- **Concurrency:** 2 jobs in parallel
- **Process:**
  1. Segment raw script into sentences (via `segmentScript()`)
  2. Fetch job's style preset + build context
  3. Update job status to `analyzing`
  4. Call AI provider with segmented script
  5. Bulk INSERT scenes into `news_scenes` table (transaction)
  6. Record analysis timing in `job_metrics`
  7. Transition job state from `analyzing` → `generating_images` (with advisory lock)
  8. Queue all scenes to `queue_images` for image generation

**Database Interactions:**
- `SELECT style_preset_id FROM news_jobs WHERE id = $1`
- `INSERT INTO news_scenes (job_id, scene_order, ...) VALUES ...` (bulk, 150 max)
- `INSERT INTO job_metrics (job_id, analysis_time_ms, scene_count, ...)`
- `UPDATE news_jobs SET status = 'analyzing|generating_images', avatar_script = ...`

**External API Calls:**
- AI Provider (OpenAI, Claude, Google, Groq) - JSON response
- Returns: `AIAnalysisOutput` with scenes array

---

### Node 2: BullMQ Orchestrator

**Location:** `src/lib/queue/`

**Queue Configuration**
- **File:** `src/lib/queue/queues.ts`
- **Redis Connection:** `redisOptions` from `src/lib/queue/index.ts`
- **Queues:**
  1. `queue_analyze` - Script analysis jobs
  2. `queue_images` - Image generation jobs (per-scene)
  3. `queue_render` - Final video rendering
  4. `queue_avatar_automation` - Optional HeyGen automation (default: manual)

**Key Components:**
- **Rate Limiter:** `src/lib/queue/rate-limiter.ts` - AdaptiveRateLimiter
  - Min concurrency: 2 (default)
  - Max concurrency: 8 (default)
  - Initial: 3
  - Detects 429 errors from Whisk API + adjusts dynamically

- **Retry Manager:** `src/lib/queue/retry-manager.ts`
  - Max retries per job: 3
  - Backoff: Exponential (3s, 6s, 12s base)
  - Detects content policy violations + auto-sanitizes prompts

- **Recovery:** `src/lib/queue/recovery.ts`
  - Resume stalled jobs on startup
  - Clean dead-letter queue

---

### Node 3: Image Asset Generator (Whisk API)

**Location:** `src/lib/whisk/` and `src/lib/queue/workers/images.worker.ts`

**WhiskAPIClient Service Class**
- **File:** `src/lib/whisk/api.ts`
- **Public Methods:**
  - `constructor(bearerToken?: string)` - Initialize with token (from env or parameter)
  - `generateImage(request: WhiskImageGenerateRequest): Promise<WhiskGenerateResponse>` - Generate single image
  - `private refreshTokenAndRetry()` - Auto-refresh token on 401

**Key Properties:**
- API Endpoint: `https://aisandbox-pa.googleapis.com/v1/whisk:generateImage`
- Authentication: Bearer token (expires ~1 hour)
- Request timeout: 90s

**Token Management**
- **WhiskTokenStore** (`src/lib/whisk/token-store.ts`)
  - In-memory cache + .env persistence
  - `getToken()` / `setToken(token)`

- **WhiskTokenRefresher** (`src/lib/whisk/token-refresh.ts`)
  - Browser automation via Playwright
  - Opens `https://labs.google.com/whisk`
  - Extracts Authorization header from Network tab
  - Fallback: Extension-based refresh if available

- **TokenRefreshLock** (`src/lib/whisk/token-refresh-lock.ts`)
  - Prevents concurrent refresh races

**Images Worker**
- **File:** `src/lib/queue/workers/images.worker.ts`
- **Queue:** `queue_images`
- **Concurrency:** 2-8 (adaptive based on rate limits)
- **Process per scene:**
  1. Update `news_scenes.generation_status = 'generating'`
  2. Apply prompt simplification (on final retries)
  3. Apply style preset to prompt (if job has one)
  4. Resolve reference images (style/subject/scene from `reference_manager`)
  5. Call Whisk API with prompt + references
  6. Handle content policy violations + auto-sanitize prompt
  7. Retry with exponential backoff (max 3 attempts)
  8. Save image to `C:\Users\konra\ObsidianNewsDesk\images\{sceneId}.jpg`
  9. Update `news_scenes.image_url` with file path
  10. Record in `generation_history` table
  11. If all images done, transition job to `review_assets` state

**Database Interactions:**
- `UPDATE news_scenes SET generation_status = 'generating|completed|failed' WHERE id = ...`
- `UPDATE news_scenes SET image_url = ... WHERE id = ...`
- `INSERT INTO generation_history (scene_id, job_id, attempt_number, ...) VALUES ...`
- `SELECT style_preset_id FROM news_jobs WHERE id = ...`

**External API Calls:**
- **Google Whisk API** - Image generation request/response
  - Request: `{ prompt, aspectRatio, referenceInputs }`
  - Response: `{ image: { imageBase64 }, metadata }`

**Reference Images Manager**
- **File:** `src/lib/whisk/reference-manager.ts`
- Resolves scene-specific + style-preset references
- Falls back to style preset if no scene references
- Returns: `{ strategy, references, appliedReferences }`

---

### Node 4: Human-in-the-Loop API (Storyboard Bridge)

**Location:** `src/app/api/jobs/[id]/`

**API Routes:**

| Method | Path | Purpose | State Transition |
|--------|------|---------|------------------|
| GET | `/api/jobs/:id` | Fetch job details + scenes | None |
| PATCH | `/api/jobs/:id` | Update job metadata | None |
| POST | `/api/jobs/:id/launch-browser` | Open HeyGen for manual avatar | None (manual workflow) |
| PATCH | `/api/jobs/:id/scenes/:scene_id` | Update scene headline/prompt | None |
| POST | `/api/jobs/:id/scenes/:scene_id/upload` | Manual image override | None |
| POST | `/api/jobs/:id/scenes/:scene_id/regenerate` | Re-queue scene to queue_images | None (queues for processing) |
| PATCH | `/api/jobs/:id/scenes/:scene_id/references` | Update reference images | None |
| POST | `/api/jobs/:id/compile` | Upload HeyGen avatar + transition to render | `review_assets` → `rendering` |
| POST | `/api/jobs/:id/cancel` | Cancel job + remove from queue | Any → `cancelled` |
| POST | `/api/jobs/bulk` | Bulk delete/cancel/retry | Varies by operation |
| POST | `/api/jobs/:id/retry` | Retry failed job | `failed` → `pending` |

**Key Implementation Details:**

**POST /api/jobs/:id/compile**
- Accepts: HeyGen avatar MP4 file upload
- Validation: Check file size (<100MB), verify MP4 format
- Process:
  1. Save avatar to `C:\Users\konra\ObsidianNewsDesk\avatars\{timestamp}.mp4`
  2. Update `news_jobs.avatar_mp4_url` with file path
  3. Transition job: `review_assets` → `rendering` (via transaction + advisory lock)
  4. Queue job to `queue_render`
  5. Return job ID + status

**POST /api/jobs/:id/launch-browser**
- Opens HeyGen in default browser at `https://heygen.com`
- User manually creates avatar on HeyGen
- User downloads MP4 → uploads via `/compile` route

**PATCH /api/jobs/:id/scenes/:scene_id**
- Accepts JSON: `{ ticker_headline, image_prompt }`
- Updates scene in database
- Does NOT re-queue image generation (user must call `/regenerate`)

**POST /api/jobs/:id/scenes/:scene_id/regenerate**
- Re-queues scene to `queue_images` (as if initial generation failed)
- Updates `news_scenes.generation_status = 'pending'`
- Increments retry counter in `generation_history`

**POST /api/jobs/:id/scenes/:scene_id/upload**
- Accepts image file (JPG/PNG)
- Saves to `C:\Users\konra\ObsidianNewsDesk\images\{sceneId}.jpg`
- Updates `news_scenes.image_url` with file path
- Skips Whisk API generation

---

### Node 5: Remotion Render Engine

**Location:** `src/lib/remotion/` and `src/lib/queue/workers/render.worker.ts`

**Render Worker**
- **File:** `src/lib/queue/workers/render.worker.ts`
- **Queue:** `queue_render`
- **Concurrency:** 1 job at a time (Remotion is CPU-heavy)
- **Process:**
  1. Fetch job + all scenes from database
  2. **CRITICAL:** Validate + prepare assets (asset-preparation.ts)
     - Copies images from storage → `public/images/`
     - Validates image file existence + format
     - Checks avatar MP4 exists + is valid
  3. Check if scenes have stored timing (from database)
  4. Calculate pacing algorithm if timing not stored (or use fallback)
  5. Validate pacing (scene count matches timing count)
  6. Call `renderNewsVideo()` from Remotion
  7. Save rendered video to `C:\Users\konra\ObsidianNewsDesk\videos\{jobId}.mp4`
  8. Update `news_jobs` with:
     - `status = 'completed'`
     - `final_video_url = <path to video>`
     - `completed_at = NOW()`
  9. Record metrics in `job_metrics` (render_time_ms, final_video_size_bytes)

**NewsVideo Composition**
- **File:** `src/lib/remotion/compositions/NewsVideo.tsx`
- **Props:**
  - `avatarMp4Url: string` - Path to HeyGen avatar
  - `avatarDurationSeconds: number` - Video duration
  - `avatarAspectRatio?: number` - Width/height ratio
  - `scenes: Array<{ id, image_url, ticker_headline, scene_order }>`
  - `wordTimestamps?: WordTimestamp[]` - Optional word-level timing

- **Components:**
  1. **Scene** - Background image with Ken Burns effect
  2. **AvatarOverlay** - Avatar MP4 in bottom-right (640x360, optimized)
  3. **NewsTickerOverlay** - Scrolling text overlay (headlines)
  4. **Subtitles** - Optional word-level captions

**Pacing Algorithm** (Critical Logic)
- **File:** `src/lib/remotion/pacing.ts`
- **Function:** `calculateScenePacing(avatarDurationSeconds, sceneCount, fps)`
- **Phases:**
  - **Hook (0-30s):** 1.5s per image (rapid, eye-catching)
  - **Body (30s+):** Equal distribution across remaining scenes
  - **Edge cases:**
    - Video < 30s: All scenes use 1.5s
    - Scene count > hook slots: First N scenes get hook duration
    - Rounding: Distribute remainder frames across first N scenes

- **Fallback:** If database timing unavailable, calculates evenly-distributed frames

**Asset Preparation**
- **File:** `src/lib/remotion/asset-preparation.ts`
- **Function:** `prepareRenderAssets(jobId, scenes, avatarMp4Url): Promise<AssetValidation>`
- **Validates:**
  - All images exist in storage
  - Files are readable + properly formatted
  - Avatar MP4 exists + is valid
  - File sizes are reasonable (<100MB)
- **Actions:**
  - Copies images from storage to `public/images/` (required for `staticFile()`)
  - Optimizes avatar if needed (via `optimize-avatar.ts`)
  - Returns validation result with detailed error messages

**Video Rendering**
- **File:** `src/lib/remotion/render.ts`
- **Function:** `renderNewsVideo(options): Promise<{ video_path, duration_ms }>`
- **Calls:**
  - Remotion's `render()` function with NewsVideo composition
  - Output: 1920x1080, 30fps, H.264 codec
  - Container: MP4
  - Timeout: 120 seconds (increased for large asset loading)

**Database Interactions:**
- `SELECT id, avatar_mp4_url, word_timestamps FROM news_jobs WHERE id = ...`
- `SELECT id, image_url, ticker_headline, ... FROM news_scenes WHERE job_id = ... ORDER BY scene_order`
- `UPDATE news_jobs SET status = 'rendering' WHERE id = ...`
- `UPDATE news_jobs SET status = 'completed', final_video_url = ..., completed_at = NOW() WHERE id = ...`
- `INSERT INTO job_metrics (...) VALUES (...)`

**Performance Metrics:**
- **Script analysis:** 30-60s
- **Image generation:** 15-20min (8 scenes)
- **Avatar optimization:** 10-15s
- **Video rendering:** 2-3min per 60s output
- **Total:** 25-40 minutes end-to-end

---

## DATABASE SCHEMA

**Database:** PostgreSQL 17 (Docker)
**Connection:** `postgres://user:pass@localhost:5432/obsidian_news`

### Tables

#### `news_jobs` (Core job tracking)
```sql
CREATE TABLE news_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) CHECK (status IN ('pending', 'analyzing', 'generating_images', 'review_assets', 'rendering', 'completed', 'failed', 'cancelled')),
  raw_script TEXT NOT NULL,
  avatar_script TEXT,
  avatar_mp4_url TEXT,  -- Path to HeyGen avatar MP4
  final_video_url TEXT, -- Path to rendered final video
  error_message TEXT,
  cancellation_reason TEXT,
  job_metadata JSONB, -- Flexible metadata (AI provider, quality settings, etc.)
  style_preset_id UUID REFERENCES style_presets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE  -- When rendering finished
);

CREATE INDEX idx_news_jobs_status ON news_jobs(status);
CREATE INDEX idx_news_jobs_created_at ON news_jobs(created_at DESC);
```

#### `news_scenes` (Scene/image data)
```sql
CREATE TABLE news_scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES news_jobs(id) ON DELETE CASCADE,
  scene_order INTEGER NOT NULL, -- Display order (0-indexed)
  image_prompt TEXT NOT NULL,  -- Whisk API prompt
  ticker_headline VARCHAR(200) NOT NULL,
  image_url TEXT, -- Path to generated JPG
  generation_status VARCHAR(50) DEFAULT 'pending' CHECK (...IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,

  -- NEW: Sentence-to-scene mapping (Phase 2)
  sentence_text TEXT, -- The specific sentence this scene visualizes
  narrative_position VARCHAR(20), -- 'opening|development|evidence|conclusion'
  shot_type VARCHAR(20), -- 'establishing|medium|closeup|detail'
  visual_continuity_notes TEXT, -- AI notes on visual flow

  -- NEW: Timing from transcription (if available)
  word_start_time FLOAT8, -- Start time in seconds (from word timestamps)
  word_end_time FLOAT8, -- End time in seconds

  -- NEW: Reference images
  reference_images JSONB, -- { style, subject, scene } with URLs

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(job_id, scene_order)
);

CREATE INDEX idx_news_scenes_job_id ON news_scenes(job_id);
CREATE INDEX idx_news_scenes_status ON news_scenes(generation_status);
```

#### `job_metrics` (Performance tracking)
```sql
CREATE TABLE job_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES news_jobs(id) ON DELETE CASCADE UNIQUE,

  -- Timing metrics (milliseconds)
  analysis_time_ms INTEGER,
  total_image_gen_time_ms INTEGER,
  avatar_gen_time_ms INTEGER,
  render_time_ms INTEGER,
  total_processing_time_ms INTEGER,

  -- Resource metrics
  scene_count INTEGER,
  final_video_size_bytes BIGINT,
  final_video_duration_seconds REAL,

  -- Quality metrics
  failed_scenes_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_metrics_job_id ON job_metrics(job_id);
CREATE INDEX idx_job_metrics_created_at ON job_metrics(created_at DESC);
```

#### `generation_history` (Image generation audit trail)
```sql
CREATE TABLE generation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES news_scenes(id) ON DELETE CASCADE,
  job_id UUID NOT NULL,

  attempt_number INTEGER NOT NULL, -- 1, 2, 3...
  image_url TEXT, -- Generated image URL (null if failed)
  generation_params JSONB, -- Prompt, aspect ratio, model, etc.
  whisk_request_id TEXT,

  success BOOLEAN NOT NULL,
  error_message TEXT,
  generation_time_ms INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generation_history_scene_id ON generation_history(scene_id);
CREATE INDEX idx_generation_history_success ON generation_history(success);
```

#### `style_presets` (Reusable visual styles)
```sql
CREATE TABLE style_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB, -- { referenceImages, promptModifiers, visual_guidelines }
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `audit_log` (Security audit trail)
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  event_type VARCHAR(50) NOT NULL, -- 'auth', 'job_delete', 'scene_update', etc.
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info|warning|critical'

  actor VARCHAR(100), -- IP address or API key hash
  ip_address VARCHAR(45),
  user_agent TEXT,

  resource_type VARCHAR(50), -- 'job|scene|settings', etc.
  resource_id UUID,
  action VARCHAR(50), -- 'create|update|delete|access'

  details JSONB -- Free-form metadata
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
```

---

## API ROUTES

### Job CRUD

| Method | Path | Function | Status Code | Response |
|--------|------|----------|-------------|----------|
| **GET** | `/api/jobs` | List jobs (paginated, filtered) | 200 | `{ jobs: [...], pagination: { page, limit, total, totalPages } }` |
| **POST** | `/api/jobs` | Create job + queue analysis | 201 | `{ success: true, job: { id, status, created_at } }` |
| **GET** | `/api/jobs/:id` | Fetch job details + scenes | 200 | Job object with scenes array |
| **PATCH** | `/api/jobs/:id` | Update job metadata | 200 | Updated job object |
| **POST** | `/api/jobs/:id/cancel` | Cancel job | 200 | `{ status: 'cancelled', ... }` |
| **POST** | `/api/jobs/:id/retry` | Retry failed job | 200 | Job object with status reset to `pending` |
| **POST** | `/api/jobs/:id/compile` | Upload avatar + start render | 200 | Job object with status `rendering` |
| **POST** | `/api/jobs/:id/launch-browser` | Open HeyGen | 200 | `{ browser_opened: true }` |
| **POST** | `/api/jobs/bulk` | Bulk operations | 200 | `{ deleted: N, cancelled: N, ... }` |

### Analysis

| Method | Path | Function | Status Code |
|--------|------|----------|-------------|
| **POST** | `/api/analyze` | Create job from script | 201 |
| **POST** | `/api/tools/prompt-preview` | Preview AI prompt output | 200 |

### Scene Management

| Method | Path | Function | Status Code |
|--------|------|----------|-------------|
| **PATCH** | `/api/jobs/:id/scenes/:scene_id` | Update headline/prompt | 200 |
| **POST** | `/api/jobs/:id/scenes/:scene_id/upload` | Manual image upload | 200 |
| **POST** | `/api/jobs/:id/scenes/:scene_id/regenerate` | Re-queue image generation | 200 |
| **PATCH** | `/api/jobs/:id/scenes/:scene_id/references` | Set reference images | 200 |

### System Management

| Method | Path | Function | Status Code |
|--------|------|----------|-------------|
| **GET** | `/api/health` | System health check | 200 |
| **GET** | `/api/settings` | Fetch settings (requires ADMIN_API_KEY) | 200 |
| **PATCH** | `/api/settings` | Update settings (requires ADMIN_API_KEY) | 200 |
| **GET** | `/api/system/disk-space` | Disk usage stats | 200 |
| **POST** | `/api/queue/resume` | Resume queue processing | 200 |

### Style Presets

| Method | Path | Function | Status Code |
|--------|------|----------|-------------|
| **GET** | `/api/style-presets` | List presets | 200 |
| **POST** | `/api/style-presets` | Create preset | 201 |
| **PATCH** | `/api/style-presets/:id` | Update preset | 200 |
| **DELETE** | `/api/style-presets/:id` | Delete preset | 204 |

### Media Serving

| Method | Path | Function | Status Code |
|--------|------|----------|-------------|
| **GET** | `/api/media/serve` | Stream video/image | 200 |
| **GET** | `/api/files` | List available files | 200 |

### Monitoring

| Method | Path | Function | Status Code |
|--------|------|----------|-------------|
| **GET** | `/api/analytics` | Job analytics | 200 |
| **GET** | `/api/metrics/dashboard` | Metrics dashboard data | 200 |
| **GET** | `/api/security/events` | Audit log events | 200 |
| **GET** | `/api/consoles/{docker\|nextjs\|render\|workers}` | Real-time logs | 200 |

---

## FRONTEND COMPONENTS

### Page Components (Next.js App Router)

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `page.tsx` | Dashboard home (metrics, recent jobs) |
| `/broadcasts` | `page.tsx` | Job list with pagination + filtering + bulk actions |
| `/broadcasts/new` | `page.tsx` | New broadcast creation form |
| `/broadcasts/:id` or `/jobs/:id` | `page.tsx` | Storyboard editor (detailed job management) |
| `/analytics` | `page.tsx` | Performance metrics + charts |
| `/settings` | `page.tsx` | System config + style preset manager |
| `/personas` | `page.tsx` | AI provider selection + persona management |
| `/security` | `page.tsx` | Audit log timeline |
| `/consoles` | `page.tsx` | Real-time log viewers (Docker, workers, Next.js) |

### Broadcast Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `SceneCard` | `{ scene, onUpdate, isSelected }` | Individual scene card (edit headline/prompt, upload image, regenerate) |
| `AvatarUploadZone` | `{ jobId, onUploadComplete }` | Drag-drop avatar upload (bottom-right overlay on storyboard) |
| `BatchImageUpload` | `{ jobId, onUploadComplete }` | Multi-image batch upload |
| `JobStatusPanel` | `{ job }` | Real-time job state display (analyzing → generating → review → rendering) |
| `StylePresetSelector` | `{ selectedId, onChange }` | Dropdown to select style preset |
| `RenderingProgress` | `{ job }` | Live render progress bar |

### Data Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `DataTable` | `{ columns, rows, sortable, onSort }` | Sortable job list table |
| `Pagination` | `{ page, limit, total, onChange }` | Page navigation |
| `BulkActionToolbar` | `{ selectedCount, onDelete, onCancel, onRetry }` | Multi-select bulk actions |

### Layout Components

| Component | Purpose |
|-----------|---------|
| `MainLayout` | App shell (sidebar + top nav + content area) |
| `SideNavBar` | Left sidebar navigation (home, broadcasts, analytics, settings) |
| `TopNavBar` | Top action bar (system status, help, profile) |
| `PageHeader` | Page title + breadcrumbs + actions |
| `Ticker` | Animated ticker display (news headlines) |

### UI Primitives

| Component | Variants |
|-----------|----------|
| `Button` | primary, secondary, danger; disabled, loading states |
| `Input` | Default, focused, error, disabled |
| `TextArea` | Multi-line text input with resize |
| `Select` | Dropdown with search + keyboard navigation |
| `Card` | Container with elevation + hover effects |
| `Badge` | Status pills (pending, analyzing, completed, failed, etc.) |
| `Icon` | SVG icon wrapper with sizing |
| `Tooltip` | Hover-based tooltips |
| `ConfirmationModal` | Delete/cancel confirmations |
| `ErrorDisplay` | Error message formatting + icon |
| `ProgressBar` | Linear progress indicator |
| `SearchInput` | Debounced search input |

---

## DATA FLOW DIAGRAM

```
USER SUBMITS SCRIPT
       ↓
POST /api/analyze (create job)
       ↓
Database: INSERT job (status='pending')
       ↓
Queue: Add to queue_analyze
       ↓
ANALYZE WORKER (analyze.worker.ts)
  ├─ Fetch job details
  ├─ Segment script into sentences
  ├─ Call AI Provider (OpenAI/Claude/Google/Groq)
  ├─ Generate scenes with image prompts + ticker headlines
  ├─ Database: INSERT scenes into news_scenes
  ├─ Update job status to 'analyzing' → 'generating_images'
  └─ Queue: Add scenes to queue_images
       ↓
IMAGES WORKER (images.worker.ts) [CONCURRENCY: 2-8 per rate limiter]
  ├─ For each scene in queue:
  │  ├─ Update scene status to 'generating'
  │  ├─ Fetch style preset (if exists)
  │  ├─ Resolve reference images
  │  ├─ Call Whisk API (generateImage)
  │  ├─ Handle 429/content policy → auto-sanitize + retry
  │  ├─ Save image to C:\...\images\{sceneId}.jpg
  │  ├─ Update scene.image_url in database
  │  └─ Record in generation_history
  └─ When all scenes done:
       ├─ Update job status 'generating_images' → 'review_assets'
       ├─ STOP: Wait for human review (MANDATORY QA PAUSE)
       └─ UI: Show storyboard editor for human to review/edit
            ↓
USER REVIEWS STORYBOARD (in UI)
  ├─ Can edit headlines + prompts per scene
  ├─ Can upload custom images
  ├─ Can regenerate individual scenes
  └─ MUST launch HeyGen to create avatar (manual workflow)
       ↓
USER UPLOADS AVATAR MP4
  └─ POST /api/jobs/:id/compile
       ├─ Validate + save avatar to C:\...\avatars\{timestamp}.mp4
       ├─ Update job.avatar_mp4_url
       ├─ Update job status 'review_assets' → 'rendering'
       └─ Queue: Add to queue_render
            ↓
RENDER WORKER (render.worker.ts)
  ├─ Fetch job + all scenes
  ├─ Validate + prepare assets (copy to public/images/)
  ├─ Calculate pacing algorithm (hook/body)
  ├─ Call renderNewsVideo() (Remotion)
  │  ├─ NewsVideo composition
  │  ├─ Scene components (Ken Burns effect)
  │  ├─ Avatar overlay (bottom-right)
  │  ├─ Ticker overlay (scrolling headlines)
  │  └─ Output: 1920x1080, 30fps, MP4
  ├─ Save to C:\...\videos\{jobId}.mp4
  ├─ Update job status 'rendering' → 'completed'
  ├─ Update job.final_video_url
  └─ Record metrics (render_time_ms, file_size, duration)
       ↓
USER DOWNLOADS VIDEO
  └─ GET /api/media/serve (stream or download)
```

---

## INTEGRATION POINTS

### Google Whisk API (Image Generation)
- **Endpoint:** `https://aisandbox-pa.googleapis.com/v1/whisk:generateImage`
- **Authentication:** Bearer token (expires ~1 hour)
- **Token Refresh:**
  1. Primary: Browser extension (fast, no browser overhead)
  2. Fallback: Playwright automation (opens labs.google.com/whisk, extracts token)
- **Request:** JSON with prompt, aspect ratio, reference images
- **Response:** Base64-encoded image
- **Rate Limiting:** Adaptive (2-8 concurrent requests based on 429 errors)
- **Handling:** Content policy violations trigger prompt auto-sanitization + retry

### HeyGen Avatar Generation
- **Mode:** Manual only (no automation - HeyGen blocks bots)
- **Workflow:**
  1. UI button: "LAUNCH HEYGEN BROWSER" opens `https://heygen.com`
  2. User manually creates avatar
  3. User downloads MP4
  4. User uploads via `/compile` route
  5. System saves to `C:\...\avatars\`

### Remotion Video Rendering
- **Input:** NewsVideo composition with scenes + avatar + ticker
- **Output:** MP4 (1920x1080, 30fps, H.264)
- **Asset Flow:**
  1. Images copied from storage → `public/images/`
  2. Avatar optimized to 640x360 via FFmpeg
  3. Remotion renders all Sequence components
  4. Output saved to `C:\...\videos\`

### AI Providers (Analysis)
- **OpenAI:** GPT-4 Turbo (JSON mode, 120s timeout)
- **Claude:** Anthropic Claude (JSON mode, 120s timeout)
- **Google:** Gemini (JSON mode, 120s timeout)
- **Groq:** LLaMA (JSON mode, 120s timeout)
- **Request Format:** System prompt + user prompt (with script segments + style context)
- **Response:** JSON with scenes array (id, image_prompt, ticker_headline, narrative_position, shot_type)

### OpenAI Whisper (Transcription)
- **Optional:** If user uploads video with audio, transcribe for word-level timings
- **API:** `POST https://api.openai.com/v1/audio/transcriptions`
- **Output:** Array of word timestamps (start_time, end_time, word)

### Pexels Stock Video API
- **Purpose:** Optional stock footage integration
- **Endpoint:** `https://api.pexels.com/videos/search`
- **Usage:** MCP server for fetching background footage

---

## DESIGN SYSTEM

**Philosophy:** Modern, clean, professional dark UI optimized for quick video production workflows

### Color Palette
- **Background:** `#1a1a1a` (surface)
- **Card Backgrounds:** `#252525` (surface_container)
- **Primary Text:** `#FFFFFF`
- **Secondary Text:** `#b3b3b3` (on-surface-variant)
- **Accent:** `#E63946` (red, for critical actions/ticker)
- **Success:** `#22c55e` (green)
- **Warning:** `#f59e0b` (amber)
- **Info:** `#3b82f6` (blue)

### Typography
- **Sans-serif:** Inter (all weights)
- **Monospace:** Roboto Mono (data, timestamps)
- **Default font size:** 14px (body), 16px (inputs)

### Border Radius
- **Small elements** (badges, inputs): 8px
- **Cards/containers:** 12px
- **Buttons:** 8px
- **Pills:** 9999px (fully rounded)

### Shadows
- `shadow-sm`: Subtle (inputs)
- `shadow`: Standard (cards)
- `shadow-md`: Important elements
- `shadow-lg`: Modals, focused states
- `shadow-xl`: Dropdowns, popovers

### Spacing
- **Grid:** 4px base unit
- **Padding:** 16px (standard), 8px (dense)
- **Gap:** 12px (grid), 8px (flex)
- **Margin:** Generous (reduced visual clutter)

---

## STATE MACHINE

Jobs progress through these states (enforced at DB + API level):

```
pending
  ↓
analyzing (AI script analysis)
  ↓
generating_images (Whisk API per-scene image generation)
  ↓
review_assets (MANDATORY QA pause for human review)
  ↓
rendering (Remotion video composition)
  ↓
completed (ready for download)

FAILURE: Any state → failed
CANCELLATION: Any state → cancelled
RETRY: failed → pending (re-queues from beginning)
```

**Critical:** `review_assets` is mandatory. No automated avatar generation (manual workflow required).

---

## CRITICAL IMPLEMENTATION NOTES

1. **Pacing Algorithm:** Frame-perfect timing in `pacing.ts`. Do not modify without full understanding.
2. **Asset Preparation:** Images MUST be copied to `public/images/` before Remotion render (prevents black screens).
3. **Avatar File Size:** Larger files cause Remotion timeout. Optimize with `optimize-avatar.sh` script.
4. **Token Expiry:** Whisk tokens expire hourly. Monitor for 401 errors and refresh via token-refresher.
5. **Storage Architecture:** All local (no R2/S3). Files stored in `C:\Users\konra\ObsidianNewsDesk\`.
6. **Database Transactions:** Critical state transitions use advisory locks to prevent race conditions.
7. **Rate Limiting:** Adaptive concurrency (2-8 workers) based on Whisk API 429 errors.
8. **Scene Timing:** Database can store scene timing from transcription (word_start_time, word_end_time) for fast pacing.

---

This comprehensive system map documents the entire Obsidian News Desk architecture as implemented in the production codebase (as of March 29, 2026). All file paths, method signatures, and data flows have been verified from actual source code.
