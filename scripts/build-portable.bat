@echo off
title Building Portable Package for Distribution
color 0B

echo ============================================
echo   OBSIDIAN NEWS DESK - PORTABLE BUILD
echo ============================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo ERROR: node_modules not found!
    echo Please run: npm install
    pause
    exit /b 1
)

echo [1/5] Building Next.js production app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Next.js build failed!
    pause
    exit /b 1
)
echo ✅ Next.js build complete
echo.

echo [2/5] Creating distribution folder...
if exist "dist-portable\" rmdir /s /q "dist-portable\"
mkdir dist-portable
mkdir dist-portable\obsidian-news-desk
echo ✅ Distribution folder created
echo.

echo [3/5] Copying files...

REM Core application files
xcopy /E /I /Y /Q ".next" "dist-portable\obsidian-news-desk\.next\"
xcopy /E /I /Y /Q "public" "dist-portable\obsidian-news-desk\public\"
xcopy /E /I /Y /Q "src" "dist-portable\obsidian-news-desk\src\"
xcopy /E /I /Y /Q "scripts" "dist-portable\obsidian-news-desk\scripts\"

REM Configuration files
copy /Y "package.json" "dist-portable\obsidian-news-desk\"
copy /Y "package-lock.json" "dist-portable\obsidian-news-desk\"
copy /Y "next.config.mjs" "dist-portable\obsidian-news-desk\"
copy /Y "tsconfig.json" "dist-portable\obsidian-news-desk\"
copy /Y "tailwind.config.ts" "dist-portable\obsidian-news-desk\"
copy /Y "postcss.config.mjs" "dist-portable\obsidian-news-desk\"
copy /Y ".env.example" "dist-portable\obsidian-news-desk\"

REM Docker configuration
copy /Y "docker-compose.yml" "dist-portable\obsidian-news-desk\"
copy /Y ".dockerignore" "dist-portable\obsidian-news-desk\" 2>nul

REM Startup scripts
copy /Y "START.bat" "dist-portable\obsidian-news-desk\"
copy /Y "STOP.bat" "dist-portable\obsidian-news-desk\"

REM Documentation
copy /Y "README_FOR_FRIEND.md" "dist-portable\README.md"
copy /Y "CHROME_EXTENSION_SETUP.md" "dist-portable\CHROME_EXTENSION_SETUP.md"
copy /Y "CLAUDE.md" "dist-portable\obsidian-news-desk\CLAUDE.md" 2>nul

REM Chrome extension
if exist "chrome-extension\" (
    xcopy /E /I /Y /Q "chrome-extension" "dist-portable\chrome-extension\"
    echo ✅ Chrome extension included
) else (
    echo ⚠️  Chrome extension folder not found - skipping
)

echo ✅ Files copied
echo.

echo [4/5] Creating INSTALL.txt...
(
echo OBSIDIAN NEWS DESK - INSTALLATION INSTRUCTIONS
echo ==============================================
echo.
echo STEP 1: Install Prerequisites
echo   1. Docker Desktop - https://www.docker.com/products/docker-desktop/
echo   2. Node.js 20+ LTS - https://nodejs.org/
echo   3. Google Chrome - For Whisk token extension
echo.
echo STEP 2: Extract This Package
echo   Extract to: C:\ObsidianNewsDesk\
echo   ^(or any location you prefer^)
echo.
echo STEP 3: Install Dependencies
echo   Open Command Prompt in obsidian-news-desk folder:
echo   cd C:\ObsidianNewsDesk\obsidian-news-desk
echo   npm install
echo.
echo STEP 4: Configure Environment
echo   1. Copy .env.example to .env
echo   2. Add your API keys ^(see README.md^)
echo.
echo STEP 5: Initialize Database
echo   npm run init-db
echo.
echo STEP 6: Install Chrome Extension
echo   See: CHROME_EXTENSION_SETUP.md
echo.
echo STEP 7: Start System
echo   Double-click: START.bat
echo.
echo For full instructions, see: README.md
) > "dist-portable\INSTALL.txt"
echo ✅ Installation guide created
echo.

echo [5/5] Creating ZIP archive...
powershell -Command "Compress-Archive -Path 'dist-portable\*' -DestinationPath 'ObsidianNewsDesk-Portable.zip' -Force"
if %errorlevel% neq 0 (
    echo ERROR: ZIP creation failed!
    echo Portable files are in: dist-portable\
    pause
    exit /b 1
)
echo ✅ ZIP created: ObsidianNewsDesk-Portable.zip
echo.

REM Calculate size
for %%A in (ObsidianNewsDesk-Portable.zip) do set size=%%~zA
set /a sizeMB=%size% / 1048576
echo.
echo ============================================
echo   BUILD COMPLETE!
echo ============================================
echo.
echo 📦 Package: ObsidianNewsDesk-Portable.zip
echo 💾 Size: %sizeMB% MB
echo 📁 Contents: dist-portable\
echo.
echo Your friend can now:
echo   1. Extract ZIP
echo   2. Follow INSTALL.txt
echo   3. Run START.bat
echo   4. Create videos!
echo.
echo ============================================
pause
