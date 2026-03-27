# Quick Icon Creation for Build

The installer needs a 256x256 icon file. Here's the fastest way to get one:

## Method 1: Download Ready-Made Icon (2 minutes)

### Clapper Board Emoji (Recommended):
1. Visit: https://em.oji.wiki/1f3ac/png
2. Download the **512x512 PNG**
3. Go to: https://convertio.co/png-ico/
4. Upload the PNG
5. Select "Windows ICO" format
6. Under "Settings": Check all sizes (16, 32, 48, 256)
7. Download
8. Copy to: `electron\build\icon.ico`

## Method 2: Text-Based Icon (Fastest - 1 minute)

### Using Favicon Generator:
1. Visit: https://favicon.io/favicon-generator/
2. Settings:
   - Text: **OND**
   - Background: Rounded
   - Font Size: 110 (larger = better quality)
   - Font Color: #3b82f6
   - Background: #1a1a1a
3. Download ZIP
4. Extract - you'll get multiple sizes
5. Go to: https://icoconvert.com/
6. Upload all the PNG files from the ZIP
7. Convert to ICO
8. Download and copy to: `electron\build\icon.ico`

## Method 3: Use Placeholder (For Testing Only)

If you just want to test the build without a real icon:

```bash
# Download a simple placeholder:
# Visit: https://via.placeholder.com/512x512/1a1a1a/3b82f6.png?text=OND
# Save as PNG
# Convert at: https://convertio.co/png-ico/
# Copy to: electron\build\icon.ico
```

## After Getting the Icon:

```bash
cd obsidian-news-desk

# Build unpacked installer (faster, for testing):
npx electron-builder --win --x64 --dir

# Or build full installer:
npm run electron:build
```

## Verify Icon Size:

```bash
# Should show: 256x256 (or multiple sizes including 256)
file electron/build/icon.ico
```

## Current Status:

- ✅ Installer code ready
- ✅ Chrome extension bundled
- ✅ Tutorial updated with extension instructions
- ✅ TypeScript compiled
- ⚠️ Icon is 48x48 (needs 256x256)

Once you have the 256x256 icon, the build will complete successfully!
