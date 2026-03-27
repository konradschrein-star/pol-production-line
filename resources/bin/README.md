# FFmpeg Binary Installation

This directory contains FFmpeg and FFprobe binaries for video processing operations.

## Automated Installation (Recommended)

Run the automated download script from the project root:

```bash
npm run download-ffmpeg
```

This will:
- Detect your operating system
- Download official FFmpeg binaries
- Extract to the correct platform directory
- Set proper permissions (Unix/macOS)
- Verify installation

After installation, verify with:

```bash
npm run test:ffmpeg
```

---

## Manual Installation

If the automated script fails, you can download binaries manually:

### Windows

1. Download FFmpeg from: https://www.gyan.dev/ffmpeg/builds/
   - Choose: `ffmpeg-release-essentials.zip`
2. Extract the archive
3. Copy `ffmpeg.exe` and `ffprobe.exe` from `bin/` to `resources/bin/windows/`

**Alternative (Chocolatey):**
```cmd
choco install ffmpeg
```
System FFmpeg will be used automatically if bundled binaries are missing.

### macOS

1. Download FFmpeg: https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip
2. Download FFprobe: https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip
3. Extract both archives
4. Copy `ffmpeg` and `ffprobe` to `resources/bin/macos/`
5. Remove quarantine: `xattr -d com.apple.quarantine resources/bin/macos/*`

**Alternative (Homebrew):**
```bash
brew install ffmpeg
```
System FFmpeg will be used automatically if bundled binaries are missing.

### Linux

1. Download: https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
2. Extract: `tar -xJf ffmpeg-git-amd64-static.tar.xz`
3. Copy `ffmpeg` and `ffprobe` to `resources/bin/linux/`
4. Set permissions: `chmod +x resources/bin/linux/ffmpeg resources/bin/linux/ffprobe`

**Alternative (Package Manager):**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# Fedora/RHEL
sudo dnf install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

---

## FFmpeg Resolution Priority

The application uses an intelligent fallback chain to find FFmpeg:

1. **Environment Override** (highest priority)
   - Set `FFMPEG_PATH` and `FFPROBE_PATH` in `.env`
   - Used for testing or custom builds

2. **Bundled Binaries** (production default)
   - `resources/bin/{platform}/ffmpeg[.exe]`
   - Downloaded via `npm run download-ffmpeg`

3. **System PATH**
   - Checks if FFmpeg is installed globally
   - Detects Chocolatey/Homebrew/apt installations

4. **npm Packages** (development fallback)
   - Uses `ffmpeg-static` and `ffprobe-static` npm packages
   - Automatically installed during `npm install`

5. **No FFmpeg Found**
   - Application shows clear error message
   - Provides actionable troubleshooting steps

---

## Troubleshooting

### Error: "FFmpeg not found"

**Fix:**
1. Run `npm run download-ffmpeg`
2. If fails, install system FFmpeg (see Manual Installation)
3. Verify with `npm run test:ffmpeg`

### Error: "Cannot verify developer" (macOS)

**Fix:**
```bash
xattr -d com.apple.quarantine resources/bin/macos/*
```

### Error: "Permission denied" (Unix/Linux)

**Fix:**
```bash
chmod +x resources/bin/linux/ffmpeg
chmod +x resources/bin/linux/ffprobe
```

### Windows Antivirus False Positive

Some antivirus software flags FFmpeg as malware (common with video encoders).

**Fix:**
1. Add exclusion for `resources/bin/windows/` directory
2. Download from trusted source only (gyan.dev is official FFmpeg maintainer)
3. Verify SHA256 checksums from official FFmpeg website

### Remotion Render Fails with FFmpeg Error

**Fix:**
1. Check FFmpeg path: `npm run test:ffmpeg`
2. Ensure avatar files are optimized (<10 MB)
3. Set `FFMPEG_PATH` explicitly in `.env` if needed

---

## Version Information

**Current FFmpeg Version:** 6.1.1 (as of March 2026)

**Supported Platforms:**
- Windows 10/11 (x64)
- macOS 10.15+ (Intel/Apple Silicon)
- Linux (x64, static builds)

**Required Codecs:**
- H.264 (libx264) - Avatar encoding
- H.265 (libx265/hevc) - High-quality output
- AAC - Audio encoding

---

## File Structure

```
resources/bin/
├── README.md           # This file
├── windows/
│   ├── .gitkeep
│   ├── ffmpeg.exe      # Downloaded via script (not in git)
│   └── ffprobe.exe     # Downloaded via script (not in git)
├── macos/
│   ├── .gitkeep
│   ├── ffmpeg          # Downloaded via script (not in git)
│   └── ffprobe         # Downloaded via script (not in git)
└── linux/
    ├── .gitkeep
    ├── ffmpeg          # Downloaded via script (not in git)
    └── ffprobe         # Downloaded via script (not in git)
```

**Note:** Binary files are excluded from git (see `.gitignore`) due to size (~100 MB per platform).

---

## Support

For issues or questions:
- Check `docs/FFMPEG_TROUBLESHOOTING.md` (if exists)
- Run diagnostic: `npm run test:ffmpeg`
- Review logs: Check console output for FFmpeg resolution source
