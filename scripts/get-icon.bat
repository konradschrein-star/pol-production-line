@echo off
echo ========================================
echo Obsidian News Desk - Icon Setup Helper
echo ========================================
echo.
echo This will open the fastest icon generator.
echo.
echo Steps:
echo 1. The website will open in your browser
echo 2. Click "Download" to get the icon
echo 3. Extract the ZIP file
echo 4. Copy favicon.ico to the project
echo.
echo Recommended icon: Clapper Board emoji (video production theme)
echo.
pause

echo Opening icon generator...
start https://favicon.io/emoji-favicons/clapper-board/

echo.
echo After download, run:
echo.
echo copy Downloads\favicon_io\favicon.ico electron\build\icon.ico
echo.
echo Then build the installer with:
echo npm run electron:build
echo.
pause
