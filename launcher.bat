@echo off
REM ============================================================
REM Obsidian News Desk - Portable Launcher
REM
REM Standalone launcher for portable execution without Electron.
REM Uses bundled Node.js runtime from resources/node/
REM
REM USAGE:
REM   launcher.bat          Start all services
REM   launcher.bat stop     Stop all services
REM
REM TARGET USERS:
REM   - Advanced users who prefer command-line control
REM   - Developers testing portable mode
REM   - CI/CD environments
REM
REM REGULAR USERS: Use the Electron desktop app instead
REM ============================================================

echo.
echo ============================================================
echo   Obsidian News Desk - Launcher Starting...
echo ============================================================
echo.

setlocal enabledelayedexpansion

REM Get script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check for stop command
if "%1"=="stop" (
    echo Stopping Obsidian News Desk services...
    call STOP.bat
    exit /b 0
)

REM ============================================================
REM Step 1: Resolve Node.js Runtime
REM ============================================================
echo [1/5] Resolving Node.js runtime...

set "NODE_EXE="
set "NODE_SOURCE="

REM Check for bundled Node.js (production)
if exist "resources\node\node.exe" (
    set "NODE_EXE=%SCRIPT_DIR%resources\node\node.exe"
    set "NODE_SOURCE=bundled"
    echo   Found: Bundled Node.js at resources\node\node.exe
)

REM Check for bundled Node.js (Electron installer location)
if not defined NODE_EXE (
    if exist "%SCRIPT_DIR%..\..\node\node.exe" (
        set "NODE_EXE=%SCRIPT_DIR%..\..\node\node.exe"
        set "NODE_SOURCE=bundled"
        echo   Found: Bundled Node.js in app resources
    )
)

REM Fall back to system Node.js
if not defined NODE_EXE (
    where node >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%i in ('where node') do (
            set "NODE_EXE=%%i"
            set "NODE_SOURCE=system"
            echo   Warning: Using system Node.js (bundled runtime not found)            goto :node_found
        )
    )
)

:node_found
if not defined NODE_EXE (
    echo.
    echo ERROR: Node.js runtime not found!    echo.
    echo Please ensure either:
    echo   1. Bundled Node.js is present at resources\node\node.exe, OR
    echo   2. Node.js is installed on your system and available in PATH
    echo.
    echo Download Node.js: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

REM Verify Node.js version
for /f "tokens=*" %%i in ('"%NODE_EXE%" --version') do set "NODE_VERSION=%%i"
echo   Version: %NODE_VERSION% (source: %NODE_SOURCE%)

REM ============================================================
REM Step 2: Check Docker Desktop
REM ============================================================
echo.
echo [2/5] Checking Docker Desktop...
docker version >nul 2>&1
if !errorlevel! neq 0 (
    echo.
    echo ERROR: Docker is not running!    echo.
    echo Please start Docker Desktop and try again.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo   Docker is running

REM ============================================================
REM Step 3: Start Docker Compose
REM ============================================================
echo.
echo [3/5] Starting Docker Compose services...
docker-compose up -d
if !errorlevel! neq 0 (
    echo.
    echo ERROR: Failed to start Docker Compose!    echo.
    echo Check docker-compose.yml for errors or run: docker-compose logs
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo   Postgres and Redis started

REM ============================================================
REM Step 4: Start BullMQ Workers
REM ============================================================
echo.
echo [4/5] Starting BullMQ workers...
set "TSX_PATH=%SCRIPT_DIR%node_modules\tsx\dist\cli.mjs"
set "WORKER_SCRIPT=%SCRIPT_DIR%scripts\start-workers.ts"

start "BullMQ Workers" "%NODE_EXE%" "%TSX_PATH%" "%WORKER_SCRIPT%"

echo   Workers started in new window

REM ============================================================
REM Step 5: Start Next.js Server
REM ============================================================
echo.
echo [5/5] Starting Next.js server...
set "NEXT_BIN=%SCRIPT_DIR%node_modules\next\dist\bin\next"

start "Next.js Server" "%NODE_EXE%" "%NEXT_BIN%" dev -p 8347

echo   Next.js server started at http://localhost:8347

REM ============================================================
REM Open Browser
REM ============================================================
echo.
echo All services started successfully!echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul

start http://localhost:8347

echo.
echo Keep this window open. Press any key to stop all services...echo.
pause >nul

REM Stop services
echo.
echo Stopping services...
call STOP.bat

echo.
echo Services stopped. Press any key to exit...
pause >nul
exit /b 0
