# Animation System - Quick Start Guide

**Status:** ✅ Production Ready
**Last Updated:** 2026-03-22

---

## What's New?

Your videos now have **dynamic animation variety** instead of the same Ken Burns effect on every scene!

### Before vs After

**Before (Fixed):**
- Every scene: 1.0 → 1.1 zoom, same pan direction
- Subtitles: Always slide up
- Ticker: Fixed speed
- Avatar: Static position

**After (Dynamic):**
- 6 different animation patterns per video
- 4 subtitle animation styles
- Variable ticker speed (long headlines = slower)
- Subtle avatar breathing motion

---

## Quick Setup (30 seconds)

### Step 1: Add to `.env`

```bash
# Animation intensity (subtle | moderate | dramatic | disabled)
ANIMATION_PROFILE=moderate
```

### Step 2: Restart your development server

```bash
npm run dev
```

**That's it!** Animations are now enabled.

---

## How It Works

### Scene Animations (Ken Burns)

Your video automatically uses different patterns based on scene position:

```
Scene 0 (Hook):     dramatic-zoom    → Grabs attention
Scene 1 (Hook):     zoom-in-left     → Strong opening
Scene 2 (Hook):     diagonal-drift   → Dynamic movement
Scene 3-6 (Body):   Various patterns → Keeps interest
Scene 7 (Final):    static-slight    → Smooth closure
```

**No code changes needed** - happens automatically!

### Subtitle Animations

Each subtitle gets one of 4 styles:
- **Fade:** Simple fade in/out
- **Slide Up:** Upward slide (20px)
- **Scale:** Zoom from 95% to 100%
- **Blur:** Blur to clear effect

Style is chosen based on text content (same text = same style).

### Ticker Speed

- **Short headlines (≤60 chars):** Fast scroll (3px/frame)
- **Long headlines (>60 chars):** Slow scroll (2px/frame)

Better readability for longer text!

### Avatar Motion

Subtle breathing effect:
- Horizontal: ±8px oscillation
- Vertical: ±6px oscillation
- Period: 10 seconds (slow, natural)

---

## Animation Profiles

Control overall intensity with `ANIMATION_PROFILE`:

| Profile | Best For | Example |
|---------|----------|---------|
| **subtle** | Professional news | Corporate videos, serious topics |
| **moderate** | Balanced (default) | General news broadcasts |
| **dramatic** | Eye-catching | Social media, viral content |
| **disabled** | Static images | Accessibility, low bandwidth |

### Examples

**Subtle (50% intensity):**
```bash
ANIMATION_PROFILE=subtle
```
- Zoom: 1.0 → 1.05 (instead of 1.0 → 1.1)
- Pan: 20px (instead of 40px)

**Dramatic (150% intensity):**
```bash
ANIMATION_PROFILE=dramatic
```
- Zoom: 1.0 → 1.15 (instead of 1.0 → 1.1)
- Pan: 60px (instead of 40px)

**Disabled (0% intensity):**
```bash
ANIMATION_PROFILE=disabled
```
- No zoom, no pan (static images)

---

## Testing Your Setup

### Run the test script

```bash
npx tsx scripts/test-animation-system.ts
```

Should output:
```
✅ All Tests Complete!
Animation System Status: READY
```

### Render a test video

1. Create a job with 8 scenes
2. Complete the pipeline
3. Watch the final video
4. You should see:
   - Different zoom/pan on each scene
   - Subtitle animations vary
   - Ticker speed adjusts
   - Avatar gently moves

---

## Troubleshooting

### Animations too subtle?

```bash
ANIMATION_PROFILE=dramatic
```

### Animations too intense?

```bash
ANIMATION_PROFILE=subtle
```

### Don't want animations?

```bash
ANIMATION_PROFILE=disabled
```

### Avatar jumping around?

Reduce render concurrency in `.env`:
```bash
REMOTION_CONCURRENCY=2
```

---

## Advanced Usage

### Disable specific features

**Disable avatar oscillation:**
```tsx
<AvatarOverlay enablePositionVariation={false} />
```

**Disable Ken Burns on specific scene:**
```tsx
<Scene enableKenBurns={false} />
```

### Check current profile

```typescript
import { getAnimationProfile } from '@/lib/remotion/animations';

const profile = getAnimationProfile();
console.log(`Using ${profile.name} profile`);
```

---

## Performance

**Impact:** Negligible
- No additional render time
- No dropped frames
- No memory increase

Tested: 8 scenes @ 1080p, 30fps on mid-range hardware.

---

## Documentation

**Full documentation:** `ANIMATION_SYSTEM.md`
**Implementation details:** `FEATURE_5_IMPLEMENTATION.md`

---

## FAQ

**Q: Do I need to change my existing code?**
A: No! It's fully backward compatible.

**Q: Will this affect my existing videos?**
A: Only new renders. Existing videos are unchanged.

**Q: Can I customize the patterns?**
A: Not yet, but it's planned for a future update.

**Q: Does this slow down rendering?**
A: No, performance impact is negligible.

**Q: What if I don't set ANIMATION_PROFILE?**
A: Defaults to `moderate` (balanced animations).

---

**Need help?** Check `ANIMATION_SYSTEM.md` for complete documentation.

**Ready to render?** Your next video will automatically have dynamic animations!
