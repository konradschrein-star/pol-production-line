@echo off
title Obsidian News Desk - Launcher
color 0B

echo ============================================
echo   OBSIDIAN NEWS DESK - STARTING...
echo ============================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and configure your settings.
    echo.
    pause
    exit /b 1
)

echo [1/4] Starting Docker services (Postgres + Redis)...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker services!
    echo Make sure Docker Desktop is running.
    pause
    exit /b 1
)
echo Docker services started.
echo.

echo [2/4] Waiting for database to be ready...
timeout /t 5 /nobreak >nul
echo.

echo [3/4] Starting BullMQ workers...
start "Workers - Obsidian News Desk" cmd /k "title Workers - Obsidian News Desk && npx tsx scripts/start-workers.ts"
timeout /t 3 /nobreak >nul
echo Workers started in separate window.
echo.

echo [4/4] Starting web interface...
start "Web UI - Obsidian News Desk" cmd /k "title Web UI - Obsidian News Desk && npm run dev"
timeout /t 5 /nobreak >nul
echo Web interface starting...
echo.

echo ============================================
echo   SYSTEM STARTED SUCCESSFULLY!
echo ============================================
echo.
echo   Web Interface: http://localhost:8347
echo.
echo   3 windows are now running:
echo   1. This launcher window (you can close this)
echo   2. Workers window (keep open)
echo   3. Web UI window (keep open)
echo.
echo   To stop the system, run STOP.bat
echo.

REM Wait 5 seconds then open browser
timeout /t 5 /nobreak
start http://localhost:8347

echo Browser opened. You can now close this window.
echo.
pause
