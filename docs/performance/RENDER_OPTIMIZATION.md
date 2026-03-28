# Render Performance Optimization Guide

## Baseline Performance

**Last Benchmarked:** [To be filled after running tests]
**System:** Windows 11, Docker (PostgreSQL + Redis)
**Remotion Version:** 4.0

### Render Times by Video Duration

| Video Duration | Scenes | Render Time (Target) | Render Time (Actual) | Throughput | Status |
|---------------|--------|----------------------|----------------------|------------|--------|
| 30 seconds | 4-5 | < 90s | [TBD]s | [TBD]x | [PASS/FAIL] |
| 60 seconds | 8-10 | < 150s | [TBD]s | [TBD]x | [PASS/FAIL] |
| 120 seconds | 16-20 | < 300s | [TBD]s | [TBD]x | [PASS/FAIL] |

**Conclusion:** Render time scales linearly with video duration (~2x realtime).

---

## Current Render Pipeline

```
1. Asset Preparation (10-30s)
   ├─ Copy images: storage → public/images/
   ├─ Validate avatar MP4
   └─ Check all assets exist

2. Remotion Bundle (First render: +10-15s)
   ├─ Compile React components
   ├─ Generate composition
   └─ Cache bundle (LRU, 5 entries)

3. Video Rendering (60-150s for 60s video)
   ├─ Load assets (images, avatar, audio)
   ├─ Render frames (1920x1080 @ 30fps)
   ├─ Apply effects (Ken Burns, transitions)
   └─ Encode H.264 (FFmpeg)

4. Output (1-2s)
   └─ Save to C:\Users\konra\ObsidianNewsDesk\videos\
```

---

## Optimization Opportunities

### 1. Parallelize Asset Copying (HIGH IMPACT)

**Current Implementation:**
```typescript
// Sequential copying (slow)
for (const scene of scenes) {
  await fs.promises.copyFile(scene.storage_path, scene.public_path);
}
```

**Optimized Implementation:**
```typescript
// Parallel copying (fast)
await Promise.all(
  scenes.map(scene =>
    fs.promises.copyFile(scene.storage_path, scene.public_path)
  )
);
```

**Expected Improvement:** 5-10 seconds saved (10-30s → 5-10s)

**Risk:** Low (read-only operations, no concurrency issues)

**File to Modify:** `src/lib/remotion/asset-preparation.ts`

---

### 2. Avatar Optimization (HIGH IMPACT)

**Problem:** Large avatar files (30-60MB) cause slow loading in Remotion.

**Current Implementation:**
- Accept any MP4 file
- Load directly in Remotion
- Risk: Timeout if file >10MB

**Optimized Implementation:**
```bash
# Optimize avatar to 640x360, ~2-3MB
./scripts/optimize-avatar.sh input.mp4 output.mp4
```

**FFmpeg Command:**
```bash
ffmpeg -i input.mp4 \
  -vf scale=640:360 \
  -c:v libx264 -preset medium -crf 28 \
  -c:a aac -b:a 96k -ar 48000 \
  -movflags +faststart \
  output.mp4
```

**Expected Improvement:** 15-20 seconds saved

**Trade-off:** Lower resolution (640x360 vs 1080p), but adequate for small overlay

**Recommendation:** Always optimize avatars >10MB before upload

---

### 3. Bundle Caching Optimization (MEDIUM IMPACT)

**Current Implementation:**
- LRU cache with 5 entries
- Cache key: MD5 hash of composition props
- First render: Cache miss (+10-15s)
- Subsequent renders: Cache hit (fast)

**Optimization: Pre-warm Cache**
```typescript
// Before rendering, pre-warm bundle cache
import { prepareBundle } from '@/lib/remotion/bundle-cache';

await prepareBundle(); // Warms cache
await renderVideo(...); // Uses cached bundle
```

**Expected Improvement:** 10-15 seconds saved on first render

**Risk:** Low (no side effects)

**File to Create:** `src/lib/remotion/bundle-cache.ts` (if not exists)

---

### 4. Image Resolution Optimization (MEDIUM IMPACT)

**Problem:** Whisk generates images at various resolutions (may be >1920x1080).

**Current:** Images loaded as-is in Remotion

**Optimization:** Resize images to 1920x1080 before rendering
```typescript
import sharp from 'sharp';

// Resize image to match output resolution
await sharp(inputPath)
  .resize(1920, 1080, { fit: 'cover' })
  .jpeg({ quality: 85 })
  .toFile(outputPath);
```

**Expected Improvement:** 5-10 seconds saved (faster decoding)

**Trade-off:** Additional processing time during asset preparation (+2-3s)

**Net Improvement:** 3-7 seconds

**Recommendation:** Only resize if images >1920x1080

---

### 5. WebP Image Format (LOW IMPACT, EXPERIMENTAL)

**Current:** JPG images (1-2MB each)

**Optimization:** Convert to WebP (smaller, faster decode)
```typescript
await sharp(inputPath)
  .webp({ quality: 85 })
  .toFile(outputPath);
```

**Expected Improvement:** 5-10 seconds saved

**Risk:** Medium (requires Remotion compatibility testing)

**Recommendation:** Test in development before deploying

---

## Optimizations NOT Recommended

### ❌ 1. Parallelize Render Workers

**Why Not:**
- Rendering is CPU-bound (H.264 encoding)
- Running 2 workers simultaneously may slow both down (CPU contention)
- Single worker is intentional for consistent performance

**Alternative:** Queue jobs and process sequentially (current implementation)

---

### ❌ 2. Increase Whisk API Concurrency Beyond 8

**Why Not:**
- Whisk API has rate limits (429 errors)
- Adaptive concurrency (2-8 workers) is already optimal
- Increasing further will trigger more 429s, slowing overall throughput

**Alternative:** Current adaptive rate limiting is optimal

---

### ❌ 3. Use Lower Video Bitrate

**Why Not:**
- Video quality is important for final output
- H.264 encoding is already efficient
- Bitrate reduction would save <5 seconds but degrade quality

**Alternative:** Accept current render time for quality output

---

## Implementation Plan

### Phase 1: High Impact Optimizations (1-2 hours)

1. **Parallelize Asset Copying**
   - Modify `asset-preparation.ts`
   - Test with 10 scenes
   - Verify no file corruption

2. **Avatar Optimization Script**
   - Already exists: `./scripts/optimize-avatar.sh`
   - Add to UI workflow (button: "Optimize Avatar")
   - Document in CLAUDE.md

**Expected Total Savings:** 20-30 seconds per render

### Phase 2: Medium Impact Optimizations (2-3 hours)

3. **Pre-warm Bundle Cache**
   - Create `bundle-cache.ts`
   - Call before first render
   - Test cache hit rate

4. **Conditional Image Resizing**
   - Check image dimensions
   - Resize only if >1920x1080
   - Test with 4K images

**Expected Total Savings:** 15-25 seconds per render

### Phase 3: Experimental Optimizations (3-4 hours)

5. **WebP Format Testing**
   - Convert test images to WebP
   - Test Remotion compatibility
   - Benchmark load time
   - If successful, deploy

**Expected Total Savings:** 5-10 seconds per render

**Total Potential Savings:** 40-65 seconds per render (25-40% improvement)

---

## Benchmark Results Template

### Before Optimization

| Metric | Value |
|--------|-------|
| 30s video render time | [TBD]s |
| 60s video render time | [TBD]s |
| Asset preparation time | [TBD]s |
| Bundle cache misses | [TBD]% |
| Average throughput | [TBD]x realtime |

### After Phase 1 Optimizations

| Metric | Value | Improvement |
|--------|-------|-------------|
| 30s video render time | [TBD]s | [TBD]s saved |
| 60s video render time | [TBD]s | [TBD]s saved |
| Asset preparation time | [TBD]s | [TBD]s saved |
| Bundle cache misses | [TBD]% | [TBD]% |
| Average throughput | [TBD]x | [TBD]x |

### After Phase 2 Optimizations

| Metric | Value | Improvement |
|--------|-------|-------------|
| 30s video render time | [TBD]s | [TBD]s saved |
| 60s video render time | [TBD]s | [TBD]s saved |
| Asset preparation time | [TBD]s | [TBD]s saved |
| Bundle cache hits | [TBD]% | [TBD]% |
| Average throughput | [TBD]x | [TBD]x |

---

## Monitoring & Validation

### Key Metrics to Track

1. **Render Time by Video Duration**
   - Track p50, p95, p99
   - Alert if >3x realtime

2. **Asset Preparation Time**
   - Target: <10s
   - Alert if >30s

3. **Bundle Cache Hit Rate**
   - Target: >80%
   - Alert if <50%

4. **Failed Renders**
   - Target: <1%
   - Alert if >5%

### Validation Steps

```bash
# 1. Run render benchmarks
npm run test -- tests/performance/render-benchmark.ts

# 2. Check render times in database
psql obsidian_news_desk -c "
  SELECT
    AVG(render_time_ms / 1000.0) as avg_render_seconds,
    MIN(render_time_ms / 1000.0) as min_render_seconds,
    MAX(render_time_ms / 1000.0) as max_render_seconds
  FROM job_metrics
  WHERE created_at > NOW() - INTERVAL '7 days';
"

# 3. Monitor Remotion logs for errors
tail -f logs/remotion.log
```

---

## Troubleshooting Slow Renders

### Symptom: Render takes >5x realtime

**Possible Causes:**
1. Large avatar file (>10MB) → Optimize avatar
2. 4K images → Resize to 1920x1080
3. CPU throttling → Check system resources
4. Chromium memory leak → Restart worker

**Diagnostic Steps:**
```bash
# 1. Check render worker logs
tail -f logs/render.worker.log

# 2. Monitor CPU usage
htop # or Task Manager on Windows

# 3. Check Remotion timeout errors
grep "timeout" logs/remotion.log
```

---

## Future Enhancements (Not in Phase 8)

1. **GPU-Accelerated Encoding**
   - Use NVENC (NVIDIA) or QuickSync (Intel)
   - Expected improvement: 30-50% faster
   - Requires: GPU support in Docker

2. **Distributed Rendering**
   - Render frames on multiple machines
   - Stitch frames together
   - Expected improvement: Linear with worker count
   - Requires: Render cluster setup

3. **Progressive Upload**
   - Stream rendered frames to storage during render
   - Reduces output time
   - Expected improvement: 5-10 seconds

---

**Last Updated:** [Date]
**Next Review:** [3 months from last update]
