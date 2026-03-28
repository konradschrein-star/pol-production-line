@echo off
REM Convert tray icons from SVG to ICO format
REM Requires ImageMagick installed with legacy utilities
REM See docs\CONVERT_TRAY_ICONS.md for installation guide

echo ================================================
echo Obsidian News Desk - Tray Icon Converter
echo ================================================
echo.

REM Check if ImageMagick is installed
where magick >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ImageMagick not found!
    echo.
    echo Please install ImageMagick first:
    echo 1. Download from: https://imagemagick.org/script/download.php#windows
    echo 2. Run installer and check "Install legacy utilities"
    echo 3. Restart terminal and run this script again
    echo.
    pause
    exit /b 1
)

echo ImageMagick found:
magick --version | findstr "Version"
echo.

REM Navigate to icons directory
cd /d "%~dp0..\resources\icons"
echo Converting icons in: %CD%
echo.

REM Convert each icon
echo [1/4] Converting tray-green.svg...
magick tray-green.svg -define icon:auto-resize=16,32,48 tray-green.ico
if %ERRORLEVEL% EQU 0 (
    echo       ✓ tray-green.ico created
) else (
    echo       ✗ Failed to convert tray-green.svg
)

echo [2/4] Converting tray-yellow.svg...
magick tray-yellow.svg -define icon:auto-resize=16,32,48 tray-yellow.ico
if %ERRORLEVEL% EQU 0 (
    echo       ✓ tray-yellow.ico created
) else (
    echo       ✗ Failed to convert tray-yellow.svg
)

echo [3/4] Converting tray-red.svg...
magick tray-red.svg -define icon:auto-resize=16,32,48 tray-red.ico
if %ERRORLEVEL% EQU 0 (
    echo       ✓ tray-red.ico created
) else (
    echo       ✗ Failed to convert tray-red.svg
)

echo [4/4] Converting tray-gray.svg...
magick tray-gray.svg -define icon:auto-resize=16,32,48 tray-gray.ico
if %ERRORLEVEL% EQU 0 (
    echo       ✓ tray-gray.ico created
) else (
    echo       ✗ Failed to convert tray-gray.svg
)

echo.
echo ================================================
echo Conversion complete!
echo ================================================
echo.

REM List created ICO files
echo Created files:
dir *.ico /b 2>nul
echo.

REM Show file sizes
echo File sizes:
for %%F in (*.ico) do (
    for %%A in (%%F) do (
        set "size=%%~zA"
        set /a sizeKB=!size! / 1024
        echo   %%F - !sizeKB! KB
    )
)

echo.
echo Next steps:
echo 1. Verify all 4 ICO files created above
echo 2. Test in app: npm run electron:dev
echo 3. Check system tray icon
echo.
pause
