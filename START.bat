@echo off
setlocal enabledelayedexpansion
title Obsidian News Desk - Launcher
color 0B

echo ============================================
echo   OBSIDIAN NEWS DESK - STARTING...
echo ============================================
echo.

REM ============================================
REM Step 1: Run Setup Validation
REM ============================================
echo [1/6] Validating system requirements...
echo.

call npm run setup
if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo   SETUP VALIDATION FAILED
    echo ============================================
    echo.
    echo Please fix the issues above and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo System validation passed!
echo.

REM ============================================
REM Step 2: Start Docker Services
REM ============================================
echo [2/6] Starting Docker services (Postgres + Redis)...
echo.

docker-compose up -d
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start Docker services!
    echo.
    echo Troubleshooting:
    echo   1. Make sure Docker Desktop is running
    echo   2. Check if ports 5432 and 6379 are available
    echo   3. Try: docker-compose down ^&^& docker-compose up -d
    echo.
    pause
    exit /b 1
)

echo Docker services started.
echo.

REM ============================================
REM Step 3: Wait for Services to be Healthy
REM ============================================
echo [3/6] Waiting for services to be ready...
echo.

set RETRY_COUNT=0
set MAX_RETRIES=30

:WAIT_LOOP
set /a RETRY_COUNT+=1

REM Check if Postgres is ready
docker-compose exec -T postgres pg_isready -U obsidian >nul 2>&1
set POSTGRES_READY=%errorlevel%

REM Check if Redis is ready
docker-compose exec -T redis redis-cli ping >nul 2>&1
set REDIS_READY=%errorlevel%

if %POSTGRES_READY% equ 0 if %REDIS_READY% equ 0 (
    echo Services are ready!
    echo.
    goto SERVICES_READY
)

if %RETRY_COUNT% geq %MAX_RETRIES% (
    echo.
    echo ERROR: Services failed to start within 30 seconds
    echo.
    echo Check Docker logs:
    echo   docker-compose logs postgres
    echo   docker-compose logs redis
    echo.
    pause
    exit /b 1
)

timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:SERVICES_READY

REM ============================================
REM Step 4: Initialize Database Schema
REM ============================================
echo [4/6] Checking database schema...
echo.

REM Check if database is initialized by trying a simple query
npm run init-db
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Database initialization had issues
    echo Continuing anyway (might be already initialized)
    echo.
)

echo Database ready.
echo.

REM ============================================
REM Step 5: Start BullMQ Workers
REM ============================================
echo [5/6] Starting BullMQ workers...
echo.

start "Workers - Obsidian News Desk" cmd /k "title Workers - Obsidian News Desk && npx tsx scripts/start-workers.ts"

REM Wait for workers to initialize
timeout /t 3 /nobreak >nul

echo Workers started in separate window.
echo.

REM ============================================
REM Step 6: Start Web Interface
REM ============================================
echo [6/6] Starting web interface...
echo.

start "Web UI - Obsidian News Desk" cmd /k "title Web UI - Obsidian News Desk && npm run dev"

REM Wait for Next.js to compile
timeout /t 10 /nobreak >nul

echo Web interface starting...
echo.

REM ============================================
REM Success Summary
REM ============================================
echo ============================================
echo   SYSTEM STARTED SUCCESSFULLY!
echo ============================================
echo.
echo   Web Interface: http://localhost:8347
echo.
echo   3 components are now running:
echo   1. Docker services (Postgres + Redis) - background
echo   2. Workers window (keep open) - processing jobs
echo   3. Web UI window (keep open) - user interface
echo.
echo   Your browser will open in 5 seconds...
echo.
echo   To stop the system, run STOP.bat
echo.
echo ============================================
echo   KEYBOARD SHORTCUTS
echo ============================================
echo.
echo   Ctrl+R        Refresh job list
echo   Ctrl+Enter    Approve and render (in storyboard)
echo   Ctrl+S        Save changes (in editors)
echo.
echo ============================================
echo.

REM Wait and open browser
timeout /t 5 /nobreak >nul
start http://localhost:8347

echo Browser opened. You can now close this window.
echo The Workers and Web UI windows must stay open!
echo.
pause
