@echo off
setlocal enabledelayedexpansion
title Obsidian News Desk - Launcher
color 0B

echo ============================================
echo   OBSIDIAN NEWS DESK - STARTING...
echo ============================================
echo.

REM ============================================
REM Step 1: Start Docker Services FIRST
REM ============================================
echo [1/5] Starting Docker services (Postgres + Redis)...
echo.

docker compose up -d
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start Docker services!
    echo.
    echo Troubleshooting:
    echo   1. Make sure Docker Desktop is running
    echo   2. Check if ports 5432 and 6379 are available
    echo   3. Try: docker compose down ^&^& docker compose up -d
    echo.
    pause
    exit /b 1
)

echo Docker services started.
echo.

REM ============================================
REM Step 2: Wait for Services to be Healthy
REM ============================================
echo [2/5] Waiting for services to be ready...
echo.

set RETRY_COUNT=0
set MAX_RETRIES=30

:WAIT_LOOP
set /a RETRY_COUNT+=1

REM Check if Postgres is ready
docker exec obsidian-postgres pg_isready -U obsidian -d obsidian_news >nul 2>&1
set POSTGRES_READY=%errorlevel%

REM Check if Redis is ready
docker exec obsidian-redis redis-cli -a obsidian_redis_password ping >nul 2>&1
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
    echo   docker logs obsidian-postgres
    echo   docker logs obsidian-redis
    echo.
    pause
    exit /b 1
)

timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:SERVICES_READY

REM ============================================
REM Step 3: Ensure Database Schema Exists
REM ============================================
echo [3/5] Checking database schema...
echo.

REM Run init-db (it's idempotent, safe to run multiple times)
call npm run init-db >nul 2>&1
if %errorlevel% neq 0 (
    echo Database schema check complete.
) else (
    echo Database initialized.
)

REM Run migrations to ensure all columns exist
call npm run migrate >nul 2>&1

echo Database ready.
echo.

REM ============================================
REM Step 4: Start BullMQ Workers
REM ============================================
echo [4/5] Starting BullMQ workers...
echo.

start "Workers - Obsidian News Desk" cmd /k "title Workers - Obsidian News Desk && npm run workers"

REM Wait for workers to initialize
timeout /t 3 /nobreak >nul

echo Workers started in separate window.
echo.

REM ============================================
REM Step 5: Start Web Interface
REM ============================================
echo [5/5] Starting web interface...
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
