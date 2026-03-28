@echo off
REM ========================================
REM Obsidian News Desk - Apply All Fixes
REM ========================================
REM
REM This script applies all critical fixes discovered during
REM initial setup. Run this once to fix:
REM   - Authentication issues (401 errors)
REM   - Missing database columns
REM   - CSP policy for Google Fonts
REM   - Docker healthcheck errors
REM   - Stale process cleanup
REM
REM Usage: Run from obsidian-news-desk\ directory
REM        FIX_ALL.bat
REM

echo.
echo ========================================
echo Obsidian News Desk - Fix Everything
echo ========================================
echo.
echo This will apply all critical fixes to:
echo   - Database schema
echo   - Authentication middleware
echo   - Security headers
echo   - Docker configuration
echo   - Startup scripts
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo [1/3] Applying database fixes...
echo.
call scripts\apply-critical-fixes.bat

echo.
echo [2/3] Applying code patches...
echo.
node scripts\patch-code-fixes.js

echo.
echo [3/3] Restarting services...
echo.
echo Stopping all services...
call STOP.bat 2>nul

timeout /t 3 /nobreak >nul

echo.
echo Starting services with fixes applied...
call START.bat

echo.
echo ========================================
echo All fixes applied successfully!
echo ========================================
echo.
echo The app should now be running at:
echo   http://localhost:8347
echo.
echo Check the browser for:
echo   - No 401 Unauthorized errors
echo   - No CSP violations in console
echo   - Jobs table loads correctly
echo   - Can submit new broadcasts
echo.
echo If you see any errors, check:
echo   - Docker Desktop is running
echo   - Ports 5432 and 6379 are not in use
echo   - .env file has valid API keys
echo.
pause
