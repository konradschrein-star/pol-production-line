# Icon Requirements for Obsidian News Desk

This directory contains the icons and graphics needed for the Windows installer.

## Required Files

### Application Icon
**File:** `icon.ico`
- **Format:** Windows ICO format (multi-resolution)
- **Resolutions required:**
  - 256x256 (for Windows 10/11 high-DPI displays)
  - 128x128
  - 64x64
  - 48x48 (standard Windows icon size)
  - 32x32
  - 16x16 (for small displays in Explorer)
- **Design theme:** Broadcasting + news (e.g., camera icon + ticker element)
- **Color scheme:** Dark background with blue accent (#3b82f6)
- **Style:** Modern, flat design with subtle gradients
- **Critical:** Icon must be recognizable at 16x16 size

### NSIS Installer Graphics
**File:** `installerHeader.bmp`
- **Size:** 150 x 57 pixels
- **Format:** BMP (24-bit color)
- **Usage:** Top banner in NSIS installer
- **Content:** Obsidian News Desk logo + tagline

**File:** `installerSidebar.bmp`
- **Size:** 164 x 314 pixels
- **Format:** BMP (24-bit color)
- **Usage:** Left sidebar in NSIS installer
- **Content:** Dark gradient (#1a1a1a → #2f2f2f), consistent with app theme

**File:** `installerIcon.ico`
- **Same as main icon.ico**
- Optional separate file for installer customization

**File:** `uninstallerIcon.ico`
- **Format:** Windows ICO format
- **Content:** Variation of main icon (optional: with minus/remove indicator)

### System Tray Icons (Phase 6 implementation)
**Files:**
- `tray-green.png` - All services running (16x16, 32x32)
- `tray-yellow.png` - Services starting (16x16, 32x32)
- `tray-red.png` - Service error (16x16, 32x32)

**Requirements:**
- Simple, clear design (visible on both light and dark backgrounds)
- Color-coded status: Green = OK, Yellow = Warning, Red = Error

## How to Create Icons

### Option 1: Use Figma (Recommended)
1. Design icon in Figma at 512x512
2. Export as PNG
3. Use online converter to create ICO file with multiple resolutions:
   - https://convertio.co/png-ico/
   - https://www.icoconverter.com/

### Option 2: Use Adobe Illustrator
1. Design vector icon
2. Export artboards at required sizes
3. Use Icon Composer or similar tool to create ICO

### Option 3: Use Online Icon Generator
- https://icon.kitchen/ (generates app icons)
- https://favicon.io/ (converts images to ICO)

## Current Status

⚠️ **PLACEHOLDERS IN USE**
The system currently uses placeholder icon references. You need to create and add the actual icon files before building the installer for distribution.

## Building Installer Without Icons

The build process will fail if required icons are missing. To test builds without final icons:

1. Create minimal placeholder icons:
```bash
# In electron/build/ directory
# You can use any PNG and convert it to ICO temporarily
```

2. Or temporarily disable icon checks in electron-builder.yml (not recommended for production)

## Design Guidelines

### Brand Colors
- Primary: #3b82f6 (Blue)
- Background: #1a1a1a (Dark)
- Accent: #2563eb (Darker Blue)
- Error: #ef4444 (Red)
- Success: #22c55e (Green)
- Warning: #f59e0b (Orange)

### Icon Theme
- **Primary motif:** Camera/video camera (representing video production)
- **Secondary motif:** Ticker tape or news ticker (representing news broadcast)
- **Style:** Flat design, modern, professional
- **Avoid:** Overly complex designs that don't scale well to small sizes

## Testing Icons

After creating icons:

1. **Test small sizes:** Verify icon is clear at 16x16 (use Windows Explorer icon view)
2. **Test high-DPI:** Check appearance on 4K displays
3. **Test contrast:** Ensure visibility on both light and dark backgrounds
4. **Test installer:** Run `npm run electron:build` and check installer appearance

## Resources

- Obsidian News Desk color palette: See `/docs/design-system.md`
- Icon design inspiration: https://www.flaticon.com/
- Windows icon guidelines: https://docs.microsoft.com/en-us/windows/apps/design/style/icons
