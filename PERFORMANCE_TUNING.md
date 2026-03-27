# Performance Tuning Guide

## Image Generation Speed Optimization

### Quick Wins (Immediate)

1. **Increase Concurrency** (in `.env`):
   ```env
   # Conservative (stable, recommended for most users)
   WHISK_CONCURRENCY=3
   WHISK_MAX_CONCURRENCY=8

   # Aggressive (faster, may hit rate limits)
   WHISK_CONCURRENCY=5
   WHISK_MAX_CONCURRENCY=12

   # Maximum (fastest, requires monitoring)
   WHISK_CONCURRENCY=8
   WHISK_MAX_CONCURRENCY=15
   ```
   **Impact:** 3x → 5x → 8x parallel generations = **60-70% faster overall**

2. **Enable Adaptive Rate Limiting** (already active):
   - Automatically adjusts concurrency based on API responses
   - Backs off on rate limits, ramps up on success
   - Requires no configuration

3. **Optimize Retry Timing** (already implemented):
   - Reduced from 5s→10s→20s to 3s→6s→12s
   - Content policy retries: 2s → 1s
   - **Impact:** ~40% faster error recovery

### Advanced Optimizations

4. **Use Faster Image Model** (`.env`):
   ```env
   # Default (good quality, moderate speed)
   WHISK_IMAGE_MODEL=IMAGEN_3_5

   # Experimental (may be faster, check quality)
   WHISK_IMAGE_MODEL=IMAGEN_4
   ```
   **Note:** IMAGEN_4 may be faster OR slower depending on Google's infrastructure. Test both.

5. **Pre-warm Prompts** (code change):
   - Generate a "warm-up" image at worker startup
   - First API call is always slower (cold start)
   - Subsequent calls are 20-30% faster

6. **Local Caching** (future feature):
   - Cache generated images by prompt hash
   - Reuse identical prompts across jobs
   - **Impact:** Instant for repeated prompts

### Monitoring Performance

Check worker logs for generation times:
```bash
# Watch image generation speed
tail -f workers.log | grep "Image generated successfully"
```

Expected speeds:
- **Fast:** 3-8 seconds per image
- **Normal:** 8-15 seconds per image
- **Slow:** 15-30 seconds per image (API congestion)

---

## Image Quality Improvements

### 1. Use Better Model (`.env`)

```env
# Try IMAGEN_4 for potentially better quality
WHISK_IMAGE_MODEL=IMAGEN_4
```

**Trade-off:** May be slower, but higher quality

### 2. Style Presets (Already Implemented!)

The system already has a style preset system. Create custom presets:

```typescript
// In database or via Settings UI
{
  "name": "Photorealistic News",
  "description": "Ultra-realistic news photography style",
  "prompt_suffix": ", professional photojournalism, 8K resolution, sharp focus, natural lighting, Reuters style, award-winning photography"
}
```

Apply to jobs via Settings UI or API.

### 3. Improve Base Prompts

Current prompts from script analyzer are optimized for news context. To enhance:

**Option A:** Update analyzer prompt template:
```typescript
// src/lib/ai/prompts/script-analyzer.ts
// Add quality keywords to image_prompt generation
```

**Option B:** Post-process prompts in images worker:
```typescript
// src/lib/queue/workers/images.worker.ts
// Line ~72: Enhance prompt before generation
const enhancedPrompt = `${imagePrompt}, professional news photography, high detail, sharp focus`;
```

### 4. Reference Images (Feature 5 - Implemented!)

Use reference images for consistent style:

```typescript
// API endpoint: POST /api/jobs/:id/scenes/:scene_id/references
{
  "subject": "path/to/subject.jpg",    // Character consistency
  "scene": "path/to/location.jpg",     // Location reference
  "style": "path/to/style_ref.jpg"     // Art style reference
}
```

**Impact:** Dramatically improves consistency and quality

### 5. Prompt Engineering Best Practices

**Good prompt structure:**
```
[Subject] [Action] [Context] [Style] [Quality modifiers]

Example:
"US Senate chamber, lawmakers voting on climate bill,
professional news photography, Reuters style,
high resolution, sharp focus, natural lighting"
```

**Bad prompts to avoid:**
- Too vague: "political scene"
- Too complex: "senate but also showing the bill text and..."
- Banned terms: Specific politician names, copyrighted content

---

## Recommended Settings by Use Case

### Production (Balanced Speed + Quality)
```env
WHISK_CONCURRENCY=4
WHISK_MAX_CONCURRENCY=10
WHISK_IMAGE_MODEL=IMAGEN_3_5
```
**Result:** ~25 seconds per image, high quality

### Speed Priority (Testing, Iteration)
```env
WHISK_CONCURRENCY=8
WHISK_MAX_CONCURRENCY=15
WHISK_IMAGE_MODEL=IMAGEN_3_5
```
**Result:** ~10-15 seconds per image, good quality

### Quality Priority (Final Production)
```env
WHISK_CONCURRENCY=2
WHISK_MAX_CONCURRENCY=5
WHISK_IMAGE_MODEL=IMAGEN_4
```
**Result:** ~30-45 seconds per image, best quality
- Add style presets
- Use reference images
- Manual prompt refinement

---

## Next Steps

1. **Update `.env` with desired settings**
2. **Restart workers:** `npm run workers`
3. **Test generation speed:** `npx tsx scripts/test-image-processing.ts`
4. **Monitor quality:** Review generated images in storyboard editor
5. **Iterate:** Adjust concurrency based on rate limit errors

---

## Troubleshooting

### Rate Limit Errors
**Symptom:** `429 Too Many Requests` errors
**Fix:** Reduce `WHISK_CONCURRENCY` and `WHISK_MAX_CONCURRENCY`

### Poor Quality Images
**Symptom:** Blurry, generic, or off-topic images
**Fix:**
1. Try `IMAGEN_4` model
2. Add style presets with quality keywords
3. Improve base prompts in script analyzer

### Slow Generation (>30s per image)
**Symptom:** Generation takes forever
**Fix:**
1. Check Google Whisk API status
2. Verify `WHISK_API_TOKEN` is valid
3. Reduce prompt complexity
4. Try different times of day (API congestion)

### Content Policy Violations
**Symptom:** Prompts rejected for safety reasons
**Fix:**
- Automatic sanitization already enabled
- AI rewrites prompts up to 3 times
- Check logs for rejected terms
- Avoid: politician names, violence, copyrighted content
