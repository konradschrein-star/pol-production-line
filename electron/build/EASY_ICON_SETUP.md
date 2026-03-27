# Easy Icon Setup (5 Minutes)

## Absolute Easiest Method ⚡

### Step 1: Run the Helper Script

```bash
cd obsidian-news-desk
.\scripts\get-icon.bat
```

This opens the icon generator website automatically.

### Step 2: Download the Icon

1. Website opens: https://favicon.io/emoji-favicons/clapper-board/
2. Click big green **"Download"** button
3. ZIP file downloads to your Downloads folder

### Step 3: Extract and Copy

```bash
# Extract the ZIP (right-click → Extract All)
# Then copy the icon:

copy "%USERPROFILE%\Downloads\favicon_io\favicon.ico" "electron\build\icon.ico"
```

### Step 4: Build Installer

```bash
npm run electron:build
```

**Done!** Your installer now has a professional clapper board emoji icon 🎬

---

## Alternative Icons (Pick Your Favorite)

All from https://favicon.io/emoji-favicons/:

### 🎬 Clapper Board (Recommended)
**Best for:** Video production theme
**URL:** https://favicon.io/emoji-favicons/clapper-board/

### 📹 Video Camera
**Best for:** Recording/camera focus
**URL:** https://favicon.io/emoji-favicons/video-camera/

### 📺 Television
**Best for:** Broadcasting theme
**URL:** https://favicon.io/emoji-favicons/television/

### 🎥 Movie Camera
**Best for:** Cinema/film theme
**URL:** https://favicon.io/emoji-favicons/movie-camera/

### 📰 Newspaper
**Best for:** News/journalism theme
**URL:** https://favicon.io/emoji-favicons/newspaper/

---

## Custom Text Icon (Your Initials)

**If you want "OND" or your name:**

1. Go to: https://favicon.io/favicon-generator/

2. Fill in:
   ```
   Text:            OND
   Background:      Rounded
   Font Family:     Roboto
   Font Variant:    700 (Bold)
   Font Size:       60
   Font Color:      #3b82f6 (blue)
   Background:      #1a1a1a (dark)
   ```

3. Click "Download"

4. Extract and copy:
   ```bash
   copy "%USERPROFILE%\Downloads\favicon_io\favicon.ico" "electron\build\icon.ico"
   ```

---

## What About the BMP Files?

**You don't need them!** The installer works fine without:
- `installerHeader.bmp`
- `installerSidebar.bmp`

The installer will just have a plain background instead of custom graphics.

**If you really want them (5 more minutes):**

### Quick BMP Creation with Paint

**installerHeader.bmp (150x57):**
```
1. Open Paint
2. Ctrl+E (Resize) → 150 x 57 pixels
3. Bucket fill with black
4. Add text "Obsidian News Desk" in white (Arial 12pt)
5. File → Save As → 24-bit BMP
```

**installerSidebar.bmp (164x314):**
```
1. Open Paint
2. Ctrl+E (Resize) → 164 x 314 pixels
3. Bucket fill with dark gray (#2f2f2f)
4. File → Save As → 24-bit BMP
```

Save both to: `electron\build\`

---

## Verification

After copying icon.ico, verify it exists:

```bash
cd electron\build
dir icon.ico
```

You should see:
```
icon.ico         [size]
```

---

## Full Build Command

Once icon is in place:

```bash
# From project root
npm run electron:build
```

Expected output:
```
✔ building      target=nsis
• electron-builder  Done
```

Output file:
```
dist\Obsidian News Desk-Setup-1.0.0.exe
```

---

## Still Stuck?

**Option 1:** Use ANY .ico file from your system
```bash
# Find any .ico file on your computer
# Example:
copy "C:\Windows\System32\imageres.dll.mun" "electron\build\icon.ico"
```

**Option 2:** Use online converter
1. Find any image (PNG, JPG) you like
2. Go to: https://convertio.co/png-ico/
3. Upload image
4. Download .ico
5. Copy to `electron\build\icon.ico`

**Option 3:** Ask me to find you a specific icon theme
- Tell me what style you want (modern, retro, minimal, etc.)
- I'll find the exact download link

---

## Summary

**Fastest path (5 minutes):**
1. Run: `.\scripts\get-icon.bat`
2. Click Download
3. Extract ZIP
4. Copy `favicon.ico` → `electron\build\icon.ico`
5. Build: `npm run electron:build`

**Result:** Professional installer with emoji icon 🎬

No design skills needed. No image editing. Just download and copy.
