@echo off
title Obsidian News Desk - First-Time Setup
color 0A

echo ============================================
echo   OBSIDIAN NEWS DESK - FIRST-TIME SETUP
echo ============================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo.

echo [2/4] Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker not found!
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
docker --version
echo.

echo [3/4] Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.

echo [4/4] Pulling Docker images...
docker-compose pull
if %errorlevel% neq 0 (
    echo ERROR: Docker pull failed!
    pause
    exit /b 1
)
echo.

echo ============================================
echo   SETUP COMPLETE!
echo ============================================
echo.
echo Next steps:
echo 1. Make sure AutoWhisk extension is installed in Chrome/Edge
echo 2. Log into Google Wisk in your browser
echo 3. Copy .env.example to .env and configure your API keys
echo 4. Run START.bat to launch the system
echo.
pause
