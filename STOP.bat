@echo off
title Obsidian News Desk - Shutdown
color 0C

echo ============================================
echo   OBSIDIAN NEWS DESK - STOPPING...
echo ============================================
echo.

echo [1/3] Stopping worker processes...
taskkill /FI "WINDOWTITLE eq Workers - Obsidian News Desk" /F >nul 2>&1
if %errorlevel% equ 0 (
    echo Workers stopped.
) else (
    echo Workers not running.
)
echo.

echo [2/3] Stopping web interface...
taskkill /FI "WINDOWTITLE eq Web UI - Obsidian News Desk" /F >nul 2>&1
if %errorlevel% equ 0 (
    echo Web interface stopped.
) else (
    echo Web interface not running.
)
echo.

echo [3/3] Stopping Docker services...
docker-compose down
if %errorlevel% equ 0 (
    echo Docker services stopped.
) else (
    echo Docker services not running.
)
echo.

echo ============================================
echo   SYSTEM STOPPED SUCCESSFULLY!
echo ============================================
echo.
pause
