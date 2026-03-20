# Phase 5: Remotion Render Engine - Documentation

The Remotion Render Engine composes the final video by combining background scenes, avatar overlay, and scrolling ticker with precise timing.

## Overview

**Purpose:** Generate production-ready MP4 videos from approved content
**Technology:** Remotion 4 (React-based video composition)
**Output:** 1920x1080 H.264 MP4 video

## Architecture

### Component Hierarchy

```
NewsVideo (Main Composition)
├── Scene[] (Background images with Ken Burns)
├── AvatarOverlay (HeyGen avatar with chromakey)
└── Ticker (Scrolling headlines)
```

### Pacing Algorithm (Critical)

**Hook Period (0-15s):**
- Rapid image transitions
- 1.5 seconds per image
- Creates engaging opening

**Body Period (15s+):**
- Slower, sentence-based transitions
- Duration = (total - 15s) / remaining scenes
- Matches natural speech pacing

**Example:**
```
60s video, 12 scenes:
- Hook: 10 scenes × 1.5s = 15s
- Body: 2 scenes × 22.5s = 45s
- Total: 60s ✓
```

## Components

### 1. Pacing Calculator (`pacing.ts`)

**Function:** `calculateScenePacing()`

```typescript
const pacing = calculateScenePacing(
  60,  // avatar duration in seconds
  12,  // scene count
  30   // fps
);

// Returns:
{
  totalDurationInFrames: 1800,
  totalDurationInSeconds: 60,
  sceneTiming: [
    { sceneId, startFrame: 0, durationInFrames: 45, durationInSeconds: 1.5 },
    { sceneId, startFrame: 45, durationInFrames: 45, durationInSeconds: 1.5 },
    // ... 8 more hook scenes
    { sceneId, startFrame: 450, durationInFrames: 675, durationInSeconds: 22.5 },
    { sceneId, startFrame: 1125, durationInFrames: 675, durationInSeconds: 22.5 },
  ],
  hookScenes: 10,
  bodyScenes: 2
}
```

**Helper:** `getVideoDuration()`
```typescript
const duration = await getVideoDuration(avatarMp4Url);
// Uses Remotion's getVideoMetadata to extract duration
```

---

### 2. Scene Component (`Scene.tsx`)

Displays background images with Ken Burns effect.

**Props:**
```typescript
{
  imageUrl: string;
  durationInFrames: number;
  enableKenBurns?: boolean;  // default: true
}
```

**Ken Burns Effect:**
- Zoom: 1.0 → 1.1 (10% zoom in)
- Pan horizontal: 0 → ±30px (alternating direction)
- Pan vertical: 0 → -15px (slight upward)
- Smooth interpolation using Remotion's `interpolate()`

**Implementation:**
```typescript
const scale = interpolate(progress, [0, 1], [1.0, 1.1]);
const translateX = interpolate(progress, [0, 1], [0, 30 * direction]);
const translateY = interpolate(progress, [0, 1], [0, -15]);

transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`
```

---

### 3. Avatar Overlay (`AvatarOverlay.tsx`)

HeyGen avatar video in bottom-right corner.

**Props:**
```typescript
{
  avatarMp4Url: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: { width: string; height: string };  // default: 25% × 35%
}
```

**Positioning:**
- Bottom-right: 40px from right, 80px from bottom (above ticker)
- Size: 25% width, 35% height of viewport
- Object-fit: contain (preserves aspect ratio)

**Chromakey (Green Screen):**

**Current Implementation:** CSS filters (basic)
```typescript
filter: 'saturate(0.9) contrast(1.05) brightness(1.05)'
```

**Production Recommendation:** WebGL shader
- Detect green pixels in HSV color space
- Alpha transparency for green range
- Edge feathering for smooth compositing

---

### 4. Ticker Component (`Ticker.tsx`)

Scrolling news ticker at bottom.

**Props:**
```typescript
{
  headlines: string[];
  speed?: number;              // pixels per frame (default: 2)
  backgroundColor?: string;    // default: #353535
  textColor?: string;          // default: #FFFFFF
  separator?: string;          // default: ' • '
}
```

**Scrolling Logic:**
```typescript
// Combine headlines
const tickerText = headlines.join(' • ');

// Calculate scroll
const scrollX = width - (frame * speed);

// Seamless loop: render two copies
<div transform={`translateX(${scrollX}px)`}>{tickerText}</div>
<div transform={`translateX(${scrollX + textWidth + width}px)`}>{tickerText}</div>
```

**Styling:**
- Font: Inter, 16px, bold, uppercase
- Letter-spacing: 0.1em
- Text shadow for readability
- Height: 60px

---

### 5. NewsVideo Composition (`NewsVideo.tsx`)

Main composition that combines all elements.

**Props:**
```typescript
{
  avatarMp4Url: string;
  avatarDurationSeconds: number;
  scenes: Array<{
    id: string;
    image_url: string;
    ticker_headline: string;
    scene_order: number;
  }>;
}
```

**Render Structure:**
```tsx
<AbsoluteFill>
  {/* Background scenes (sequenced) */}
  {scenes.map(scene => (
    <Sequence from={scene.timing.startFrame} duration={scene.timing.durationInFrames}>
      <Scene imageUrl={scene.image_url} />
    </Sequence>
  ))}

  {/* Avatar overlay (full duration) */}
  <AvatarOverlay avatarMp4Url={avatarMp4Url} />

  {/* Ticker (full duration) */}
  <Ticker headlines={headlines} />
</AbsoluteFill>
```

---

## Render Process

### Render Orchestration (`render.ts`)

**Function:** `renderNewsVideo()`

**Steps:**
1. Get avatar duration from MP4 metadata
2. Bundle Remotion project with webpack
3. Get/create NewsVideo composition
4. Render to MP4 with H.264 codec
5. Return output path and metadata

**Configuration:**
```typescript
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: './tmp/{jobId}.mp4',
  concurrency: 2,  // from env: REMOTION_CONCURRENCY
  onProgress: ({ progress }) => {
    console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
  }
});
```

---

### Render Worker (`render.worker.ts`)

**Queue:** `queue_render`
**Concurrency:** 1 (CPU-intensive, one at a time)
**Rate Limit:** 5 jobs per minute

**Workflow:**
```
1. Fetch job from database
   - Get avatar_mp4_url
   - Get all scenes (sorted by scene_order)

2. Validate data
   - Avatar URL exists
   - All scenes have image_url

3. Render video
   - Call renderNewsVideo()
   - Monitor progress

4. Upload to R2
   - Key: videos/{jobId}.mp4
   - Get public URL

5. Update database
   - Set final_video_url
   - Change status: rendering → completed

6. Cleanup
   - Delete local MP4 file
```

**Error Handling:**
- Catches render failures
- Updates job status to 'failed'
- Stores error_message in database
- Throws error for BullMQ retry logic

---

## Output Specifications

**Video:**
- Resolution: 1920×1080 (Full HD)
- Frame rate: 30 FPS
- Codec: H.264
- Duration: Matches avatar video exactly

**Audio:**
- From avatar MP4 (HeyGen voiceover)
- Sample rate: 48kHz (HeyGen requirement)
- No additional audio processing

**File Size:**
- Typical 60s video: 10-20 MB
- Depends on scene complexity and motion

---

## Testing

**Test Pacing Algorithm:**
```typescript
import { testPacing } from '@/lib/remotion/pacing';
testPacing();
```

**Test Single Composition (Remotion Preview):**
```bash
npm run remotion:preview
# Opens Remotion Studio at localhost:3000
```

**Test Full Render:**
```bash
# Requires completed job with avatar uploaded
# Worker will process automatically when queued
```

---

## Performance

**Render Times (approximate):**
- 60s video: 2-5 minutes
- 120s video: 5-10 minutes
- Depends on: CPU cores, scene count, effects complexity

**Optimization:**
- Concurrency: Set `REMOTION_CONCURRENCY=4` for faster rendering (uses more CPU)
- Scene caching: Remotion caches frames automatically
- GPU acceleration: Not currently used (CPU-only rendering)

**Resource Usage:**
- CPU: 100% during render (multi-core)
- RAM: ~2-4 GB per render
- Disk: Temporary files in `./tmp/` (cleaned after upload)

---

## Troubleshooting

**Issue: Bundling fails**
- Check TypeScript compilation
- Verify all imports resolve
- Ensure remotion packages installed

**Issue: Video duration mismatch**
- Verify avatar duration extraction
- Check pacing calculation
- Ensure FPS is consistent (30)

**Issue: Ken Burns too fast/slow**
- Adjust interpolation in Scene component
- Modify zoom range [1.0, 1.1]
- Change pan distances

**Issue: Ticker not scrolling**
- Verify speed parameter (default: 2px/frame)
- Check text width calculation
- Ensure two copies rendered

**Issue: Avatar chromakey artifacts**
- Current CSS filter is basic
- Implement WebGL shader for production
- Adjust HSV thresholds for green range

**Issue: Render timeout**
- Increase `REMOTION_TIMEOUT_MS` in .env
- Reduce concurrency to lower memory usage
- Split into smaller jobs

---

## Customization

**Change Video Resolution:**
```typescript
// In NewsVideo composition
const width = 1280;   // 720p
const height = 720;
```

**Adjust Ken Burns:**
```typescript
// In Scene.tsx
const scale = interpolate(progress, [0, 1], [1.0, 1.2]); // More zoom
const translateX = interpolate(progress, [0, 1], [0, 50]); // More pan
```

**Change Ticker Speed:**
```tsx
<Ticker headlines={headlines} speed={3} />  // Faster
```

**Modify Hook Duration:**
```typescript
// In pacing.ts
const HOOK_DURATION_SECONDS = 20;  // Longer hook
const HOOK_INTERVAL_SECONDS = 2.0; // Slower transitions
```

---

## Next Steps

With Phase 5 complete:
- **Phase 6:** Build React frontend UI
- **Phase 7:** End-to-end testing
- **Production:** Deploy to cloud infrastructure

## References

- [Remotion Documentation](https://www.remotion.dev/)
- [Ken Burns Effect](https://en.wikipedia.org/wiki/Ken_Burns_effect)
- [Chromakey Compositing](https://en.wikipedia.org/wiki/Chroma_key)
