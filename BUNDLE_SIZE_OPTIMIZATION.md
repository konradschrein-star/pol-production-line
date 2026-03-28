# Bundle Size Optimization Analysis

**Current State:** 3.9GB unpacked, 3.0GB asar
**Target:** 1.5-2.0GB unpacked, ~500MB installer

## 🔍 Root Cause Analysis

### Dependencies Incorrectly Classified as Production

The following packages are in `dependencies` but should be `devDependencies`:

#### 1. **@remotion/bundler** (~150MB with dependencies)
- **Current:** Production dependency
- **Why it's a problem:** This is only used during development to bundle Remotion compositions. At runtime, we use `@remotion/renderer` which doesn't need the bundler.
- **Impact:** High (saves ~150MB)
- **Action:** Move to devDependencies

#### 2. **@remotion/cli** (~50MB)
- **Current:** Production dependency
- **Why it's a problem:** Command-line interface tool, not needed at runtime
- **Impact:** Medium (saves ~50MB)
- **Action:** Move to devDependencies

#### 3. **playwright** (~200-300MB)
- **Current:** Production dependency
- **Why it's a problem:** Heavy browser automation framework. Was used for legacy Auto Whisk browser automation (deprecated). Not needed in production since:
  - Auto Whisk is deprecated (use Whisk API instead)
  - Remotion uses its own headless browser (not Playwright)
- **Impact:** Very High (saves ~250MB)
- **Action:** Move to devDependencies OR remove entirely

#### 4. **ffmpeg-static** and **ffprobe-static** (~200MB)
- **Current:** Production dependency
- **Why it's a problem:** These are npm packages that download FFmpeg binaries. We're already bundling FFmpeg executables directly in `resources/bin/windows/` (194MB). These packages duplicate that functionality.
- **Impact:** High (saves ~200MB or more due to duplication)
- **Action:** Move to devDependencies (still useful for `npm run test:ffmpeg`)

### Dependencies That MUST Stay in Production

✅ **@remotion/renderer** - Core video rendering engine
✅ **@remotion/media-utils** - Media processing utilities for Remotion
✅ **next** - Web server and UI framework
✅ **react** + **react-dom** - UI framework
✅ **sharp** - Image processing (used for avatar optimization)
✅ **bullmq** + **ioredis** - Queue system
✅ **pg** - PostgreSQL client
✅ **openai**, **@anthropic-ai/sdk**, **@google/generative-ai**, **groq-sdk** - AI providers

## 📊 Expected Size Reduction

| Package | Current Size | After Move | Savings |
|---------|-------------|------------|---------|
| @remotion/bundler | ~150MB | devDependencies | -150MB |
| @remotion/cli | ~50MB | devDependencies | -50MB |
| playwright | ~250MB | devDependencies | -250MB |
| ffmpeg-static + ffprobe-static | ~200MB | devDependencies | -200MB |
| **Total Estimated Savings** | | | **~650MB** |

**Projected final size:**
- Unpacked: 3.9GB → **~3.2GB** (-18%)
- ASAR: 3.0GB → **~2.3GB** (-23%)
- Installer (compressed): **~600-800MB** (down from projected 1.5GB)

## 🚀 Implementation Plan

### Step 1: Update package.json

**Move these from `dependencies` to `devDependencies`:**

```json
{
  "devDependencies": {
    // ... existing devDependencies ...

    // Remotion build tools (not needed at runtime)
    "@remotion/bundler": "^4.0.0",
    "@remotion/cli": "^4.0.0",

    // FFmpeg packages (we bundle executables directly)
    "ffmpeg-static": "^5.3.0",
    "ffprobe-static": "^3.1.0",

    // Legacy browser automation (deprecated, but keep for testing)
    "playwright": "^1.42.0"
  }
}
```

**Keep in `dependencies`:**
```json
{
  "dependencies": {
    // ... other dependencies ...

    // Remotion RUNTIME (required for video rendering)
    "@remotion/renderer": "^4.0.0",
    "@remotion/media-utils": "^4.0.438",
    "remotion": "^4.0.0"
  }
}
```

### Step 2: Update Code References

**Check if any production code imports these packages:**

```bash
# Search for imports
grep -r "@remotion/bundler" src/ electron/src/
grep -r "@remotion/cli" src/ electron/src/
grep -r "ffmpeg-static" src/ electron/src/
grep -r "ffprobe-static" src/ electron/src/
grep -r "playwright" src/ electron/src/
```

**If found:**
- `@remotion/bundler` - Should only be in scripts/ or dev files
- `@remotion/cli` - Should only be in scripts/ or dev files
- `ffmpeg-static`/`ffprobe-static` - Already using bundled executables via `src/lib/video/ffmpeg-resolver.ts`
- `playwright` - Should only be in `src/lib/browser/auto-whisk.ts` (deprecated)

### Step 3: Verify FFmpeg Resolution

Ensure `src/lib/video/ffmpeg-resolver.ts` correctly uses bundled executables:

```typescript
// Should resolve to:
// - Development: node_modules/ffmpeg-static/ffmpeg.exe
// - Production: resources/bin/windows/ffmpeg.exe
```

### Step 4: Clean Install and Rebuild

```bash
# Remove old node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall with corrected dependencies
npm install

# Rebuild
npm run electron:build
```

### Step 5: Verify Bundle Size

```bash
# Check new unpacked size
du -sh dist/win-unpacked

# Check new asar size
ls -lh dist/win-unpacked/resources/app.asar

# Verify excluded packages not in bundle
npx asar list dist/win-unpacked/resources/app.asar | grep -E "(bundler|playwright|ffmpeg-static)"
# Should return empty
```

## ⚠️ Potential Issues & Mitigations

### Issue 1: Remotion Bundler Actually Needed?
**Concern:** Maybe `@remotion/renderer` internally requires `@remotion/bundler`?

**Mitigation:**
- Check Remotion documentation
- Test video rendering after moving to devDependencies
- If rendering fails, keep bundler in production but investigate why

### Issue 2: FFmpeg Resolution Breaks
**Concern:** Moving ffmpeg-static to devDependencies might break FFmpeg resolution in production

**Mitigation:**
- Already handled in `src/lib/video/ffmpeg-resolver.ts`
- Uses bundled executables in production
- npm packages only used in development

### Issue 3: Playwright Still Referenced
**Concern:** Auto Whisk code might break if playwright is missing

**Mitigation:**
- Auto Whisk is deprecated (documented in CLAUDE.md)
- Gracefully handle missing playwright with try/catch
- Or remove Auto Whisk code entirely (recommended)

## 📝 Testing Checklist

After implementing changes:

- [ ] Full build completes successfully
- [ ] Unpacked app size reduced by ~650MB
- [ ] Application launches without errors
- [ ] **Critical:** Video rendering works end-to-end
  - [ ] Script analysis
  - [ ] Image generation
  - [ ] Avatar upload
  - [ ] Video compilation
  - [ ] FFmpeg encoding
- [ ] Docker services start correctly
- [ ] BullMQ workers function
- [ ] Next.js server runs
- [ ] No console errors about missing modules

## 🎯 Long-Term Optimizations (Phase 9)

### Additional Size Reductions:

1. **Tree-shake Next.js build** (~50-100MB savings)
   - Use `output: 'standalone'` in next.config.js
   - Only bundle required Next.js runtime

2. **Remove unused locales** (~10MB savings)
   - Electron includes all Chromium locales
   - Remove unused language files

3. **Optimize Sharp binaries** (~20MB savings)
   - Sharp includes multiple platform binaries
   - Only keep Windows x64

4. **Use Webpack/Vite to bundle dependencies** (~100-200MB savings)
   - Currently all node_modules are included as-is
   - Bundle and minify to reduce size

5. **Consider AWS SDK modularization** (~20MB savings)
   - `@aws-sdk/client-s3` might not be needed if using local storage
   - Or use minimal imports

**Potential final optimized size:**
- Unpacked: ~2.5GB
- Installer (compressed): ~400-500MB

## 🚦 Recommendation

**Priority: HIGH** (Should be done before Phase 7 distribution)

**Effort: LOW** (30 minutes to implement, 1 hour to test)

**Impact: HIGH** (650MB reduction, 18% smaller)

**Risk: MEDIUM** (Requires thorough testing of video rendering)

**Next Steps:**
1. Implement Step 1 (update package.json) - 5 minutes
2. Verify no production code imports (Step 2) - 10 minutes
3. Clean install and rebuild (Step 4) - 15 minutes
4. Test video rendering end-to-end (Step 5) - 30 minutes
5. Document results in PHASE_6_COMPLETION_REPORT.md

---

**Author:** Claude Sonnet 4.5
**Date:** March 28, 2026
**Related:** PHASE_6_COMPLETION_REPORT.md, electron-builder.yml
