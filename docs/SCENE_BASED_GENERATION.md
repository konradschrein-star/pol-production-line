# Scene-Based Image Generation & Sentence-Level Mapping

## Overview

This document describes the **Scene-Based Image Generation** system (implemented March 25, 2026) that transforms the video production pipeline from topic-based to intelligent sentence-based image generation.

## Problem Statement

### Issues with Previous System

1. **Poor Scene Coverage**
   - AI generated ~13 topic-based scenes for 99-second video
   - Last scene was 26 seconds long (static image for 26% of video)
   - Only 70% of video had varied images

2. **Content-Image Mismatch**
   - Time-based pacing ignored semantic content
   - Wrong images appeared when topics were discussed
   - Images transitioned mid-sentence

3. **AI-Looking Images**
   - Generic prompts without photographic details
   - No camera/lens/lighting specifications
   - Lacked broadcast news aesthetic

## Solution Architecture

### High-Level Approach

The system uses **scene-based context with sentence-level mapping**:

1. **Group script into broader scenes** (4-7 sentences each) for CONTEXT
2. **Generate N image prompts per scene** where N = sentence count
3. **Map each prompt to its sentence** (1:1 mapping)
4. **Special hook handling**: First 30s uses sub-sentence splitting (1.5s/image)
5. **Visual consistency**: Images within scene share visual theme
6. **Shot variety**: Vary shot types and camera angles within scenes

### Visual Consistency Example

```
Scene 2 (sentences 8-14): Climate bill economic impact
Context: "Economists debate bill. Goldman Sachs projects job growth. Heritage Foundation warns..."

AI generates 7 prompts with shared theme (financial district, cool tones):
- Prompt 1 (sent 8): "Wide shot of financial district skyscrapers at dusk..."
- Prompt 2 (sent 9): "Closeup of economist reviewing charts in office..."
- Prompt 3 (sent 10): "Low angle shot of office building with lit windows..."
- Prompt 4 (sent 11): "Detail shot of economic projection graphs on screen..."
- Prompt 5 (sent 12): "High angle shot of trading floor activity..."
- Prompt 6 (sent 13): "Medium shot of business meeting in conference room..."
- Prompt 7 (sent 14): "Wide shot from office window overlooking cityscape..."

Result: Contextually accurate + visually consistent + varied perspectives
```

## Implementation Details

### Phase 1: Scene Segmentation

**File:** `src/lib/ai/scene-segmenter.ts`

**Key Functions:**
- `segmentIntoScenes()` - Groups sentences into broad scenes
- `splitIntoSubSentences()` - Splits sentences for hook phase
- `calculateHookBoundary()` - Determines hook/body split
- `inferVisualTheme()` - Analyzes content for visual consistency
- `flattenScenePrompts()` - Converts scene-based output to flat format

**Hook Handling:**
- First 30 seconds of content identified
- Sentences split into 2-3 sub-sentences each
- Each sub-sentence gets 1.5s duration = rapid pacing

**Body Handling:**
- Remaining sentences grouped into scenes (4-7 sentences each)
- Natural topic boundaries detected
- Visual themes inferred from content

### Phase 2: Context-Based Multi-Prompt Generation

**File:** `src/lib/ai/prompts/scene-based-analyzer.ts`

**System Prompt Features:**
- Instructs AI to generate N prompts per scene
- Enforces shared visual theme within scenes
- Requires shot type and camera angle variety
- Demands sentence-specific matching (not topic-generic)

**Output Schema:**
```typescript
{
  scene_id: number;
  scene_context: string;
  visual_theme: {
    setting: string;
    mood: string;
    color_palette: string;
    time_of_day: string;
  };
  sentence_prompts: [
    {
      sentence_id: number;
      sentence_text: string;
      image_prompt: string;  // Detailed with photography specs
      shot_type: "establishing" | "medium" | "closeup" | "detail";
      ticker_headline: string;
      camera_angle: string;
      visual_continuity_notes: string;
    }
  ];
}
```

### Phase 3: Photographic Realism Enhancement

**File:** `src/lib/ai/prompts/visual-guidelines.ts`

**New Constant:** `BROADCAST_PHOTOGRAPHY_SPECS`

**Specifications Added:**
- **Camera**: ENG camera types, lens focal lengths (24mm-85mm), aperture settings
- **Lighting**: Color temperature (4500K-5500K), natural/studio/golden hour
- **Composition**: Rule of thirds, headroom, leading lines, depth cues
- **Production Reality**: Crowded environments, motion blur, lens characteristics
- **Camera Angles**: Eye level, high/low angles, profile, over-shoulder, Dutch
- **Avoid AI Tells**: Perfect symmetry, oversaturation, extreme bokeh, sterile environments
- **Reality Checks**: Natural imperfections, environmental context, weather effects

**Enhanced Prompt Example:**
```
"Wide establishing shot of US Capitol building at dusk, shot on broadcast ENG camera
with 24mm lens at f/4, golden hour lighting with warm 4500K temperature, slight natural
vignetting, shot from across Capitol plaza showing full building with foreground
pedestrians slightly out of focus, broadcast color grading with subtle desaturation,
natural imperfections like slight lens flare from building lights, environmental
context with real urban elements visible"
```

### Phase 4: Sentence-Synchronized Pacing

**Status:** Already implemented in `src/lib/remotion/pacing.ts`

**Function:** `calculateTranscriptBasedPacing()`

**How It Works:**
- Parses avatar word timestamps from transcription
- Groups words into sentences
- Assigns each scene to its sentence's time range
- Images transition exactly at sentence boundaries

**Fallback:** Time-based pacing if transcript unavailable

## Usage

### Enable Scene-Based Analysis

**Option 1: Environment Variable**
```bash
# Add to .env
SCENE_BASED_ANALYSIS=true
```

**Option 2: Job-Level Flag**
```typescript
await queueAnalyze.add('analyze-script', {
  jobId: '...',
  rawScript: '...',
  useSceneBased: true,  // Enable for this job
});
```

**Option 3: Provide Avatar Duration**
```typescript
await queueAnalyze.add('analyze-script', {
  jobId: '...',
  rawScript: '...',
  avatarDurationSeconds: 90,  // Known duration
  useSceneBased: true,
});
```

### Legacy Mode

To use the old sentence-based approach:
```bash
# .env
SCENE_BASED_ANALYSIS=false
```

## Architecture Changes

### Type System Updates

**File:** `src/lib/ai/types.ts`

**New Types:**
- `SentencePrompt` - Individual sentence prompt within scene
- `ScenePromptOutput` - Scene with N sentence prompts
- `SceneBasedAnalysisOutput` - Full scene-based response

**Schema Limits Updated:**
- `AIAnalysisOutputSchema.scenes`: max increased from 30 → 60
- `ScenePromptOutputSchema.sentence_prompts`: max 20 per scene
- `SceneBasedAnalysisOutputSchema.scenes`: max 15 broad scenes

### Provider Interface

**File:** `src/lib/ai/types.ts`

**New Method:**
```typescript
interface AIProvider {
  analyzeScriptSceneBased?(
    systemPrompt: string,
    userPrompt: string
  ): Promise<SceneBasedAnalysisOutput>;
}
```

### OpenAI Provider

**File:** `src/lib/ai/providers/openai.ts`

**New Methods:**
- `analyzeScriptSceneBasedWithDuration()` - Main scene-based analysis
- `analyzeScriptSceneBased()` - Interface compliance method

**Process:**
1. Segments script into sentences
2. Groups sentences into broad scenes
3. For each scene, calls AI to generate N prompts
4. Flattens scene-based output to sentence-level format
5. Returns legacy `AIAnalysisOutput` format

### Analyze Worker

**File:** `src/lib/queue/workers/analyze.worker.ts`

**Changes:**
- Added `useSceneBased` flag to job data
- Added `avatarDurationSeconds` optional parameter
- Added `estimateAvatarDuration()` helper (150 words/minute)
- Conditional logic: scene-based vs legacy analysis

## Testing

### Test Scene-Based Generation

```bash
cd obsidian-news-desk

# Enable scene-based mode
echo "SCENE_BASED_ANALYSIS=true" >> .env

# Create test job via UI or API
curl -X POST http://localhost:8347/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "raw_script": "YOUR SCRIPT HERE",
    "use_scene_based": true
  }'
```

### Validation Checks

1. **Scene Count**: Verify scenes ≈ sentence count (not topic count)
2. **Visual Consistency**: Images within same topic share visual style
3. **Photographic Realism**: Prompts include camera/lens/lighting specs
4. **Coverage**: No long static image at end (< 5s for last scene)

### Expected Metrics

**Before (topic-based):**
- Scene count: 10-15
- Last scene duration: 20-30s
- Image realism: 6/10
- Content match: 70%

**After (scene-based):**
- Scene count: 30-50
- Last scene duration: 2-4s
- Image realism: 9/10
- Content match: 95%+

## Rollback Strategy

### Full Rollback

```bash
# .env
SCENE_BASED_ANALYSIS=false
```

### Partial Rollback (disable specific phases)

**Disable photographic specs:**
Edit `src/lib/ai/prompts/scene-based-analyzer.ts`:
```typescript
// Comment out: ${formatPhotographySpecsForPrompt()}
```

**Disable scene grouping:**
Edit `src/lib/ai/scene-segmenter.ts`:
```typescript
// Force all sentences into one scene (no grouping)
export function segmentIntoScenes(...) {
  return [{ id: 0, sentences: allSentences, ... }];
}
```

## Performance Impact

### Analysis Phase

- **Scene segmentation**: +1-2s overhead
- **AI calls**: Proportional to scene count (4-8 scenes vs 1 call)
- **Total analysis time**: +15-30s (for 40 sentence script)

### Image Generation Phase

- **Scene count**: 3x increase (13 → 40 images)
- **Generation time**: 3x increase (~20 min → ~60 min)
- **Whisk API rate limits**: Same (adaptive concurrency handles this)

### Rendering Phase

- **No impact**: Remotion handles 40 images same as 13 images
- **Asset loading**: Negligible difference

## Future Enhancements

1. **Real Avatar Duration**: Use actual avatar MP4 duration instead of estimate
2. **Transcript Integration**: Enable sentence-synchronized pacing by default
3. **Visual Theme Learning**: Learn scene grouping from user edits
4. **Dynamic Scene Sizing**: Adjust 4-7 sentence range based on content density
5. **Reference Image Propagation**: Apply scene visual theme to Whisk references

## Troubleshooting

### AI Generates Too Few Scenes

**Symptom:** Only 10-15 scenes for 40 sentence script

**Cause:** AI ignoring sentence count instruction

**Fix:** Check system prompt includes:
```
You must generate exactly ${sentenceCount} image prompts, one for each sentence below
```

### Visual Inconsistency Within Scenes

**Symptom:** Images in same scene look unrelated

**Cause:** AI not following visual theme constraint

**Fix:** Verify `visual_theme` object in output, strengthen prompt wording

### Images Still Look AI-Generated

**Symptom:** Generic, sterile, oversaturated images

**Cause:** Photographic specs not included in prompts

**Fix:** Check `formatPhotographySpecsForPrompt()` is called in system prompt

### Hook Phase Too Long/Short

**Symptom:** Hook covers more/less than 30s

**Cause:** Incorrect hook boundary calculation

**Fix:** Verify `calculateHookBoundary()` math:
```typescript
const avgDurationPerSentence = avatarDuration / sentenceCount;
const hookSentenceCount = Math.ceil(30 / avgDurationPerSentence);
```

## Migration Path

For existing jobs (created before March 25, 2026):

1. **Database**: No migration needed (schema already supports sentence_text)
2. **Re-analysis**: Jobs can be re-analyzed with scene-based mode
3. **Backwards Compatibility**: Old jobs continue to render correctly

To re-analyze existing job with scene-based mode:
```typescript
// Delete old scenes
await db.query('DELETE FROM news_scenes WHERE job_id = $1', [jobId]);

// Re-queue analysis
await queueAnalyze.add('analyze-script', {
  jobId,
  rawScript: job.raw_script,
  useSceneBased: true,
});
```

## References

- **Plan Document**: `712b7352-e9a7-4047-8bb8-ba51330c4bfe.jsonl` (plan mode transcript)
- **Schema Migration**: `src/lib/db/migrations/008_sentence_to_scene_mapping.sql`
- **Pacing Algorithm**: `docs/PACING_ALGORITHM.md` (if exists)
- **Black Screen Fix**: `docs/BLACK_SCREEN_FIX.md` (related asset preparation work)

---

**Implementation Date:** March 25, 2026
**Status:** ✅ Ready for testing
**Backward Compatible:** Yes (via `useSceneBased` flag)
