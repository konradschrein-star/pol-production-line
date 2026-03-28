# Tray Icon Conversion Guide

## Overview

The system tray icons need to be converted from SVG to ICO format for Windows compatibility. This guide shows how to convert the icons using ImageMagick.

## Current State

**SVG files (source):**
- `resources/icons/tray-green.svg` - Services running
- `resources/icons/tray-yellow.svg` - Services starting
- `resources/icons/tray-red.svg` - Services down
- `resources/icons/tray-gray.svg` - Services stopped

**Required output:**
- `resources/icons/tray-green.ico` - Multi-size (16x16, 32x32, 48x48)
- `resources/icons/tray-yellow.ico` - Multi-size
- `resources/icons/tray-red.ico` - Multi-size
- `resources/icons/tray-gray.ico` - Multi-size

## Prerequisites: Install ImageMagick

### Windows Installation

1. **Download ImageMagick:**
   - Go to: https://imagemagick.org/script/download.php#windows
   - Download: `ImageMagick-7.x.x-Q16-HDRI-x64-dll.exe` (dynamic installer)

2. **Run installer:**
   - Execute the downloaded .exe file
   - **IMPORTANT:** Check "Install legacy utilities (e.g., convert)" option
   - Complete installation with default settings

3. **Verify installation:**
   ```bash
   magick --version
   ```

   **Expected output:**
   ```
   Version: ImageMagick 7.x.x Q16-HDRI x64 ...
   Copyright: (C) 1999 ImageMagick Studio LLC
   ```

4. **Restart terminal** to load new PATH environment variable

## Conversion Commands

### Quick Conversion (Recommended)

Open PowerShell or Command Prompt in the project directory:

```bash
cd obsidian-news-desk\resources\icons

# Convert each SVG to multi-size ICO
magick tray-green.svg -define icon:auto-resize=16,32,48 tray-green.ico
magick tray-yellow.svg -define icon:auto-resize=16,32,48 tray-yellow.ico
magick tray-red.svg -define icon:auto-resize=16,32,48 tray-red.ico
magick tray-gray.svg -define icon:auto-resize=16,32,48 tray-gray.ico
```

### Verify Output

```bash
# Check that ICO files were created
dir *.ico
```

**Expected output:**
```
tray-green.ico   (~5-10 KB)
tray-yellow.ico  (~5-10 KB)
tray-red.ico     (~5-10 KB)
tray-gray.ico    (~5-10 KB)
```

### Advanced Options

**Custom sizes:**
```bash
magick tray-green.svg -define icon:auto-resize=16,24,32,48,64 tray-green.ico
```

**Specify background color:**
```bash
magick tray-green.svg -background transparent -define icon:auto-resize=16,32,48 tray-green.ico
```

**Higher quality:**
```bash
magick tray-green.svg -density 300 -define icon:auto-resize=16,32,48 tray-green.ico
```

## Alternative: Online Converter

If ImageMagick is not available or installation fails:

1. Go to: https://convertio.co/svg-ico/
2. Upload each SVG file
3. Select output format: ICO
4. Choose icon sizes: 16x16, 32x32, 48x48
5. Download converted files
6. Save to `resources/icons/` directory

## Verify Icons in Electron

After conversion, the tray.ts file will automatically use the ICO files (it checks for .ico first, then .svg, then .png).

**Test the icons:**

1. Build the app:
   ```bash
   npm run electron:dev
   ```

2. Check system tray:
   - Look for Obsidian News Desk icon in system tray
   - Icon should be crisp and clear (not pixelated)
   - Try different icon states by starting/stopping services

3. Icon state transitions:
   - **Green:** All services running
   - **Yellow:** Services starting or degraded
   - **Red:** Services down
   - **Gray:** Services stopped

## Troubleshooting

### Error: "magick: command not found"
**Cause:** ImageMagick not in PATH or not installed
**Solution:**
- Restart terminal after installation
- Check installation: `magick --version`
- Reinstall with "legacy utilities" option checked

### Error: "unable to open image"
**Cause:** SVG file path incorrect
**Solution:**
- Check current directory: `pwd` or `cd`
- Navigate to `obsidian-news-desk\resources\icons`
- Verify SVG files exist: `dir *.svg`

### Output ICO file is empty or corrupted
**Cause:** SVG file invalid or ImageMagick version issue
**Solution:**
- Open SVG in browser to verify it's valid
- Try online converter as alternative
- Update ImageMagick to latest version

### Icons still show as SVG in app
**Cause:** Cached icon or build not refreshed
**Solution:**
- Delete `dist/` and `electron/dist/` directories
- Rebuild app: `npm run electron:build`
- Clear Electron cache: Delete `%APPDATA%\Obsidian News Desk`

## File Size Guidelines

- **Target size:** 5-10 KB per ICO file
- **Maximum size:** 50 KB per ICO file
- If larger than 50 KB, optimize SVG source or reduce icon sizes

## Icon Design Best Practices

For future icon updates:

1. **Size:** Design at 48x48 or higher
2. **Simplicity:** Avoid fine details (won't show at 16x16)
3. **Contrast:** Use high contrast for visibility
4. **Color:** Match design system (green, yellow, red, gray)
5. **Transparency:** Support transparency for non-rectangular icons
6. **Testing:** Test at all sizes (16x16, 32x32, 48x48)

## Next Steps

After converting icons:

1. ✅ Verify all 4 ICO files created
2. ✅ Check file sizes (5-10 KB each)
3. ✅ Test in Electron app (`npm run electron:dev`)
4. ✅ Verify icon changes when services start/stop
5. ✅ Build installer (`npm run electron:build`)
6. ✅ Test installer on clean VM
7. ✅ Verify system tray icon in installed app
