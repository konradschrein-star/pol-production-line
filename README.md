# Obsidian News Desk - Automated Video Production Pipeline

An automated video production system for generating news broadcasts with AI-driven script analysis, automated image generation, human-in-the-loop review, and video rendering.

## 🚀 Current Status

### ✅ Phases Complete (3/7)
- **Phase 1:** Foundation (Infrastructure)
- **Phase 2:** AI Script Analyst (Multi-LLM support)
- **Phase 3:** Playwright Image Generator (Auto Whisk automation)

### ⏳ Phases Remaining
- **Phase 4:** Storyboard Bridge API (Human review interface)
- **Phase 5:** Remotion Render Engine (Video composition)
- **Phase 6:** Frontend UI Conversion (React components)
- **Phase 7:** End-to-End Testing

---

## 🏗️ Architecture

### State Machine
```
pending → analyzing → generating_images → review_assets → rendering → completed
                                             ↑
                                       HUMAN QA PAUSE
```

### What's Working Now

**✅ Complete Automated Pipeline (Phases 1-3):**
1. Submit raw news script → API creates job
2. AI analyzes script → generates avatar script + scene breakdowns
3. Auto Whisk generates images → uploads to R2
4. Job reaches `review_assets` status → ready for human review

**⏳ Manual Steps (Until Phase 4-5 complete):**
- Human reviews images in database
- Human generates avatar video with HeyGen
- Human triggers final render (Phase 5 not yet implemented)

---

## 📦 Tech Stack

- **Backend:** TypeScript, Next.js 14
- **Database:** PostgreSQL 16 (Docker)
- **Queue:** Redis 7 + BullMQ (Docker)
- **Storage:** Cloudflare R2
- **Automation:** Playwright + Auto Whisk Chrome extension
- **AI:** Google Gemini Pro (Claude & Groq also supported)
- **Video:** Remotion 4 (Phase 5)

---

## 🚦 Quick Start

### 1. Install Prerequisites

- Docker Desktop
- Node.js 18+
- [Auto Whisk Extension](https://chromewebstore.google.com/detail/gedfnhdibkfgacmkbjgpfjihacalnlpn) (sign in with Google)

### 2. Setup Project

```bash
cd obsidian-news-desk

# Install dependencies
npm install

# Install Playwright
npx playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env: Add Google AI API key and R2 credentials

# Start Docker
docker-compose up -d

# Initialize database
npm run init-db
```

### 3. Run the Pipeline

**Terminal 1: Workers**
```bash
npm run workers
```

**Terminal 2: Next.js**
```bash
npm run dev
```

**Terminal 3: Test**
```bash
# Run complete test (AI + Images)
./test-phase3.sh

# Or create job manually
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"raw_script": "Your news script here..."}'
```

---

## 📚 Key Documentation

- **`IMPLEMENTATION_STATUS.md`** - Detailed progress tracker
- **`PHASE3_SETUP.md`** - Setup guide & troubleshooting
- **`CLAUDE.md`** - Project instructions for Claude Code

---

## 🗂️ Project Structure

```
src/
├── app/api/analyze/route.ts        # POST /api/analyze
├── lib/
│   ├── ai/                         # ✅ Multi-LLM providers
│   ├── browser/                    # ✅ Playwright automation
│   ├── storage/r2.ts               # ✅ Cloudflare R2 uploads
│   ├── queue/workers/
│   │   ├── analyze.worker.ts       # ✅ Phase 2
│   │   ├── images.worker.ts        # ✅ Phase 3
│   │   └── render.worker.ts        # ⏳ Phase 5 (stub)
│   └── db/schema.sql               # ✅ Database schema
scripts/
├── start-workers.ts                # ✅ Worker process manager
test-phase2.sh                      # ✅ Test AI analysis only
test-phase3.sh                      # ✅ Test complete pipeline
```

---

## 📊 Database

### `news_jobs`
- Tracks job status through workflow
- Stores avatar script and URLs

### `news_scenes`
- One record per scene/segment
- Contains image prompts, ticker headlines, image URLs
- Tracks individual image generation status

**View jobs:**
```bash
docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \
  "SELECT id, status, created_at FROM news_jobs ORDER BY created_at DESC LIMIT 5;"
```

---

## 🎨 Design System

**High-End Editorial Brutalism:**
- 0px border radius
- No shadows
- Achromatic palette
- Inter + Roboto Mono fonts
- Grain overlay texture

Reference: `stitch (1)/stitch/obsidian_gazette/DESIGN.md`

---

## 🔧 Environment Variables

```bash
# AI (google | claude | groq)
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your_key

# R2 Storage
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET=your_bucket
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Auto Whisk
AUTO_WHISK_EXTENSION_ID=gedfnhdibkfgacmkbjgpfjihacalnlpn

# Docker defaults work as-is
DATABASE_URL=postgresql://obsidian:obsidian_password@localhost:5433/obsidian_news
REDIS_HOST=localhost
REDIS_PORT=6380
```

---

## 🐛 Common Issues

**Workers won't start**
→ Check Docker: `docker-compose ps`

**Extension not found**
→ Install Auto Whisk from Chrome Web Store
→ Sign in with Google account

**Images not generating**
→ Verify extension is signed in
→ Check `~/Downloads/Wisk Downloads/` folder exists

**Database errors**
→ Run `docker-compose restart postgres`

---

## 📈 Performance

- **AI Analysis:** 10-30 seconds
- **Per Scene Image:** 30-60 seconds
- **Typical Job (6 scenes):** 5-10 minutes
- **Processing:** Sequential (concurrency: 1)

---

## 🛣️ Next Steps

1. ✅ **Test Current Pipeline:** Run `./test-phase3.sh`
2. **Phase 4:** Build REST API for human review interface
3. **Phase 5:** Implement Remotion video rendering
4. **Phase 6:** Convert UI mockups to React components
5. **Phase 7:** End-to-end testing

---

**Version:** 0.3.0 (Phases 1-3 Complete)
**Last Updated:** 2026-03-20

