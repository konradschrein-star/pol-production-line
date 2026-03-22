# Reference Images User Guide

## What Are Reference Images?

Reference images are example images you provide to guide the AI's image generation process. Instead of relying solely on text descriptions, the AI analyzes your reference images to understand exactly what you want.

## Types of References

### 📸 Subject Reference
**Controls:** The main object, person, or character in the scene

**Use when you want:**
- A specific person to appear in all scenes
- Consistent product appearance across images
- Same vehicle, building, or object in multiple shots

**Example:**
- Upload: Professional headshot of your news anchor
- Result: AI generates scenes featuring that exact person

### 🏞️ Scene Reference
**Controls:** The background, environment, and spatial composition

**Use when you want:**
- Consistent location/setting
- Specific architectural style
- Particular lighting and atmosphere

**Example:**
- Upload: Photo of a modern newsroom
- Result: All scenes have newsroom-style backgrounds

### 🎨 Style Reference
**Controls:** Overall visual aesthetic, color palette, and artistic treatment

**Use when you want:**
- Consistent artistic style (cartoon, photorealistic, watercolor, etc.)
- Specific color grading or mood
- Particular visual treatment (vintage, modern, minimalist, etc.)

**Example:**
- Upload: Political cartoon illustration
- Result: All scenes rendered in political cartoon style

## How to Upload References

### Step 1: Navigate to Storyboard Editor
After creating a broadcast and generating scenes, you'll see a grid of scene cards.

### Step 2: Expand Reference Section
On each scene card, click "Reference Images" to expand the upload section.

### Step 3: Upload Images
Click "Add" under Subject, Scene, or Style to upload an image:
- Supported formats: JPEG, PNG, WebP
- Recommended size: 512x512 or larger
- Max file size: 10MB

### Step 4: Regenerate
After uploading references, click "Regenerate" to generate a new image using the references.

## Tips for Best Results

### Subject References

✅ **DO:**
- Use high-resolution photos (min 512x512)
- Choose well-lit, clear images
- Keep the subject prominent and centered
- Use frontal or 3/4 angle shots

❌ **DON'T:**
- Use blurry or low-quality images
- Include multiple subjects (confuses the AI)
- Use images with heavy filters or edits
- Choose images with cluttered backgrounds

**Example Use Cases:**
- News anchor consistency across all scenes
- Product shot for commercial broadcasts
- Celebrity or public figure appearance
- Branded mascot or character

### Scene References

✅ **DO:**
- Use images with clear composition
- Choose photos with good depth and perspective
- Include strong lighting and atmosphere
- Keep the focus on environment, not people

❌ **DON'T:**
- Use crowded scenes with many subjects
- Choose images with poor lighting
- Use abstract or unclear compositions
- Include copyrighted locations (if public use)

**Example Use Cases:**
- Newsroom desk setup
- White House briefing room
- City skyline backdrop
- Studio set design

### Style References

✅ **DO:**
- Choose images with distinctive visual style
- Use art with clear technique (watercolor, sketch, etc.)
- Pick references with strong color palette
- Select images that represent the desired mood

❌ **DON'T:**
- Use generic or neutral-style photos
- Choose low-contrast or washed-out images
- Mix multiple conflicting styles
- Use copyrighted artwork (respect licenses)

**Example Use Cases:**
- Political cartoon aesthetic
- Vintage newsreel look
- Modern flat design
- Dramatic cinematic style

## Combining References

You can use **all three reference types together** for maximum control:

**Example Combination:**
- **Subject:** Headshot of news anchor
- **Scene:** Modern newsroom background
- **Style:** Broadcast television aesthetic

**Result:** AI generates the specific anchor in a newsroom setting with TV broadcast visual style.

## Managing References

### Removing References
Hover over a reference thumbnail and click the X button to remove it.

### Updating References
Upload a new reference to replace the existing one.

### Viewing Active References
Green badge shows how many references are active for each scene.

## Common Questions

### Q: Do I need to use all three reference types?
**A:** No! Use any combination. Even one reference type improves results.

### Q: Can I use the same references for all scenes?
**A:** Yes! Upload once per scene, or use job-level library (coming in Phase 1.1).

### Q: What if my generated image doesn't match the reference?
**A:** Try:
- Higher quality reference image
- More distinctive reference features
- Adjust text prompt to complement references
- Try different reference images

### Q: How long does generation take with references?
**A:** About 10-20 seconds longer than text-only (40-110 seconds total).

### Q: Are my reference images stored in the cloud?
**A:** No! All references are stored locally on your machine.

### Q: Can I use photos I found online?
**A:** Legally, you should only use:
- Your own photos
- Public domain images
- Licensed stock photos
- Images you have permission to use

## Workflow Examples

### Example 1: Political News Broadcast

**Goal:** Consistent branding across all scenes

**Setup:**
1. Create broadcast with 5 scenes
2. Upload style reference: Political cartoon illustration
3. Upload scene reference: Capitol building background
4. Generate all scenes
5. Result: Cartoon-style political news with consistent aesthetic

### Example 2: Product Demo Video

**Goal:** Feature specific product in multiple contexts

**Setup:**
1. Create broadcast with product demonstration script
2. Upload subject reference: Professional product photo
3. Generate scenes with different text prompts (kitchen, office, outdoor)
4. Result: Same product shown in various environments

### Example 3: Celebrity Interview

**Goal:** Show celebrity in interview setting

**Setup:**
1. Upload subject reference: Celebrity headshot
2. Upload scene reference: Talk show set
3. Generate scenes with interview-related prompts
4. Result: Celebrity in talk show environment

## Troubleshooting

### "Upload failed"
- Check file format (JPEG, PNG, WebP only)
- Verify file size (under 10MB)
- Ensure stable internet connection

### "Reference not applied"
- Verify reference uploaded (check for green badge)
- Try regenerating the scene
- Check that file path is accessible

### "Generated image looks wrong"
- Try higher quality reference image
- Use more distinctive reference features
- Simplify your reference (less complex images work better)
- Adjust text prompt to complement reference

### "Generation is slow"
- Normal with references (40-110 seconds)
- Check network connection
- Verify workers are running: `npm run workers`

## Advanced Tips

### Tip 1: Reference Resolution
Higher resolution references = better results. Aim for:
- Minimum: 512x512 pixels
- Recommended: 1024x1024 pixels
- Maximum: 2048x2048 pixels (diminishing returns above this)

### Tip 2: Reference Clarity
AI focuses on dominant visual features:
- Clear subjects work better than subtle details
- High contrast references are easier to interpret
- Simple compositions outperform complex ones

### Tip 3: Text + Reference Synergy
Your text prompt still matters! Use it to:
- Specify pose, action, or context
- Add details not visible in reference
- Control elements the reference doesn't cover

**Example:**
- Reference: News anchor headshot
- Prompt: "News anchor sitting at desk, gesturing enthusiastically, evening news broadcast"
- Result: Reference face + prompt action/setting

### Tip 4: Iterative Refinement
Don't expect perfection on first try:
1. Generate with basic references
2. Identify what works/doesn't work
3. Adjust references or prompt
4. Regenerate
5. Repeat until satisfied

## Next Steps

- **Try it out:** Upload your first reference and see the difference!
- **Experiment:** Test different reference types and combinations
- **Share feedback:** Help us improve the reference system
- **Read full docs:** `docs/WHISK_INTEGRATION.md` for technical details

---

**Need Help?**
- Check logs: `npm run workers`
- Review integration guide: `docs/WHISK_INTEGRATION.md`
- Inspect database: Check `reference_images` column in `news_scenes` table
