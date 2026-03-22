# Google Whisk API Integration Guide

## Overview

This system uses the **Google Whisk API** for AI-powered image generation with advanced reference image support. Unlike traditional text-to-image generation, Whisk allows you to guide image creation using reference images for subject, scene, and style.

## Features

- **Reference-Guided Generation**: Upload images to control subject appearance, scene composition, and visual style
- **Multiple AI Models**: Choose between Imagen 3.5 (stable, fast) and Imagen 4 (higher quality, beta)
- **Job-Level Reference Library**: Define default references once, apply to all scenes
- **Scene-Level Overrides**: Customize references for individual scenes
- **Generation Tracking**: Full metadata stored (seed, model, workflow ID) for debugging and reproducibility

## Authentication Setup

### Getting Your Bearer Token

1. **Open Whisk**: Navigate to https://labs.google.com/whisk
2. **Open DevTools**: Press F12 (or Cmd+Option+I on Mac)
3. **Switch to Network Tab**: Click the "Network" tab in DevTools
4. **Generate Test Image**: Create any image in the Whisk UI
5. **Find Request**: Look for a request to `generateImage` in the network log
6. **Copy Token**:
   - Click the request
   - Find the "Authorization" header in the "Headers" tab
   - Copy the ENTIRE value (starts with "Bearer ")
   - Example: `Bearer ya29.a0AfB_byD...` (very long string)

7. **Add to Settings**:
   - Go to Settings page in the app
   - Paste the token in "WHISK API TOKEN" field
   - Click "Save All Settings"
   - Restart workers for changes to take effect

### Token Expiration

⚠️ **Bearer tokens expire periodically** (usually 1-7 days). If image generation fails with authentication errors:

1. Repeat the token extraction steps above
2. Update the token in Settings
3. Resume the paused queue

## Reference Images Guide

### What Are Reference Images?

Reference images guide the AI to generate images that match specific visual characteristics:

- **Subject**: Controls the main object/character appearance
  - Example: Upload a photo of a specific person, and all generated images will feature that person
- **Scene**: Controls the background/environment style
  - Example: Upload a photo of a newsroom, and all scenes will have newsroom-style backgrounds
- **Style**: Controls the overall visual aesthetic
  - Example: Upload a watercolor painting, and all images will be watercolor-style

### How to Use References

#### Option 1: Scene-Level References (Individual Scenes)

1. Navigate to the Storyboard Editor
2. Find the scene you want to customize
3. Click "Reference Images" to expand the section
4. Upload images for Subject, Scene, and/or Style
5. Click "Regenerate" to generate a new image with the references

#### Option 2: Job-Level Reference Library (All Scenes)

⚠️ **Not yet implemented** - Currently only scene-level references are supported. Job-level library is planned for Phase 1.1.

### Best Practices

**Subject References:**
- Use clear, well-lit photos
- Subject should be prominent in the frame
- Avoid cluttered backgrounds
- Example: Headshot of news anchor

**Scene References:**
- Use images with clear composition
- Strong lighting and depth
- Minimal subjects (focus on environment)
- Example: Empty newsroom desk

**Style References:**
- Use images with distinctive visual style
- Strong color palette or artistic technique
- Example: Political cartoon, watercolor art, vintage photo

**Quality Tips:**
- Higher resolution = better results (min 512x512)
- JPEG, PNG, WebP formats supported
- File size limit: 10MB per image
- References are stored locally (no cloud upload)

## API Reference

### Request Format

```typescript
{
  prompt: string;
  aspectRatio?: 'IMAGE_ASPECT_RATIO_LANDSCAPE' | '...';
  referenceImages?: {
    subject?: string;  // Local path or URL
    scene?: string;
    style?: string;
  };
  imageModel?: 'IMAGEN_3_5' | 'IMAGEN_4';
  seed?: number;
}
```

### Response Format

```typescript
{
  images: [
    {
      id: string;
      url: string;
      base64: string;
    }
  ];
  workflowId: string;  // For tracking
  seed: number;        // For reproducibility
  status: 'success' | 'pending' | 'failed';
}
```

### Database Schema

**news_scenes table:**
```sql
reference_images JSONB  -- {"subject": "path", "scene": "path", "style": "path"}
generation_params JSONB -- {"seed": 123, "model": "IMAGEN_3_5", "hadReferences": true}
whisk_request_id VARCHAR(255)  -- Whisk API workflow ID
```

**news_jobs table:**
```sql
reference_library JSONB  -- {"default_subject": "path", ...} (Phase 1.1)
```

## Troubleshooting

### Error: "WHISK_API_TOKEN not set"
- Go to Settings and add your bearer token
- Restart workers: `npm run workers`

### Error: "401 Unauthorized"
- Token expired - get a new token (see "Getting Your Bearer Token" above)
- Update in Settings and restart workers

### Error: "Failed to prepare image data"
- Check that reference image file exists
- Verify file format (JPEG, PNG, WebP only)
- Check file permissions

### Images don't match references
- Ensure references are high quality (min 512x512)
- Try adjusting the text prompt
- Use more distinctive reference images
- Check that references uploaded successfully (look for green badge)

### Generation is slow
- Normal: 30-90 seconds per image
- With references: +10-20 seconds
- Check network connection
- Verify Whisk API is not rate limiting

## Rate Limits

**Current Settings:**
- Concurrency: 1 (sequential generation)
- Delay between requests: 5-10 seconds random
- Retry attempts: 3
- Backoff strategy: Exponential (5s, 10s, 20s)

**Recommended:**
- Keep concurrency at 1 to avoid rate limits
- Don't generate more than 50 images/hour
- If rate limited, worker pauses automatically

## Advanced Usage

### Reproducible Generation

Use the same seed to generate identical images:

```typescript
// First generation
const result1 = await whiskClient.generateImage({
  prompt: "News anchor",
  seed: 12345
});

// Exact same image
const result2 = await whiskClient.generateImage({
  prompt: "News anchor",
  seed: 12345  // Same seed = same image
});
```

### Debugging Failed Generations

Check `generation_params` in database:

```sql
SELECT
  id,
  generation_status,
  generation_params->>'seed' as seed,
  generation_params->>'model' as model,
  whisk_request_id
FROM news_scenes
WHERE generation_status = 'failed';
```

Use `whisk_request_id` to search Whisk logs if available.

## Migration from G-Labs Local

If you were previously using G-Labs Local Application:

1. **No action required** - Whisk API is now the default
2. G-Labs integration is deprecated but not removed
3. Old images remain compatible
4. New jobs automatically use Whisk API
5. See commit history for G-Labs implementation

## Future Features (Phase 2)

- ✨ Job-level reference library
- ✨ Video generation (if Whisk API supports it)
- ✨ Batch reference upload
- ✨ Reference templates (save/reuse sets of references)
- ✨ A/B testing (generate with/without references)

## Support

**Documentation:**
- Integration guide: `docs/WHISK_INTEGRATION.md` (this file)
- Reference guide: `docs/REFERENCE_IMAGES_GUIDE.md`
- Type definitions: `src/lib/whisk/types.ts`

**Code:**
- API client: `src/lib/whisk/api.ts`
- Worker: `src/lib/queue/workers/images.worker.ts`
- API routes: `src/app/api/jobs/[id]/scenes/[scene_id]/references/route.ts`

**Issues:**
- Check worker logs: `npm run workers`
- Check browser console (F12) for frontend errors
- Verify database: `psql $DATABASE_URL -c "SELECT * FROM news_scenes WHERE id='...'"`
