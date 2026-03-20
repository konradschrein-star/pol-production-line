# Obsidian News Desk

Automated political video production pipeline with AI-driven script analysis, image generation, and professional video rendering.

## Architecture

5-node pipeline:
- **Node 1:** Multi-LLM Script Analyst (Claude/Google/Groq)
- **Node 2:** BullMQ Orchestrator (Redis queues)
- **Node 3:** Playwright Image Generator (Auto Whisk automation)
- **Node 4:** Storyboard Bridge API (Human-in-the-loop QA)
- **Node 5:** Remotion Render Engine (Video composition)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:
- Add your AI provider API keys
- Set Auto Whisk extension path (find in `edge://extensions/`)
- Update R2 public URL

### 3. Start Infrastructure

```bash
docker-compose up -d
```

### 4. Initialize Database

```bash
npm run init-db
```

### 5. Start Development Server

```bash
npm run dev
```

### 6. Start Workers

In a separate terminal:

```bash
npm run workers
```

## State Machine Workflow

```
pending → analyzing → generating_images → review_assets → rendering → completed
                                              ↑
                                        HUMAN QA PAUSE
```

## Tech Stack

- **Backend:** TypeScript, Next.js 14 App Router
- **Database:** PostgreSQL 16 (Docker)
- **Queue:** Redis 7 + BullMQ (Docker)
- **Storage:** Cloudflare R2
- **Automation:** Playwright (Edge + Auto Whisk extension)
- **Video:** Remotion 4
- **Frontend:** React, TailwindCSS (Brutalist design system)

## Development Commands

- `npm run dev` - Start Next.js development server
- `npm run workers` - Start BullMQ workers
- `npm run init-db` - Initialize database schema
- `npm run build` - Build for production
- `npm run start` - Start production server

## Docker Services

- **Postgres:** `localhost:5432`
- **Redis:** `localhost:6379`

Health checks included. Use `docker-compose logs` to monitor.

## Design System

High-end editorial brutalism:
- 0px border radius everywhere
- No box shadows (depth via tonal layering)
- Achromatic palette (#131313 to #FFFFFF)
- Inter font, Roboto Mono for data
- Subtle grain overlay (0.03 opacity)

See `stitch (1)/stitch/obsidian_gazette/DESIGN.md` for complete spec.

## Project Structure

```
obsidian-news-desk/
├── src/
│   ├── app/                  # Next.js App Router
│   ├── lib/
│   │   ├── db/              # Database client
│   │   ├── queue/           # BullMQ setup
│   │   ├── ai/              # Multi-LLM providers
│   │   ├── browser/         # Playwright automation
│   │   ├── storage/         # R2 uploads
│   │   └── remotion/        # Video rendering
│   ├── components/          # React components
│   └── types/               # TypeScript types
├── scripts/                 # Utility scripts
└── docker-compose.yml       # Infrastructure
```

## Implementation Status

- ✅ Phase 1: Foundation (Next.js, Docker, DB, Queues)
- ⏳ Phase 2: Node 1 - AI Script Analyst
- ⏳ Phase 3: Node 3 - Playwright Image Generator
- ⏳ Phase 4: Node 4 - Storyboard Bridge API
- ⏳ Phase 5: Node 5 - Remotion Render Engine
- ⏳ Phase 6: Frontend UI Conversion
- ⏳ Phase 7: End-to-End Testing

## License

Private project for internal use.
