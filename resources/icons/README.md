# Tray Icon Assets

## SVG Source Files

This directory contains SVG source files for system tray icons:

- `tray-green.svg` - All services running (play icon)
- `tray-yellow.svg` - Services starting/transitioning (loading spinner)
- `tray-red.svg` - Service error/down (pause icon)
- `tray-gray.svg` - Services stopped (stop square)

## Converting to ICO Format

### Why ICO?
Windows system tray expects `.ico` format for proper HiDPI rendering. ICO files can contain multiple resolutions (16x16, 32x32, 48x48) in a single file.

### Conversion Options

#### Option 1: Online Converter
1. Visit: https://convertio.co/svg-ico/
2. Upload SVG file
3. Select "Icon" output format
4. Download ICO file

#### Option 2: ImageMagick (Command Line)
```bash
# Install ImageMagick first: https://imagemagick.org/script/download.php

# Convert SVG to ICO with multiple resolutions
convert tray-green.svg -define icon:auto-resize=16,32,48 tray-green.ico
convert tray-yellow.svg -define icon:auto-resize=16,32,48 tray-yellow.ico
convert tray-red.svg -define icon:auto-resize=16,32,48 tray-red.ico
convert tray-gray.svg -define icon:auto-resize=16,32,48 tray-gray.ico
```

#### Option 3: Use PNG (Electron Fallback)
Electron can use PNG files via `nativeImage.createFromPath()`. While not optimal for Windows tray, it works:
```typescript
import { nativeImage } from 'electron';
const icon = nativeImage.createFromPath('tray-green.png');
```

## Current Status

**TODO**: Convert SVG files to ICO format for production use.

For development, the tray manager can temporarily use PNG files generated from these SVGs.
