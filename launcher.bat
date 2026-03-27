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

setlocal enabledelayedexpansion

REM Get script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Colors and formatting
set "COLOR_GREEN=[92m"
set "COLOR_YELLOW=[93m"
set "COLOR_RED=[91m"
set "COLOR_RESET=[0m"

REM Check for stop command
if "%1"=="stop" (
    echo %COLOR_YELLOW%Stopping Obsidian News Desk services...%COLOR_RESET%
    call STOP.bat
    exit /b 0
)

REM ============================================================
REM Step 1: Resolve Node.js Runtime
REM ============================================================
echo %COLOR_GREEN%[1/5] Resolving Node.js runtime...%COLOR_RESET%

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
            echo   %COLOR_YELLOW%Warning: Using system Node.js (bundled runtime not found)%COLOR_RESET%
            goto :node_found
        )
    )
)

:node_found
if not defined NODE_EXE (
    echo %COLOR_RED%ERROR: Node.js runtime not found!%COLOR_RESET%
    echo.
    echo Please ensure either:
    echo   1. Bundled Node.js is present at resources\node\node.exe, OR
    echo   2. Node.js is installed on your system and available in PATH
    echo.
    echo Download Node.js: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
    pause
    exit /b 1
)

REM Verify Node.js version
for /f "tokens=*" %%i in ('"%NODE_EXE%" --version') do set "NODE_VERSION=%%i"
echo   Version: %NODE_VERSION% (source: %NODE_SOURCE%)

REM ============================================================
REM Step 2: Check Docker Desktop
REM ============================================================
echo.
echo %COLOR_GREEN%[2/5] Checking Docker Desktop...%COLOR_RESET%

docker version >nul 2>&1
if !errorlevel! neq 0 (
    echo %COLOR_RED%ERROR: Docker is not running!%COLOR_RESET%
    echo.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo   Docker is running

REM ============================================================
REM Step 3: Start Docker Compose
REM ============================================================
echo.
echo %COLOR_GREEN%[3/5] Starting Docker Compose services...%COLOR_RESET%

docker-compose up -d
if !errorlevel! neq 0 (
    echo %COLOR_RED%ERROR: Failed to start Docker Compose!%COLOR_RESET%
    pause
    exit /b 1
)

echo   Postgres and Redis started

REM ============================================================
REM Step 4: Start BullMQ Workers
REM ============================================================
echo.
echo %COLOR_GREEN%[4/5] Starting BullMQ workers...%COLOR_RESET%

set "TSX_PATH=%SCRIPT_DIR%node_modules\tsx\dist\cli.mjs"
set "WORKER_SCRIPT=%SCRIPT_DIR%scripts\start-workers.ts"

start "BullMQ Workers" "%NODE_EXE%" "%TSX_PATH%" "%WORKER_SCRIPT%"

echo   Workers started in new window

REM ============================================================
REM Step 5: Start Next.js Server
REM ============================================================
echo.
echo %COLOR_GREEN%[5/5] Starting Next.js server...%COLOR_RESET%

set "NEXT_BIN=%SCRIPT_DIR%node_modules\next\dist\bin\next"

start "Next.js Server" "%NODE_EXE%" "%NEXT_BIN%" dev -p 8347

echo   Next.js server started at http://localhost:8347

REM ============================================================
REM Open Browser
REM ============================================================
echo.
echo %COLOR_GREEN%All services started successfully!%COLOR_RESET%
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul

start http://localhost:8347

echo.
echo %COLOR_YELLOW%Press any key to stop all services...%COLOR_RESET%
pause >nul

REM Stop services
call STOP.bat

exit /b 0
