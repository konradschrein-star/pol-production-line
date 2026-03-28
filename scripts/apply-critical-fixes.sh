#!/bin/bash
# Apply Critical Fixes for Obsidian News Desk
# Run this from obsidian-news-desk/ directory

set -e  # Exit on error

echo "========================================"
echo "Obsidian News Desk - Critical Fixes"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! docker ps > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
  exit 1
fi

if ! docker exec obsidian-postgres pg_isready -U obsidian -d obsidian_news > /dev/null 2>&1; then
  echo -e "${RED}❌ PostgreSQL is not ready. Please run 'docker compose up -d' first.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# ======================
# FIX 1: Database Schema
# ======================
echo "🔧 Applying database fixes..."

docker exec obsidian-postgres psql -U obsidian -d obsidian_news <<'EOSQL'
-- Fix 2.1: Add completed_at column
ALTER TABLE news_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_news_jobs_completed
ON news_jobs(completed_at)
WHERE completed_at IS NOT NULL;

-- Validate scene columns (should already exist from previous session)
DO $$
BEGIN
  -- sentence_text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_scenes' AND column_name = 'sentence_text') THEN
    ALTER TABLE news_scenes ADD COLUMN sentence_text TEXT;
  END IF;

  -- narrative_position
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_scenes' AND column_name = 'narrative_position') THEN
    ALTER TABLE news_scenes ADD COLUMN narrative_position VARCHAR(50);
  END IF;

  -- shot_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_scenes' AND column_name = 'shot_type') THEN
    ALTER TABLE news_scenes ADD COLUMN shot_type VARCHAR(50);
  END IF;

  -- visual_continuity_notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_scenes' AND column_name = 'visual_continuity_notes') THEN
    ALTER TABLE news_scenes ADD COLUMN visual_continuity_notes TEXT;
  END IF;

  -- reference_images
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_scenes' AND column_name = 'reference_images') THEN
    ALTER TABLE news_scenes ADD COLUMN reference_images JSONB;
  END IF;

  -- generation_params
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_scenes' AND column_name = 'generation_params') THEN
    ALTER TABLE news_scenes ADD COLUMN generation_params JSONB;
  END IF;

  -- whisk_request_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_scenes' AND column_name = 'whisk_request_id') THEN
    ALTER TABLE news_scenes ADD COLUMN whisk_request_id VARCHAR(255);
  END IF;

  -- render_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_jobs' AND column_name = 'render_logs') THEN
    ALTER TABLE news_jobs ADD COLUMN render_logs JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- job_metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'news_jobs' AND column_name = 'job_metadata') THEN
    ALTER TABLE news_jobs ADD COLUMN job_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Reset failed jobs that were blocked by missing columns
UPDATE news_jobs
SET status = 'review_assets',
    error_message = NULL,
    render_logs = '[]'::jsonb
WHERE status = 'failed'
  AND (error_message LIKE '%render_logs%'
       OR error_message LIKE '%column%does not exist%');

UPDATE news_scenes
SET generation_status = 'pending',
    error_message = NULL,
    retry_count = 0
WHERE generation_status = 'failed'
  AND error_message LIKE '%column%does not exist%';

EOSQL

echo -e "${GREEN}✅ Database fixes applied${NC}"
echo ""

# ======================
# FIX 2: Code Patches
# ======================
echo "🔧 Applying code fixes..."

# Check if middleware needs patching
if ! grep -q "isBrowserRequest" src/middleware.ts; then
  echo -e "${YELLOW}⚠️  Middleware needs manual patch (see FIXES_IMPLEMENTATION_PLAN.md Fix 1.1)${NC}"
  echo "   File: src/middleware.ts (line ~280)"
else
  echo -e "${GREEN}✅ Middleware already patched${NC}"
fi

# Check if CSP needs patching
if ! grep -q "fonts.googleapis.com" src/lib/security/headers.ts; then
  echo -e "${YELLOW}⚠️  CSP headers need manual patch (see FIXES_IMPLEMENTATION_PLAN.md Fix 1.2)${NC}"
  echo "   File: src/lib/security/headers.ts (line 23)"
else
  echo -e "${GREEN}✅ CSP headers already patched${NC}"
fi

# Check if docker-compose healthcheck needs fixing
if ! grep -q "pg_isready -U obsidian -d obsidian_news" docker-compose.yml; then
  echo -e "${YELLOW}⚠️  Docker healthcheck needs manual patch (see FIXES_IMPLEMENTATION_PLAN.md Fix 2.2)${NC}"
  echo "   File: docker-compose.yml (line 17)"
else
  echo -e "${GREEN}✅ Docker healthcheck already patched${NC}"
fi

echo ""

# ======================
# FIX 3: Validation
# ======================
echo "🔍 Validating fixes..."

# Count columns
SCENE_COLS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c \
  "SELECT COUNT(*) FROM information_schema.columns \
   WHERE table_name = 'news_scenes' \
   AND column_name IN ('sentence_text', 'narrative_position', 'shot_type', \
                       'visual_continuity_notes', 'reference_images', \
                       'generation_params', 'whisk_request_id');")

JOB_COLS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c \
  "SELECT COUNT(*) FROM information_schema.columns \
   WHERE table_name = 'news_jobs' \
   AND column_name IN ('render_logs', 'job_metadata', 'completed_at');")

if [ $(echo "$SCENE_COLS" | tr -d ' ') -eq 7 ]; then
  echo -e "${GREEN}✅ All 7 scene columns present${NC}"
else
  echo -e "${RED}❌ Missing scene columns (expected 7, found $SCENE_COLS)${NC}"
fi

if [ $(echo "$JOB_COLS" | tr -d ' ') -eq 3 ]; then
  echo -e "${GREEN}✅ All 3 job columns present${NC}"
else
  echo -e "${RED}❌ Missing job columns (expected 3, found $JOB_COLS)${NC}"
fi

echo ""
echo "========================================"
echo "✅ Database fixes applied successfully!"
echo "========================================"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "   1. Check warnings above for code patches"
echo "   2. Apply patches from FIXES_IMPLEMENTATION_PLAN.md"
echo "   3. Restart services: STOP.bat && START.bat"
echo "   4. Test at http://localhost:8347"
echo ""
