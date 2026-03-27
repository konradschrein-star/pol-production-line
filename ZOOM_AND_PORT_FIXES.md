# Ken Burns Zoom & Port Configuration Fixes

## Summary of Changes

### ✅ 1. Fixed Ken Burns Zoom Animation

**Problem:**
- Zoom was progress-based (0-100% of scene duration), not time-based
- Short scenes (2-3s) zoomed too fast
- Long scenes (10s+) zoomed too slow
- Inconsistent visual experience

**Solution:**
Implemented **constant time-based zoom rate**:

```typescript
// BEFORE (Progress-based):
// 2s scene: zoom 1.0 → 1.1 in 2 seconds (FAST)
// 10s scene: zoom 1.0 → 1.1 in 10 seconds (SLOW)

// AFTER (Time-based):
// All scenes: 0.3% zoom per second for first 30s
// After 30s: 0.1% zoom per second (slower for long scenes)
```

**Key Features:**
- ✅ Always starts at **100% scale** (no black bars)
- ✅ **Never goes below 100%** (no letterboxing)
- ✅ Constant zoom rate across all scenes
- ✅ Two-phase zoom:
  - **Phase 1 (0-30s):** 0.003/sec = 0.3%/sec = 9% total zoom in 30s
  - **Phase 2 (30s+):** 0.001/sec = 0.1%/sec = slower for long videos
- ✅ Minimal pan (slight 10px upward drift for subtle life)

**Example Zoom Progression:**
```
Time    | Scale  | Description
--------|--------|------------------
0s      | 1.000  | 100% (fills screen)
3s      | 1.009  | 100.9% (short scene)
10s     | 1.030  | 103% (medium scene)
30s     | 1.090  | 109% (hook period end)
60s     | 1.120  | 112% (longer scene)
90s     | 1.150  | 115% (very long scene)
```

**Modified Files:**
- `src/lib/remotion/components/Scene.tsx` - Rewrote zoom calculation

---

### ✅ 2. Fixed Port Conflict (Remotion vs Next.js)

**Problem:**
- Remotion bundler used port **3000** (default)
- Next.js dev server also uses port **3000**
- Cannot run both simultaneously → conflict

**Solution:**
Configured Remotion to use **port 8765**:

```typescript
// remotion.config.ts
Config.setPort(8765);
```

**Result:**
- ✅ Remotion: http://localhost:**8765**
- ✅ Next.js: http://localhost:**3000**
- ✅ No more port conflicts!

**Modified Files:**
- `remotion.config.ts` - Added port configuration

---

## Testing the Fixes

### Test 1: Verify Constant Zoom Rate

Run a quick test render (first 3 seconds):
```bash
npx remotion render src/lib/remotion/index.ts NewsVideo test-zoom.mp4 \
  --props=render-props.json \
  --frames=0-90 \
  --codec h264
```

**What to verify:**
- ✅ Image fills entire frame at start (100% scale)
- ✅ Zoom is subtle and consistent
- ✅ No black bars at any point
- ✅ Short scenes zoom at same rate as long scenes

### Test 2: Verify No Port Conflicts

**Terminal 1:**
```bash
npm run dev
# Should start on http://localhost:3000
```

**Terminal 2:**
```bash
npm run workers
# Workers run (no HTTP port)
```

**Terminal 3:**
```bash
npx remotion render src/lib/remotion/index.ts NewsVideo output.mp4 \
  --props=render-props.json
# Should bundle on http://localhost:8765 (no conflict!)
```

---

## Zoom Rate Configuration

If you want to adjust the zoom rate, edit `src/lib/remotion/components/Scene.tsx`:

```typescript
// Current settings:
const ZOOM_RATE_FAST = 0.003; // 0.3% per second (0-30s)
const ZOOM_RATE_SLOW = 0.001; // 0.1% per second (30s+)
const TRANSITION_TIME = 30;   // Switch to slow rate at 30s

// Examples:

// SLOWER ZOOM (more subtle):
const ZOOM_RATE_FAST = 0.002; // 0.2% per second
const ZOOM_RATE_SLOW = 0.0005; // 0.05% per second

// FASTER ZOOM (more dramatic):
const ZOOM_RATE_FAST = 0.005; // 0.5% per second
const ZOOM_RATE_SLOW = 0.002; // 0.2% per second

// SINGLE RATE (no transition):
const ZOOM_RATE_FAST = 0.0025;
const ZOOM_RATE_SLOW = 0.0025; // Same rate throughout
const TRANSITION_TIME = 999999; // Never transition
```

---

## Port Configuration

If port 8765 is also taken, change in `remotion.config.ts`:

```typescript
Config.setPort(8080);  // Or 9000, 5000, etc.
```

Common ports to avoid:
- ❌ 3000 - Next.js dev server
- ❌ 6379 - Redis
- ❌ 5432 - PostgreSQL
- ❌ 8080 - Common alternative (may be taken)
- ✅ 8765 - Recommended (Whisk API port, but local only)
- ✅ 9000-9999 - Usually safe

---

## Visual Comparison

### Before (Progress-based zoom):
```
Scene 1 (2s):  [====] 1.0 → 1.1 (FAST zoom)
Scene 2 (10s): [====================] 1.0 → 1.1 (SLOW zoom)
                ↑ Inconsistent visual experience
```

### After (Time-based zoom):
```
Scene 1 (2s):  [====] 1.000 → 1.006 (constant 0.3%/s)
Scene 2 (10s): [====================] 1.000 → 1.030 (constant 0.3%/s)
                ↑ Consistent visual experience
```

---

## Troubleshooting

### "Port 8765 already in use"

**Check what's using it:**
```bash
# Windows
netstat -ano | findstr :8765

# Kill process
taskkill /PID <PID> /F
```

**Or change port:**
Edit `remotion.config.ts` and use a different port.

### "Images still have black bars"

**Verify Scene.tsx changes:**
1. Check `objectFit: 'cover'` is set (not 'contain')
2. Check zoom never goes below 1.0
3. Clear Remotion cache: `rm -rf node_modules/.cache/remotion`

### "Zoom is too fast/slow"

Adjust `ZOOM_RATE_FAST` and `ZOOM_RATE_SLOW` in `Scene.tsx`.

Current values (0.003 and 0.001) are conservative and subtle.

---

## Next Steps

1. ✅ **Test the fixes:**
   ```bash
   # Quick 3-second test
   npx remotion render src/lib/remotion/index.ts NewsVideo test.mp4 \
     --props=render-props.json --frames=0-90
   ```

2. ✅ **Run full pipeline:**
   ```bash
   # Start workers
   npm run workers

   # Start dev server (different port now!)
   npm run dev

   # Create a test job via UI
   ```

3. ✅ **Verify no port conflicts:**
   - Dev server: http://localhost:3000
   - Remotion: http://localhost:8765 (only during renders)

4. ✅ **Fine-tune zoom rate if needed:**
   - Edit `ZOOM_RATE_FAST` and `ZOOM_RATE_SLOW` in Scene.tsx
   - Test with short and long scenes
   - Iterate until visually perfect

---

## Files Modified

1. **src/lib/remotion/components/Scene.tsx**
   - Rewrote zoom calculation to be time-based
   - Always starts at 1.0 (100%)
   - Two-phase zoom rate (0.3%/s then 0.1%/s)

2. **remotion.config.ts**
   - Added `Config.setPort(8765)` to avoid port 3000 conflict

That's it! Constant zoom + no port conflicts. 🎉
