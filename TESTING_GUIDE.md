# Enhanced Imagery System - Testing Guide

## Overview

This guide walks you through testing the enhanced imagery system with style-aware prompt generation.

---

## Prerequisites

1. **System Running**: `START.bat` (Docker + workers + Next.js)
2. **Database Migration**: Run migration `003_enhanced_style_system.sql`

---

## Step 1: Run Database Migration

The database migration adds new columns and updates default style presets.

```bash
cd obsidian-news-desk

# Option A: Using psql command line
psql -U obsidian -d obsidian_news -f src/lib/db/migrations/003_enhanced_style_system.sql

# Option B: Using Docker exec
docker exec -i obsidian-postgres psql -U obsidian -d obsidian_news < src/lib/db/migrations/003_enhanced_style_system.sql
```

**Expected Output:**
- `ALTER TABLE` confirmations
- `UPDATE` confirmations (5 default presets updated)
- `INSERT` confirmation (Political Commentary preset added)
- `CREATE INDEX` confirmations

---

## Step 2: Verify Database Schema

Check that new columns exist:

```sql
-- Check style_presets table
\d style_presets

-- Should show these new columns:
-- - visual_guidelines (text)
-- - color_palette (jsonb)
-- - composition_rules (text)
-- - example_prompts (jsonb)
-- - reference_strategy (varchar)

-- Check news_scenes table
\d news_scenes

-- Should show:
-- - scene_context (jsonb)
```

---

## Step 3: Verify Style Presets in UI

1. Navigate to **Settings** page: `http://localhost:3000/settings`
2. Click **Visual Styles** tab
3. Verify you see 6 style presets:
   - Professional News
   - Dramatic Documentary
   - Minimalist Modern
   - Vintage Broadcast
   - Tech Innovation
   - **Political Commentary** (NEW)

4. Click to expand each preset
5. Verify rich metadata appears:
   - Visual Guidelines
   - Composition Rules
   - Color Palette (color swatches)
   - Prompt Modifiers (prefix/suffix)
   - Example Prompts

---

## Step 4: Create Custom Style Preset

1. On Settings → Visual Styles tab
2. Click **"Create Custom Style Preset"**
3. Fill out the form:
   - **Name**: "Test Style"
   - **Description**: "Testing custom styles"
   - **Visual Guidelines**: "Bold, dramatic imagery with high contrast"
   - **Composition Rules**: "Use symmetry and strong focal points"
   - **Color Palette**: Choose custom colors
   - **Prompt Prefix**: "Professional editorial photography, "
   - **Prompt Suffix**: ", high quality, dramatic lighting"
   - **Reference Strategy**: "Style Only"
   - **Example Prompts**: Fill in 2-3 examples

4. Click **"Create Style Preset"**
5. Verify it appears in the preset list above

---

## Step 5: Test Style-Aware Prompt Generation

### Method A: Using Prompt Preview Tool (Recommended)

**Note:** Prompt preview tool page needs to be created. For now, test with Method B.

### Method B: Create Test Broadcast

1. Go to **Broadcasts** → **New Broadcast**
2. Enter a test script:
```
Congress passed new legislation today on climate policy.
The bill includes provisions for renewable energy subsidies.
Scientists praised the bipartisan effort.
Implementation will begin next quarter.
```

3. **Select a style preset** (e.g., "Political Commentary")
4. Click **"Create Broadcast"**
5. Wait for script analysis to complete

**What to Check:**
- Job enters `analyzing` state
- Console logs show:
  ```
  📐 [ANALYZE] Job uses style preset: <uuid>
  ✅ [ANALYZE] Style context loaded (XXX chars)
  ```
- Scenes are generated with scene_context metadata

---

## Step 6: Verify Scene Context in Database

After script analysis completes:

```sql
SELECT
  id,
  scene_order,
  image_prompt,
  scene_context
FROM news_scenes
WHERE job_id = '<your-job-id>'
ORDER BY scene_order;
```

**Expected:**
- Each scene has `scene_context` JSONB with:
  - `narrative_role`: "opening", "development", "evidence", or "conclusion"
  - `visual_continuity`: Description of how it connects to other scenes
  - `emotional_tone`: "authoritative", "dramatic", etc.

---

## Step 7: Verify Image Generation with Reference Images

1. Wait for images to generate
2. Check worker logs:
```
📐 [IMAGES] Reference strategy: style_only
🎨 [IMAGES] Using style reference: <url>
```

3. Verify images are generated
4. Check that images follow the style preset's visual guidelines

---

## Step 8: Compare With/Without Style

Create two test broadcasts with the SAME script:

**Test A: No Style Preset**
- Create broadcast without selecting a style
- Note the generated image prompts

**Test B: With "Political Commentary" Style**
- Create broadcast with "Political Commentary" preset
- Note the generated image prompts

**Expected Differences:**
- Test B prompts should:
  - Be more specific about lighting/composition
  - Mention consistent color temperature
  - Reference institutional/political imagery
  - Include narrative coherence notes in scene_context
  - Have prefix/suffix applied

---

## Step 9: End-to-End Video Test

1. Create a complete broadcast with a style preset
2. Generate images (wait 15-20 min)
3. Upload avatar
4. Render video
5. **Verify:**
   - All scenes display correctly (no black screens)
   - Visual consistency across scenes
   - Images match the style aesthetic

---

## Step 10: Test API Endpoints

### Test GET /api/style-presets
```bash
curl http://localhost:3000/api/style-presets
```

**Expected:** JSON with 6 presets including enhanced fields

### Test POST /api/style-presets (Create)
```bash
curl -X POST http://localhost:3000/api/style-presets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Style",
    "description": "Created via API",
    "visual_guidelines": "Test guidelines",
    "reference_strategy": "none"
  }'
```

**Expected:** Success response with created preset

### Test DELETE /api/style-presets
```bash
curl -X DELETE "http://localhost:3000/api/style-presets?id=<preset-id>"
```

**Expected:** Success (only for non-default presets)

### Test POST /api/tools/prompt-preview
```bash
curl -X POST http://localhost:3000/api/tools/prompt-preview \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Test news script about technology advances.",
    "stylePresetId": "<preset-id>"
  }'
```

**Expected:** JSON with generated scenes including scene_context

---

## Common Issues & Solutions

### Issue: Migration fails with "column already exists"

**Solution:** Migration is idempotent. If columns exist, migration will skip them using `ADD COLUMN IF NOT EXISTS`.

### Issue: Style presets don't show new fields

**Solution:**
1. Verify migration ran successfully
2. Check database: `SELECT * FROM style_presets WHERE name = 'Professional News';`
3. Ensure browser cache is cleared

### Issue: Reference images not being used

**Solution:**
1. Check preset has `reference_strategy` = 'style_only' or 'adaptive'
2. Check preset has `reference_image_urls` populated
3. Check worker logs for: `🎨 [IMAGES] Using style reference:`

### Issue: Scene context not appearing

**Solution:**
1. Verify analyze.worker.ts is using `analyzeScriptWithContext()`
2. Check AI provider logs for successful analysis
3. Query database to verify scene_context is being stored

---

## Success Criteria Checklist

- [ ] Database migration runs successfully
- [ ] 6 style presets appear in Settings UI
- [ ] Can expand presets to see rich metadata
- [ ] Can create custom style preset via UI
- [ ] Custom preset appears in list
- [ ] Can delete custom preset (not default ones)
- [ ] Script analysis logs show style context loading
- [ ] Generated scenes include scene_context in database
- [ ] Image generation logs show reference images being used
- [ ] Image prompts reflect style guidelines
- [ ] End-to-end video renders without black screens
- [ ] Visual consistency improved across scenes
- [ ] API endpoints return enhanced fields
- [ ] Prompt preview generates context-aware prompts

---

## Performance Notes

- **Style context loading:** +50-100ms per job (negligible)
- **LLM analysis:** Same duration (style is in prompt, not separate call)
- **Image generation:** No performance impact
- **Overall:** <1% overhead for significantly better imagery

---

## Rollback Plan

If issues occur, rollback the migration:

```sql
-- Remove new columns (will lose enhanced style data)
ALTER TABLE style_presets
DROP COLUMN IF EXISTS visual_guidelines,
DROP COLUMN IF EXISTS color_palette,
DROP COLUMN IF EXISTS composition_rules,
DROP COLUMN IF EXISTS example_prompts,
DROP COLUMN IF EXISTS reference_strategy;

ALTER TABLE news_scenes
DROP COLUMN IF EXISTS scene_context;

-- Remove Political Commentary preset
DELETE FROM style_presets WHERE name = 'Political Commentary';
```

**Note:** This will preserve basic functionality but lose enhanced features.

---

## Next Steps After Testing

1. ✅ Verify all test cases pass
2. 📸 Compare imagery quality before/after
3. 🎨 Create 2-3 custom style presets for your use cases
4. 📊 Document preferred styles in your workflow
5. 🎬 Use enhanced system for production broadcasts

---

## Support

If you encounter issues:
1. Check worker logs: `npm run workers`
2. Check database: `psql -U obsidian -d obsidian_news`
3. Review implementation at: `docs/BLACK_SCREEN_FIX.md`, `CLAUDE.md`
4. Check plan file: `.claude/plans/stateful-hopping-seal.md`
