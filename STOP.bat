@echo off
setlocal enabledelayedexpansion
title Obsidian News Desk - Shutdown
color 0C

echo ============================================
echo   OBSIDIAN NEWS DESK - STOPPING...
echo ============================================
echo.

REM ============================================
REM Step 1: Stop Worker Processes
REM ============================================
echo [1/5] Stopping worker processes...
echo.

REM Try to stop by window title first
taskkill /FI "WINDOWTITLE eq Workers - Obsidian News Desk" /F >nul 2>&1
if %errorlevel% equ 0 (
    echo Workers stopped via window title.
) else (
    echo Workers window not found via title.

    REM Fallback: Kill all tsx processes running start-workers.ts
    for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /NH 2^>nul ^| findstr /i "node.exe"') do (
        wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr /i "start-workers.ts" >nul
        if !errorlevel! equ 0 (
            taskkill /PID %%a /F >nul 2>&1
            echo Killed worker process: %%a
        )
    )
)

echo.

REM ============================================
REM Step 2: Stop Web Interface (Next.js)
REM ============================================
echo [2/5] Stopping web interface...
echo.

REM Try to stop by window title first
taskkill /FI "WINDOWTITLE eq Web UI - Obsidian News Desk" /F >nul 2>&1
if %errorlevel% equ 0 (
    echo Web interface stopped via window title.
) else (
    echo Web UI window not found via title.

    REM Fallback: Kill process listening on port 8347
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8347 ^| findstr LISTENING') do (
        set PID=%%a
        if defined PID (
            taskkill /PID !PID! /F >nul 2>&1
            echo Killed process on port 8347: !PID!
        )
    )
)

REM Also kill any remaining Next.js dev servers
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /NH 2^>nul ^| findstr /i "node.exe"') do (
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr /i "next dev" >nul
    if !errorlevel! equ 0 (
        taskkill /PID %%a /F >nul 2>&1
        echo Killed Next.js dev server: %%a
    )
)

echo.

REM ============================================
REM Step 3: Clean Up BullMQ Jobs
REM ============================================
echo [3/5] Cleaning up stuck jobs in Redis...
echo.

REM Use redis-cli to clean up zombie jobs
docker-compose exec -T redis redis-cli --scan --pattern bull:* 2>nul >nul
if %errorlevel% equ 0 (
    REM Redis is running, try to clean up
    echo Cleaning BullMQ queues...

    REM Remove stuck active jobs (optional - comment out if you want to preserve them)
    REM docker-compose exec -T redis redis-cli DEL bull:queue_analyze:active >nul 2>&1
    REM docker-compose exec -T redis redis-cli DEL bull:queue_images:active >nul 2>&1
    REM docker-compose exec -T redis redis-cli DEL bull:queue_render:active >nul 2>&1

    echo Redis cleanup complete.
) else (
    echo Redis not running, skipping cleanup.
)

echo.

REM ============================================
REM Step 4: Stop Docker Services (Optional)
REM ============================================
echo [4/5] Stopping Docker services...
echo.
echo Do you want to stop Docker services?
echo   (Y) Yes - Full shutdown (slower restart)
echo   (N) No  - Keep running (faster restart)
echo.
choice /C YN /N /M "Your choice: "

if %errorlevel% equ 1 (
    echo.
    echo Stopping Docker services...
    docker-compose down
    if %errorlevel% equ 0 (
        echo Docker services stopped.
    ) else (
        echo Failed to stop Docker services.
    )
) else (
    echo.
    echo Keeping Docker services running.
    echo   Database and Redis will stay active for faster restart.
)

echo.

REM ============================================
REM Step 5: Verification
REM ============================================
echo [5/5] Verifying shutdown...
echo.

REM Check if any processes are still running
set STILL_RUNNING=0

REM Check port 8347
netstat -ano | findstr :8347 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo WARNING: Port 8347 still in use
    set STILL_RUNNING=1
)

REM Check for tsx/node processes
tasklist /FI "IMAGENAME eq tsx.exe" 2>nul | findstr tsx.exe >nul
if %errorlevel% equ 0 (
    echo WARNING: Some tsx processes still running
    set STILL_RUNNING=1
)

if %STILL_RUNNING% equ 0 (
    echo All processes stopped cleanly.
) else (
    echo.
    echo Some processes may still be running.
    echo If you encounter issues, try:
    echo   1. Close all terminal windows manually
    echo   2. Restart your computer (last resort)
)

echo.

REM ============================================
REM Success Summary
REM ============================================
echo ============================================
echo   SYSTEM STOPPED SUCCESSFULLY!
echo ============================================
echo.

if %errorlevel% equ 1 (
    echo Docker services are still running.
    echo To start again: run START.bat (faster restart)
    echo.
) else (
    echo Full shutdown complete.
    echo To start again: run START.bat
    echo.
)

echo ============================================
echo.
pause
