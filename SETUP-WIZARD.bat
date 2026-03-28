@echo off
title Obsidian News Desk - First-Time Setup Wizard
color 0B

echo.
echo ============================================
echo   OBSIDIAN NEWS DESK - SETUP WIZARD
echo ============================================
echo.
echo This wizard will guide you through first-time setup.
echo Estimated time: 5-10 minutes
echo.
pause

REM ============================================
REM STEP 1: Check Prerequisites
REM ============================================
echo.
echo ============================================
echo   STEP 1/6: Checking Prerequisites
echo ============================================
echo.

REM Check Docker
echo [1/3] Checking Docker Desktop...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found!
    echo.
    echo Please install Docker Desktop:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    echo After installing, restart your computer and run this wizard again.
    pause
    exit /b 1
)
echo ✅ Docker found

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop and wait for it to fully start.
    echo Look for the whale icon in your system tray - it should stop animating.
    echo.
    pause
    exit /b 1
)
echo ✅ Docker is running

REM Check Node.js
echo [2/3] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo.
    echo Please install Node.js 20+ LTS:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node --version') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 20 (
    echo ❌ Node.js version is too old! Found: v%NODE_MAJOR%
    echo Please install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 20+ found

REM Check npm
echo [3/3] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found!
    pause
    exit /b 1
)
echo ✅ npm found
echo.
echo ✅ All prerequisites met!
pause

REM ============================================
REM STEP 2: Install Dependencies
REM ============================================
echo.
echo ============================================
echo   STEP 2/6: Installing Dependencies
echo ============================================
echo.
echo This will take 2-3 minutes...
echo.

if exist "node_modules\" (
    echo Dependencies already installed, skipping...
) else (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ npm install failed!
        pause
        exit /b 1
    )
)
echo ✅ Dependencies installed
pause

REM ============================================
REM STEP 3: Configure Environment
REM ============================================
echo.
echo ============================================
echo   STEP 3/6: Configure API Keys
echo ============================================
echo.

if exist ".env" (
    echo .env file already exists.
    echo.
    choice /C YN /M "Do you want to reconfigure API keys"
    if errorlevel 2 goto skip_env
)

echo Creating .env file...
copy /Y ".env.example" ".env" >nul

echo.
echo ============================================
echo   Select AI Provider for Script Analysis
echo ============================================
echo.
echo   1. OpenAI (GPT-4) - Recommended
echo   2. Google (Gemini)
echo   3. Anthropic (Claude)
echo   4. Groq (Fast inference)
echo.
choice /C 1234 /N /M "Choose provider (1-4): "

set "AI_PROVIDER=openai"
set "PROVIDER_NAME=OpenAI"
set "KEY_PREFIX=sk-"

if errorlevel 4 (
    set "AI_PROVIDER=groq"
    set "PROVIDER_NAME=Groq"
    set "KEY_PREFIX=gsk_"
)
if errorlevel 3 (
    set "AI_PROVIDER=anthropic"
    set "PROVIDER_NAME=Anthropic"
    set "KEY_PREFIX=sk-ant-"
)
if errorlevel 2 (
    set "AI_PROVIDER=google"
    set "PROVIDER_NAME=Google AI"
    set "KEY_PREFIX=AIza"
)
if errorlevel 1 (
    set "AI_PROVIDER=openai"
    set "PROVIDER_NAME=OpenAI"
    set "KEY_PREFIX=sk-"
)

echo.
echo Selected: %PROVIDER_NAME%
echo.

REM Primary AI Provider Key (required)
echo Please enter your %PROVIDER_NAME% API key:
echo (Should start with "%KEY_PREFIX%...")
echo.
set /p PRIMARY_KEY="%PROVIDER_NAME% API Key (REQUIRED): "
if "%PRIMARY_KEY%"=="" (
    echo ❌ %PROVIDER_NAME% API key is required!
    pause
    exit /b 1
)

REM Whisk (required for image generation)
echo.
echo ============================================
echo   Whisk API Token (Required for Images)
echo ============================================
echo.
echo How to get Whisk token:
echo 1. Visit https://labs.google.com/whisk
echo 2. Press F12 to open Developer Tools
echo 3. Go to Network tab
echo 4. Generate a test image
echo 5. Find "generateImage" request
echo 6. Copy Authorization header value: Bearer ya29...
echo.
set /p WHISK_TOKEN="Whisk API Token (paste full Bearer token): "
if "%WHISK_TOKEN%"=="" (
    echo ❌ Whisk token is required!
    pause
    exit /b 1
)

REM Strip "Bearer " prefix if user included it
set "WHISK_TOKEN=%WHISK_TOKEN:Bearer =%"

REM Optional: Additional provider keys
echo.
echo Optional: Configure additional AI providers (press ENTER to skip)
echo.
set /p OPENAI_KEY="OpenAI API Key (optional): "
set /p ANTHROPIC_KEY="Anthropic API Key (optional): "
set /p GOOGLE_KEY="Google AI API Key (optional): "
set /p GROQ_KEY="Groq API Key (optional): "

REM Write to .env
(
echo # API Keys - Configured by Setup Wizard
echo AI_PROVIDER=%AI_PROVIDER%
echo.
echo # Primary AI Provider
if "%AI_PROVIDER%"=="openai" echo OPENAI_API_KEY=%PRIMARY_KEY%
if "%AI_PROVIDER%"=="anthropic" echo ANTHROPIC_API_KEY=%PRIMARY_KEY%
if "%AI_PROVIDER%"=="google" echo GOOGLE_AI_API_KEY=%PRIMARY_KEY%
if "%AI_PROVIDER%"=="groq" echo GROQ_API_KEY=%PRIMARY_KEY%
echo.
echo # Additional AI Providers (optional)
if not "%OPENAI_KEY%"=="" echo OPENAI_API_KEY=%OPENAI_KEY%
if not "%ANTHROPIC_KEY%"=="" echo ANTHROPIC_API_KEY=%ANTHROPIC_KEY%
if not "%GOOGLE_KEY%"=="" echo GOOGLE_AI_API_KEY=%GOOGLE_KEY%
if not "%GROQ_KEY%"=="" echo GROQ_API_KEY=%GROQ_KEY%
echo.
echo # Image Generation
echo WHISK_API_TOKEN=%WHISK_TOKEN%
echo.
echo # Database
echo DATABASE_URL=postgresql://obsidian:obsidian_news_2024@localhost:5432/obsidian_news
echo.
echo # Redis
echo REDIS_HOST=localhost
echo REDIS_PORT=6379
echo.
echo # Storage
echo LOCAL_STORAGE_ROOT=C:\Users\%USERNAME%\ObsidianNewsDesk
echo.
echo # Server
echo PORT=8347
echo NODE_ENV=production
) > .env

echo ✅ Environment configured

REM Validate configuration
echo.
echo ============================================
echo   Validating Configuration
echo ============================================
echo.
echo Running validation checks...
call npm run setup
if %errorlevel% neq 0 (
    echo ❌ Configuration validation failed!
    echo.
    echo Please check your API keys and try again.
    pause
    exit /b 1
)

echo ✅ Configuration validated successfully

:skip_env
pause

REM ============================================
REM STEP 4: Start Docker Services
REM ============================================
echo.
echo ============================================
echo   STEP 4/6: Starting Docker Services
echo ============================================
echo.
echo Starting Postgres + Redis...
echo.

docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Failed to start Docker services!
    echo.
    echo Make sure Docker Desktop is running.
    pause
    exit /b 1
)

echo.
echo Waiting for database to be ready...
timeout /t 5 /nobreak >nul

echo ✅ Docker services started
pause

REM ============================================
REM STEP 5: Initialize Database
REM ============================================
echo.
echo ============================================
echo   STEP 5/6: Initializing Database
echo ============================================
echo.

call npm run init-db
if %errorlevel% neq 0 (
    echo ❌ Database initialization failed!
    echo.
    echo Check if Docker is running and try again.
    pause
    exit /b 1
)

echo ✅ Database initialized
pause

REM ============================================
REM STEP 6: Create Storage Directories
REM ============================================
echo.
echo ============================================
echo   STEP 6/6: Creating Storage Directories
echo ============================================
echo.

set STORAGE_ROOT=C:\Users\%USERNAME%\ObsidianNewsDesk

if not exist "%STORAGE_ROOT%" mkdir "%STORAGE_ROOT%"
if not exist "%STORAGE_ROOT%\images" mkdir "%STORAGE_ROOT%\images"
if not exist "%STORAGE_ROOT%\avatars" mkdir "%STORAGE_ROOT%\avatars"
if not exist "%STORAGE_ROOT%\videos" mkdir "%STORAGE_ROOT%\videos"

echo ✅ Storage directories created at:
echo    %STORAGE_ROOT%
echo.
pause

REM ============================================
REM SETUP COMPLETE
REM ============================================
echo.
echo ============================================
echo   ✅ SETUP COMPLETE!
echo ============================================
echo.
echo Your system is now configured.
echo.
echo NEXT STEPS:
echo.
echo 1. Install Chrome Extension (CRITICAL):
echo    - Open chrome://extensions/
echo    - Enable Developer Mode
echo    - Load unpacked: chrome-extension\ folder
echo    - Visit https://labs.google.com/whisk
echo    - Generate test image to capture token
echo    - Extension will auto-refresh every 50 minutes
echo.
echo 2. Start the system:
echo    - Double-click START.bat
echo.
echo 3. Create your first video:
echo    - Browser opens to http://localhost:8347
echo    - Click "New Broadcast"
echo    - Paste script and generate!
echo.
echo ============================================
echo.
pause

echo Would you like to start the system now?
choice /C YN /M "Start Obsidian News Desk"
if errorlevel 2 goto end

echo.
echo Starting system...
start "Obsidian News Desk" cmd /k START.bat

:end
echo.
echo Setup wizard complete!
echo.
pause
