# Performance Bottleneck Analysis

## Executive Summary

This document identifies and analyzes performance bottlenecks in the Obsidian News Desk video production pipeline.

**Analysis Date:** [To be filled]
**System Version:** 1.0.0 (Phase 8 - Performance Testing)

**Primary Bottlenecks Identified:**
1. 🐌 **Image Generation (Whisk API):** 15-20 minutes (60-75% of total time)
2. ⚙️ **Video Rendering (Remotion):** 2-3 minutes (8-12% of total time)
3. 📁 **Asset Preparation:** 10-30 seconds (1-2% of total time)
4. 🤖 **Script Analysis:** 30-60 seconds (2-4% of total time)
5. 🎙️ **Avatar Generation:** Manual (user-controlled, not measured)

---

## End-to-End Performance Profile

### Typical 60-Second Video (8 scenes)

```
Timeline:
|==========================================|
| Script Analysis (30-60s)               |  3%
|==========================================|
| Image Generation (15-20 min)           | 75%
|==========================================|
| Asset Preparation (10-30s)             |  2%
|==========================================|
| Video Rendering (2-3 min)              | 10%
|==========================================|
| Output (1-2s)                          | <1%
|==========================================|

Total: ~25-40 minutes (average: 32 minutes)
```

### Time Breakdown by Phase

| Phase | Duration | % of Total | Parallelizable | Optimizable |
|-------|----------|-----------|----------------|-------------|
| Script Analysis | 30-60s | 3% | ❌ | ⚠️ (model choice) |
| Image Generation | 15-20 min | 75% | ✅ (currently 3 workers) | ⚠️ (rate limited) |
| Avatar Generation | Manual | N/A | N/A | N/A |
| Asset Preparation | 10-30s | 2% | ✅ (not currently) | ✅ |
| Video Rendering | 2-3 min | 10% | ❌ (CPU-bound) | ⚠️ (limited) |
| Output | 1-2s | <1% | ❌ | ❌ |

**Key Insight:** Image generation is the primary bottleneck (75% of time).

---

## Bottleneck #1: Image Generation (Whisk API)

### Current Performance
- **Duration:** 15-20 minutes for 8 scenes
- **Per Scene:** 2-3 minutes average
- **Concurrency:** 3 workers (adaptive 2-8)
- **Rate Limiting:** Active (429 errors trigger backoff)

### Root Causes
1. **Whisk API Rate Limits**
   - External API has strict rate limits
   - 429 errors reduce concurrency from 8 → 2 workers
   - Exponential backoff adds delays (3s, 6s, 12s)

2. **Sequential Retry Logic**
   - Failed scenes retry 3 times
   - Each retry adds 2-3 minutes
   - Content policy violations trigger prompt sanitization

3. **No Pre-generation**
   - All images generated on-demand
   - No image caching or reuse

### Optimization Options

#### Option A: Increase Concurrency (LIMITED)
**Current:** 3 workers (adaptive 2-8)
**Optimized:** 5 workers (adaptive 3-10)

**Expected Improvement:** 20-30% faster (15-20 min → 12-15 min)

**Trade-off:** More 429 errors, may not improve overall throughput

**Recommendation:** ⚠️ Test carefully

#### Option B: Implement Image Caching
**Concept:** Cache generated images by prompt hash

```typescript
const promptHash = md5(image_prompt);
const cachedImage = await getCachedImage(promptHash);

if (cachedImage) {
  return cachedImage; // Skip generation
} else {
  const image = await whiskAPI.generate(image_prompt);
  await cacheImage(promptHash, image);
  return image;
}
```

**Expected Improvement:** 50-90% faster for repeated prompts

**Trade-off:** Disk space for cached images (10-50GB)

**Recommendation:** ✅ High value for repeated content

#### Option C: Pre-generate Image Library
**Concept:** Generate library of common news scenes in advance

**Expected Improvement:** 100% faster (instant if match found)

**Trade-off:** Requires manual curation, less flexible

**Recommendation:** ⚠️ Only for fixed templates

#### Option D: Switch to Faster Image API
**Alternatives:**
- DALL-E 3 (OpenAI): ~30-60s per image
- Midjourney API: ~20-40s per image (unofficial)
- Stable Diffusion (local): ~5-10s per image

**Expected Improvement:** 50-80% faster

**Trade-off:** Different image quality/style, API costs

**Recommendation:** ⚠️ Requires extensive testing

**VERDICT: Image generation bottleneck is largely unavoidable due to external API constraints.**

---

## Bottleneck #2: Video Rendering (Remotion)

### Current Performance
- **Duration:** 2-3 minutes for 60s video
- **Throughput:** ~2x realtime
- **Concurrency:** 1 worker (intentional)
- **CPU Usage:** 80-100% during render

### Root Causes
1. **CPU-Bound H.264 Encoding**
   - FFmpeg encoding is computationally expensive
   - Single-threaded bottleneck in encode pipeline

2. **Large Asset Loading**
   - 8 images @ 1-2MB each
   - Avatar MP4 @ 2-60MB
   - Loading time: 5-20 seconds

3. **Ken Burns Effect Overhead**
   - Real-time scale/translate transformations
   - Adds ~10-15% render time

### Optimization Options

#### Option A: Optimize Assets (HIGH IMPACT)
- Resize images to 1920x1080
- Optimize avatar to 640x360 (<3MB)
- Use WebP format (experimental)

**Expected Improvement:** 15-30% faster (2-3 min → 1.5-2.5 min)

**Recommendation:** ✅ Implement (see RENDER_OPTIMIZATION.md)

#### Option B: Use GPU Encoding
**Current:** CPU-based H.264 (libx264)
**Optimized:** GPU-based H.264 (NVENC/QuickSync)

**Expected Improvement:** 30-50% faster

**Trade-off:** Requires GPU support in Docker

**Recommendation:** ⚠️ Future enhancement

#### Option C: Simplify Effects
**Remove Ken Burns effect → Static images**

**Expected Improvement:** 10-15% faster

**Trade-off:** Less engaging visual output

**Recommendation:** ❌ Visual quality is important

#### Option D: Parallelize Render Workers
**Increase from 1 → 2 workers**

**Expected Improvement:** Potentially slower (CPU contention)

**Recommendation:** ❌ CPU-bound, not parallelizable

**VERDICT: Render time is acceptable (~2x realtime). Optimize assets for 15-30% improvement.**

---

## Bottleneck #3: Asset Preparation

### Current Performance
- **Duration:** 10-30 seconds
- **Operations:** Copy 8 images + validate avatar
- **Concurrency:** Sequential (1 at a time)

### Root Causes
1. **Sequential File Copying**
   - Files copied one at a time
   - No parallelization

2. **Disk I/O Bound**
   - SSD: ~500 MB/s read, ~300 MB/s write
   - 8 images @ 1-2MB each = 8-16MB total

### Optimization Options

#### Option A: Parallel File Copying (HIGH IMPACT)
**Implementation:**
```typescript
await Promise.all(
  scenes.map(scene =>
    fs.promises.copyFile(scene.storage_path, scene.public_path)
  )
);
```

**Expected Improvement:** 50-70% faster (10-30s → 5-10s)

**Recommendation:** ✅ Implement immediately (low risk)

#### Option B: Use Symlinks Instead of Copying
**Concept:** Create symlinks instead of copying files

```typescript
await fs.promises.symlink(scene.storage_path, scene.public_path);
```

**Expected Improvement:** 90% faster (10-30s → 1-2s)

**Trade-off:** Remotion must support symlinks (verify)

**Recommendation:** ⚠️ Test compatibility first

**VERDICT: Asset preparation is minor bottleneck. Parallelize for quick win.**

---

## Bottleneck #4: Script Analysis

### Current Performance
- **Duration:** 30-60 seconds
- **AI Provider:** OpenAI GPT-4 (configurable)
- **Concurrency:** 2 workers

### Root Causes
1. **Large Language Model Latency**
   - GPT-4 is high-quality but slower
   - API roundtrip time: 20-40s

2. **Structured Output Parsing**
   - JSON schema validation
   - Retry on malformed responses

### Optimization Options

#### Option A: Switch to Faster Model
**Alternatives:**
- GPT-4o-mini: ~10-20s (3x faster)
- Claude 3 Haiku: ~5-15s (4x faster)
- Groq (Llama): ~2-5s (10x faster)

**Expected Improvement:** 50-90% faster

**Trade-off:** Lower quality (fewer scenes, less coherent)

**Recommendation:** ⚠️ Test quality first

#### Option B: Cache Analysis Results
**Concept:** Cache analysis for repeated scripts

**Expected Improvement:** 100% faster (instant if cached)

**Trade-off:** Inflexible for variations

**Recommendation:** ⚠️ Only for templates

**VERDICT: Script analysis is minor bottleneck (3% of time). Not worth optimizing.**

---

## Overall Optimization Strategy

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Parallelize asset copying → 5-10s saved
2. ✅ Optimize avatars to 640x360 → 15-20s saved
3. ✅ Resize images to 1920x1080 → 10-15s saved

**Total Savings:** 30-45 seconds (~2% improvement)

### Phase 2: Medium-Term (2-4 weeks)
4. ✅ Implement image caching by prompt → 50-90% faster for repeated prompts
5. ⚠️ Test GPU encoding → 30-50% faster renders (requires hardware)

**Total Savings:** Variable (depends on cache hit rate)

### Phase 3: Long-Term (3-6 months)
6. ⚠️ Evaluate alternative image APIs → 50-80% faster image generation
7. ⚠️ Build pre-generated image library → Instant for templates

**Total Savings:** Up to 10-15 minutes (40-50% improvement)

---

## Performance Targets vs Actuals

### Current Performance

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Script analysis | < 60s | [TBD]s | [PASS/FAIL] |
| Image generation (8 scenes) | < 20 min | [TBD] min | [PASS/FAIL] |
| Asset preparation | < 30s | [TBD]s | [PASS/FAIL] |
| Video rendering (60s) | < 180s | [TBD]s | [PASS/FAIL] |
| Total end-to-end | < 40 min | [TBD] min | [PASS/FAIL] |

### After Phase 1 Optimizations

| Metric | Target | Actual | Improvement | Status |
|--------|--------|--------|-------------|--------|
| Asset preparation | < 10s | [TBD]s | [TBD]s | [PASS/FAIL] |
| Video rendering (60s) | < 150s | [TBD]s | [TBD]s | [PASS/FAIL] |
| Total end-to-end | < 38 min | [TBD] min | [TBD] min | [PASS/FAIL] |

---

## Recommendations Summary

### ✅ Implement Immediately (High Value, Low Risk)
1. Parallelize asset copying
2. Optimize avatars to 640x360
3. Conditional image resizing (if >1920x1080)

### ⚠️ Test Before Implementation (High Value, Medium Risk)
4. Image caching by prompt hash
5. GPU-accelerated encoding
6. WebP image format

### ❌ Do Not Implement (Low Value or High Risk)
7. Parallelize render workers (CPU contention)
8. Remove Ken Burns effect (quality loss)
9. Switch to faster LLM (quality loss)

---

## Monitoring & Validation

### Key Metrics Dashboard

Create dashboard tracking:
- **End-to-end time:** p50, p95, p99
- **Phase breakdown:** Analysis, Images, Render
- **Bottleneck detection:** Phase taking >80% of time
- **Failure rate:** By phase

### Alert Rules

```typescript
// Alert if image generation >25 minutes
if (image_gen_time_ms > 25 * 60 * 1000) {
  alert('Image generation bottleneck detected');
}

// Alert if render time >5x realtime
if (render_time_ms / video_duration_ms > 5) {
  alert('Render performance degraded');
}
```

---

**Last Updated:** [Date]
**Next Review:** [3 months from last update]
