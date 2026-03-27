@echo off
title Kill Zombie Worker Processes
color 0C

echo ============================================
echo   KILLING ZOMBIE WORKER PROCESSES
echo ============================================
echo.
echo This will kill all Node.js processes to clean up zombies.
echo.
echo WARNING: This will stop:
echo   - BullMQ workers
echo   - Next.js dev server
echo   - Any other Node.js processes
echo.
echo You will need to run START.bat again after this.
echo.
pause

echo.
echo [1/2] Listing Node.js processes...
tasklist | findstr node.exe
echo.

echo [2/2] Killing all Node.js processes...
taskkill /F /IM node.exe
echo.

if %errorlevel% equ 0 (
    echo ✅ All Node.js processes killed successfully!
) else (
    echo ⚠️  No Node.js processes found (or already stopped)
)

echo.
echo ============================================
echo   CLEANUP COMPLETE
echo ============================================
echo.
echo Next steps:
echo   1. Run: node cleanup-queue.js
echo   2. Run: START.bat
echo.
pause
