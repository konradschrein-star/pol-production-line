@echo off
REM Apply Critical Fixes for Obsidian News Desk
REM Run this from obsidian-news-desk\ directory

echo ========================================
echo Obsidian News Desk - Critical Fixes
echo ========================================
echo.

REM Check Docker
docker ps >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Docker is not running. Please start Docker Desktop.
  exit /b 1
)

echo [OK] Docker is running
echo.

echo Applying database fixes...
echo.

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE; CREATE INDEX IF NOT EXISTS idx_news_jobs_completed ON news_jobs(completed_at) WHERE completed_at IS NOT NULL;"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_scenes ADD COLUMN IF NOT EXISTS sentence_text TEXT;"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_scenes ADD COLUMN IF NOT EXISTS narrative_position VARCHAR(50);"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_scenes ADD COLUMN IF NOT EXISTS shot_type VARCHAR(50);"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_scenes ADD COLUMN IF NOT EXISTS visual_continuity_notes TEXT;"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_scenes ADD COLUMN IF NOT EXISTS reference_images JSONB;"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_scenes ADD COLUMN IF NOT EXISTS generation_params JSONB;"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_scenes ADD COLUMN IF NOT EXISTS whisk_request_id VARCHAR(255);"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS render_logs JSONB DEFAULT '[]'::jsonb;"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "ALTER TABLE news_jobs ADD COLUMN IF NOT EXISTS job_metadata JSONB DEFAULT '{}'::jsonb;"

echo.
echo Resetting failed jobs...
echo.

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "UPDATE news_jobs SET status = 'review_assets', error_message = NULL, render_logs = '[]'::jsonb WHERE status = 'failed' AND error_message LIKE '%%column%%';"

docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "UPDATE news_scenes SET generation_status = 'pending', error_message = NULL, retry_count = 0 WHERE generation_status = 'failed' AND error_message LIKE '%%column%%';"

echo.
echo ========================================
echo Database fixes applied successfully!
echo ========================================
echo.
echo NEXT STEPS:
echo   1. Apply code patches (see FIXES_IMPLEMENTATION_PLAN.md)
echo   2. Restart services: STOP.bat then START.bat
echo   3. Test at http://localhost:8347
echo.
pause
