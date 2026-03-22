# Obsidian News Desk - User Guide

**Version:** 1.0
**Last Updated:** March 22, 2026
**Prerequisites:** Complete [Quick Start Guide](QUICK_START.md) first

This comprehensive guide covers all daily operations and workflows for producing professional news broadcasts. Designed for users who have completed initial setup and are ready for production work.

---

## Table of Contents

1. [Creating Broadcasts](#1-creating-broadcasts)
2. [Reviewing and Editing Scenes](#2-reviewing-and-editing-scenes)
3. [Using Reference Images](#3-using-reference-images)
4. [Avatar Generation](#4-avatar-generation)
5. [Final Video & Export](#5-final-video--export)
6. [Managing Broadcasts](#6-managing-broadcasts)
7. [Settings & Configuration](#7-settings--configuration)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Creating Broadcasts

### 1.1 Writing Effective News Scripts

Your script is the foundation of the entire broadcast. Quality scripts produce better results.

#### Length Guidelines

- **Minimum:** 100 characters (system requirement)
- **Optimal:** 150-300 words (60-90 second video)
- **Maximum:** 500 words (longer videos increase render time)

#### Structure Tips

Follow the classic news format:

**Hook (First 15 seconds):**
- Lead with the most important information
- Grab attention immediately
- Example: "Breaking tonight: Historic tech merger sends shockwaves through Silicon Valley"

**Body (Middle section):**
- Provide context and details
- Support main points with facts
- Include multiple angles
- Example: "The $45 billion acquisition of DataFlow by TechCorp raises serious antitrust concerns. Industry experts warn..."

**Conclusion (Final 10-15 seconds):**
- Summarize key takeaway
- Look ahead to future developments
- Example: "Regulatory hearings begin next week. This is Sarah Chen reporting."

#### What Makes Good News Content

✅ **DO:**
- Write for spoken delivery (read it aloud)
- Use active voice ("Senator proposes bill" not "Bill is proposed by Senator")
- Break complex ideas into simple sentences
- Include specific facts and numbers
- Vary sentence length for natural rhythm
- Use present tense for immediacy ("Protests continue" not "Protests continued")

❌ **DON'T:**
- Use complex jargon without explanation
- Write overly long sentences (>25 words)
- Include multiple topics in one script (focus on one story)
- Use vague language ("some say", "many believe")
- Write in ALL CAPS (AI may misinterpret)

#### Examples: Good vs Bad Scripts

**❌ BAD SCRIPT:**
```
There was a thing that happened with the government today and people
are talking about it. Some say it's good and others think it's bad.
We'll have to wait and see what happens next.
```
**Problems:** Vague, no specifics, passive voice, no clear narrative

**✅ GOOD SCRIPT:**
```
Good evening. The Senate passed landmark climate legislation tonight
by a vote of 52 to 48. The bill allocates 370 billion dollars for
renewable energy over the next decade. Supporters call it historic.
Critics warn of economic impact. The President is expected to sign
the bill within days. Implementation begins January first.
```
**Why it works:** Specific facts, active voice, clear structure, concrete details

### 1.2 Choosing an AI Provider

The system supports four AI providers for script analysis. Each has different strengths.

#### Google AI (Gemini)

**Recommended for:** Beginners, high-volume production, budget-conscious users

**Pros:**
- Free tier: 60 requests per minute
- No credit card required for basic use
- Fast processing (30-60 seconds)
- Good quality scene breakdown

**Cons:**
- May occasionally produce generic image prompts
- Less nuanced understanding of complex topics

**How to get API key:**
1. Visit https://ai.google.dev/
2. Click "Get API key in Google AI Studio"
3. Create or select a project
4. Click "Get API key"
5. Copy the key (starts with `AIza...`)

#### Claude (Anthropic)

**Recommended for:** Premium quality, political content, complex narratives

**Pros:**
- Best understanding of news context
- Superior prompt generation
- Excellent at handling political content
- Most natural avatar scripts

**Cons:**
- Pay-as-you-go (no free tier)
- ~$0.03 per broadcast analysis
- Slightly slower (45-90 seconds)

**How to get API key:**
1. Visit https://console.anthropic.com/
2. Create account (credit card required)
3. Go to API Keys section
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-...`)

#### OpenAI (GPT-4)

**Recommended for:** Balanced quality and speed

**Pros:**
- High quality analysis
- Fast processing
- Good at creative prompts
- Reliable performance

**Cons:**
- Pay-as-you-go (~$0.02 per analysis)
- Requires OpenAI account with billing

**How to get API key:**
1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Add payment method
4. Click "Create new secret key"
5. Copy the key (starts with `sk-...`)

#### Groq

**Recommended for:** Testing, rapid iteration, development

**Pros:**
- Fastest processing (15-30 seconds)
- Free tier available
- Good for quick tests
- Multiple model options

**Cons:**
- Less sophisticated than Claude/GPT-4
- May produce simpler scene breakdowns
- Free tier has rate limits

**How to get API key:**
1. Visit https://console.groq.com/
2. Create free account
3. Navigate to API Keys
4. Generate new key
5. Copy the key

### 1.3 Submitting via New Broadcast Form

Once you have a script and API key configured:

1. **Navigate to New Broadcast page:**
   - Click **"NEW BROADCAST"** button in top navigation
   - Or press `N` hotkey from broadcasts list
   - Or visit `http://localhost:8347/broadcasts/new`

2. **Fill out the form:**

   **News Script (Required):**
   - Paste your prepared script
   - Character counter shows length (minimum 100)
   - Text area auto-resizes

   **AI Provider (Required):**
   - Select from dropdown: Google AI, Claude, OpenAI, or Groq
   - Uses provider configured in Settings
   - Green checkmark indicates API key is configured

   **Optional: Upload Avatar at Creation:**
   - ⚠️ **Advanced feature** - Most users skip this
   - If you already have an avatar MP4 (from previous broadcast):
     - Click "Upload Avatar" section
     - Drag MP4 file or click to browse
     - Avatar will be used instead of generating new one
   - This saves time if using same avatar for multiple videos

3. **Create Broadcast:**
   - Click **"CREATE BROADCAST"** button
   - Button shows spinner while creating
   - You'll be redirected automatically

4. **Automatic Redirection:**
   - System creates database record
   - Generates unique Job ID
   - Redirects to Storyboard Editor (`/jobs/[id]`)
   - Script analysis begins immediately

### 1.4 What Happens Next

After clicking "Create Broadcast," the system begins automated processing:

**Immediate (0-5 seconds):**
- Database record created
- Job ID generated (example: `475da744-51f1-43f8-8f9b-5d3c72274bf8`)
- Status set to `analyzing`
- Job added to BullMQ queue

**Analysis Phase (30-90 seconds):**
- AI reads your script
- Breaks it into 6-8 scenes
- Generates image prompt for each scene
- Creates ticker headline for each scene
- Writes avatar script (narrator dialogue)
- Updates database with results

**Image Generation Phase (15-20 minutes):**
- Status changes to `generating_images`
- Each scene queued to Whisk API
- Images generated one at a time
- 60-90 second delay between requests (prevents rate limiting)
- Images uploaded to local storage
- Database updated as each completes

**Review Phase (Manual):**
- Status changes to `review_assets`
- System pauses and waits for you
- Review scenes, edit headlines, regenerate images
- Generate and upload avatar
- Click "Compile & Render" when ready

**Rendering Phase (2-4 minutes):**
- Status changes to `rendering`
- Remotion compiles all assets
- Applies visual effects (Ken Burns, ticker, avatar overlay)
- Exports final MP4

**Completion:**
- Status changes to `completed`
- Final video available for preview and download

⚠️ **IMPORTANT:** Do NOT close the browser during processing. The page updates automatically as progress happens.

---

## 2. Reviewing and Editing Scenes

### 2.1 Navigating the Storyboard Editor

After images generate, you'll review them in the Storyboard Editor. Efficient navigation is key.

#### Keyboard Shortcuts (Recommended)

The fastest way to review scenes:

| Key | Action |
|-----|--------|
| `↓` or `J` | Next scene |
| `↑` or `K` | Previous scene |
| `1-9` | Jump directly to scene 1-9 |
| `E` | Edit ticker headline |
| `R` | Regenerate scene image |
| `U` | Upload custom image |
| `?` | Show all keyboard shortcuts |

**Why use keyboard shortcuts?**
- 50% faster than mouse navigation
- No need to scroll manually
- Selected scene auto-scrolls into view
- Power users can review 8 scenes in under 2 minutes

#### Click Navigation

If you prefer mouse:
- Click any scene card to select it
- Selected scene has **bright ring** highlight
- Scroll manually to see all scenes

#### Scene Numbering

Scenes are numbered sequentially:
- **Scene 1:** Hook (opening, most important)
- **Scenes 2-7:** Body (supporting details)
- **Scene 8:** Conclusion (wrap-up)

Most broadcasts have 6-8 scenes. Shorter scripts may have 4-5, longer scripts up to 10.

#### Status Indicators

Each scene card shows a status badge:

- **🟡 PENDING:** Queued for generation
- **🔵 GENERATING:** Currently being created
- **🟢 COMPLETED:** Image ready
- **🔴 FAILED:** Generation error (see troubleshooting)

#### Auto-Scroll Behavior

When you select a scene (keyboard or mouse):
1. Scene card gets bright ring highlight
2. Page automatically scrolls to center the scene
3. Smooth animation (not jarring jump)
4. Focus remains on the scene card

This keeps your attention on the current scene without manual scrolling.

### 2.2 Understanding Scene Cards

Each scene card displays all the information you need to review.

#### Card Layout

```
┌─────────────────────────────────────┐
│ SCENE 3              [COMPLETED]    │  ← Header: Number + Status
├─────────────────────────────────────┤
│                                     │
│        [Generated Image]            │  ← Image Preview (16:9)
│                                     │
├─────────────────────────────────────┤
│ Image Prompt:                       │
│ "Professional photograph of..."     │  ← What AI generated
├─────────────────────────────────────┤
│ Ticker Headline:                    │
│ BREAKING: Senate votes on climate   │  ← Appears in video ticker
├─────────────────────────────────────┤
│ [Edit] [Regenerate] [Upload]       │  ← Action Buttons
├─────────────────────────────────────┤
│ Reference Images (Optional) ▼       │  ← Expandable section
└─────────────────────────────────────┘
```

#### Image Preview

- **Aspect Ratio:** 16:9 (1920×1080 or similar)
- **Quality:** High resolution, suitable for HD video
- **Loading:** Shows spinner while generating
- **Placeholder:** Gray box if not yet generated
- **Click:** Opens full-size preview (coming in future update)

#### Image Prompt

This is the text description the AI used to generate the image.

**Example:**
```
Professional photograph of the United States Capitol building at dusk,
dramatic sky, architectural photography, high detail, news broadcast quality
```

**What it tells you:**
- Subject of the image
- Style and mood
- Technical approach (photography vs illustration)
- Quality expectations

**Can you edit it?**
Not directly. If you want a different image:
1. Regenerate (gets new prompt from same context)
2. Upload custom image (bypass generation entirely)
3. Or edit the original script and create new broadcast

#### Ticker Headline

The text that scrolls across the bottom of the final video.

**Example:**
```
BREAKING: Senate passes climate bill 52-48 • President to sign within days
```

**Characteristics:**
- Max 200 characters
- Usually ALL CAPS for emphasis (optional)
- May include bullet (•) separators
- Summarizes the scene in one line

**Why edit?**
- Generated headline too long
- Want different emphasis
- Add urgency ("BREAKING:", "EXCLUSIVE:")
- Improve clarity

#### Action Buttons

Three buttons appear on each scene:

1. **EDIT** (or press `E`)
   - Edit the ticker headline
   - Inline text input appears
   - Press Enter to save, Escape to cancel

2. **REGENERATE** (or press `R`)
   - Generate new image with different variation
   - Uses same prompt, different random seed
   - Takes ~90 seconds
   - ⚠️ Don't spam this (see rate limiting below)

3. **UPLOAD** (or press `U`)
   - Replace generated image with your own
   - Opens file picker
   - Accepts PNG, JPG, WebP (max 10MB)

### 2.3 Editing Ticker Headlines

Headlines appear in the scrolling ticker at the bottom of the final video. Make them concise and impactful.

#### How to Edit (Keyboard - Faster)

1. **Select the scene:** Press `↓`/`↑` or `J`/`K` to navigate
2. **Enter edit mode:** Press `E`
3. **Type new headline:** Text input appears with current text
4. **Save:** Press `Enter`
5. **Or cancel:** Press `Escape`

**Visual feedback:**
- Input has bright border when focused
- Character counter shows remaining space (200 max)
- Save button appears (can also click it instead of Enter)

#### How to Edit (Mouse - Slower)

1. Click the scene card to select it
2. Click the ticker headline text directly
3. Text input appears
4. Type your changes
5. Click **"SAVE"** button or press Enter

#### Best Practices for Headlines

✅ **DO:**
- Keep it under 100 characters (easier to read)
- Use ALL CAPS for breaking news: `BREAKING: Major development`
- Include key numbers: `Senate votes 52-48 on climate bill`
- Use bullet separators for multiple points: `Vote passes • President to sign`
- Match the tone of your script (serious vs casual)
- Front-load important information

❌ **DON'T:**
- Write full sentences (this isn't a paragraph)
- Use question marks (headlines are statements)
- Include unnecessary words ("The", "A", "An")
- Exceed 200 characters (will be truncated)
- Use lowercase for important news (loses impact)

#### Examples: Before and After

**Before (AI-generated):**
```
Government officials vote on important legislation in the Senate chamber
```
**After (edited):**
```
SENATE PASSES CLIMATE BILL 52-48 • $370B for renewable energy
```

**Before:**
```
People are protesting about the new policy that was announced
```
**After:**
```
THOUSANDS PROTEST NEW POLICY • Demonstrations continue nationwide
```

**Before:**
```
The President is expected to sign the bill into law very soon
```
**After:**
```
BREAKING: President to sign bill within 72 hours
```

### 2.4 Reviewing Generated Images

Images are the visual backbone of your video. Check each one carefully.

#### What to Look For

**✅ APPROVE if:**
- Subject matches the script context
- Image is high quality (sharp, well-lit)
- No visible artifacts or distortions
- Aspect ratio is 16:9 (not cropped oddly)
- Colors and mood fit the news tone
- No watermarks or text overlays
- Background is appropriate

**❌ REGENERATE if:**
- Wrong subject (shows unrelated content)
- Poor quality (blurry, pixelated, dark)
- Visible artifacts (glitches, distortions, weird textures)
- Wrong aspect ratio (portrait instead of landscape)
- Inappropriate content (unrelated to news)
- Text in image is gibberish
- Multiple conflicting subjects (confusing composition)

#### Common Image Issues

**Issue: Blurry or Low Resolution**
- **Cause:** AI generation randomness
- **Fix:** Click Regenerate
- **Prevention:** Use reference images (see Section 3)

**Issue: Wrong Subject**
- **Cause:** Image prompt was ambiguous
- **Fix:** Upload custom image OR regenerate
- **Prevention:** Edit original script to be more specific

**Issue: Weird Artifacts (distorted faces, extra limbs)**
- **Cause:** AI artifact (common with people)
- **Fix:** Regenerate 1-2 times OR upload stock photo
- **Prevention:** Use subject reference image

**Issue: Text Gibberish**
- **Cause:** AI can't generate readable text reliably
- **Fix:** Regenerate OR upload image with real text
- **Note:** This is normal, not a bug

**Issue: Dark/Underexposed**
- **Cause:** Prompt didn't specify lighting
- **Fix:** Regenerate (may get better lighting)
- **Prevention:** Add "well-lit" or "bright lighting" to prompts (requires editing image generation code)

### 2.5 Regenerating Scenes

If an image doesn't meet quality standards, regenerate it.

#### How to Regenerate (Keyboard)

1. **Select the scene:** Navigate with `↓`/`↑` or `J`/`K`
2. **Trigger regeneration:** Press `R`
3. **Confirm:** Dialog appears asking "Regenerate this scene?"
4. **Wait:** Scene status changes to PENDING → GENERATING
5. **New image appears:** ~90 seconds later

#### How to Regenerate (Mouse)

1. Click the scene card
2. Click **"REGENERATE"** button at bottom
3. Confirm the dialog
4. Wait for new image

#### What Happens During Regeneration

1. **Scene status** changes to `PENDING` (yellow badge)
2. **Old image** remains visible (not deleted yet)
3. **Worker picks up job** from Redis queue
4. **Whisk API** generates new image (~60-90 seconds)
   - Uses same prompt
   - Different random seed (variation)
   - May include reference images if you added them
5. **New image downloads** and uploads to local storage
6. **Database updates** with new image URL
7. **Scene status** changes to `COMPLETED` (green badge)
8. **Old image** is replaced in the UI

**Duration:** ~90 seconds per image

#### Rate Limiting Warning

⚠️ **CRITICAL: DO NOT REGENERATE TOO MANY SCENES RAPIDLY**

**The problem:**
- Google Whisk API has anti-spam protection
- >5 regenerations within 5 minutes may trigger ban detection
- Queue automatically pauses to prevent account suspension

**How to avoid:**
- Space out regenerations (wait 60 seconds between)
- Only regenerate truly poor images
- Use custom uploads for minor tweaks
- If you need to regenerate 3+ scenes, do them one at a time

**What happens if queue pauses:**
- Yellow warning banner appears
- System stops generating images
- Click "RESUME QUEUE" button (if implemented)
- Or restart workers: Stop system, wait 2 minutes, restart
- See Section 8.3 for full recovery steps

#### When to Regenerate vs Upload

**Choose Regenerate when:**
- Image is close but needs variation
- Minor quality issue (try different seed)
- You want AI to try again
- You don't have a better image

**Choose Upload when:**
- You have specific image you want to use
- Regeneration failed 2+ times
- You need exact branding/consistency
- Custom photo or illustration
- See Section 2.6 for upload instructions

### 2.6 Uploading Custom Images

Sometimes the AI can't produce what you need. Upload your own image instead.

#### How to Upload (Keyboard)

1. **Select the scene:** Navigate with arrow keys or `J`/`K`
2. **Trigger upload:** Press `U`
3. **File picker opens:** Standard OS file browser
4. **Select image:** PNG, JPG, or WebP file
5. **Wait for upload:** Progress indicator appears
6. **New image appears:** Replaces generated image

#### How to Upload (Mouse)

1. Click the scene card
2. Click **"UPLOAD"** button at bottom
3. File picker opens
4. Navigate to your image file
5. Click "Open"
6. Wait for upload

#### Image Requirements

**Format:**
- ✅ PNG (best quality, transparency support)
- ✅ JPG/JPEG (good for photos)
- ✅ WebP (modern format, great compression)
- ❌ GIF (not supported)
- ❌ BMP (not supported)
- ❌ TIFF (not supported)

**Aspect Ratio:**
- **Recommended:** 16:9 (e.g., 1920×1080, 1280×720)
- **Why:** Matches final video format
- **Other ratios:** Will be cropped/letterboxed automatically

**File Size:**
- **Maximum:** 10MB
- **Recommended:** 1-3MB (HD quality without bloat)
- **Compress if needed:** Use online tools like TinyPNG

**Content:**
- High quality (avoid blurry images)
- Appropriate for news (professional)
- No watermarks (unless intentional branding)
- Proper licensing (own the rights or use stock photos)

#### Where to Find Custom Images

**Free Stock Photos:**
- Unsplash.com (free, high quality)
- Pexels.com (free, curated)
- Pixabay.com (free, large library)

**Paid Stock Photos:**
- Shutterstock.com (premium quality)
- Getty Images (news-specific)
- Adobe Stock (integrated with Creative Cloud)

**Your Own Photos:**
- Personal photo library
- Screenshots (for tech/software news)
- Graphs/charts (for data journalism)

**Legal Note:** Only use images you have rights to. Check licenses before using stock photos commercially.

#### Upload Process Details

1. **Client-side validation:**
   - Checks file format (must be image)
   - Checks file size (<10MB)
   - Shows error if invalid

2. **Upload to server:**
   - FormData POST to `/api/jobs/[id]/scenes/[scene_id]/upload`
   - Progress indicator shows percentage
   - Server validates again

3. **Server processing:**
   - Saves to local storage: `C:\Users\konra\ObsidianNewsDesk\images\`
   - Generates unique filename: `{job_id}_{scene_id}_{timestamp}.ext`
   - Updates database with new URL

4. **UI updates:**
   - New image appears in scene card
   - Status badge shows COMPLETED
   - Old image reference is removed

**Duration:** ~5-10 seconds for typical image

---

## 3. Using Reference Images

Reference images guide the AI to generate images matching your specific visual requirements. This is an advanced feature for consistent branding and style.

### 3.1 What Are Reference Images?

Reference images are example images you provide to "teach" the AI what you want. Instead of relying solely on text descriptions, the AI analyzes your references visually.

**Think of it like:**
- Showing a designer a mood board
- Giving a photographer example shots
- Providing a painter with reference photos

**The AI uses references to:**
- Understand visual style
- Match specific subjects (people, objects)
- Replicate environments/settings
- Maintain consistent aesthetic

### 3.2 Types of References

There are three distinct reference types. You can use any combination.

#### 📸 Subject Reference

**Controls:** The main object, person, or character in the scene

**Use when you want:**
- A specific person to appear consistently
- Same product across all scenes
- Identical vehicle, building, or object
- Character consistency in illustrations

**Example Use Case:**
- Upload: Professional headshot of your news anchor
- Result: All scenes feature that same person's face

**What gets matched:**
- Facial features and proportions
- Object shape and details
- Character design elements
- Key identifying characteristics

#### 🏞️ Scene Reference

**Controls:** The background, environment, and spatial composition

**Use when you want:**
- Consistent location/setting
- Specific architectural style
- Particular lighting and atmosphere
- Matching environmental mood

**Example Use Case:**
- Upload: Photo of a modern newsroom
- Result: All scenes have newsroom-style backgrounds

**What gets matched:**
- Background composition
- Lighting direction and quality
- Spatial layout
- Environmental elements

#### 🎨 Style Reference

**Controls:** Overall visual aesthetic, color palette, and artistic treatment

**Use when you want:**
- Consistent artistic style (photorealistic, cartoon, painterly)
- Specific color grading or mood
- Visual treatment (vintage, modern, minimalist)
- Matching brand aesthetic

**Example Use Case:**
- Upload: Political cartoon illustration
- Result: All scenes rendered in cartoon style

**What gets matched:**
- Color palette and saturation
- Artistic technique (brushstrokes, linework)
- Visual treatment and filters
- Overall aesthetic mood

### 3.3 How Reference Images Work

#### The Technical Process

When you upload reference images and regenerate:

1. **Upload:** Your reference images are saved to local storage
2. **Database:** Scene record updated with reference file paths
3. **Generation:** Worker reads references from disk
4. **API Call:** Whisk API receives:
   - Text prompt (standard)
   - Reference images (encoded as base64)
   - Reference types (subject/scene/style)
5. **AI Processing:** Whisk analyzes references and generates image combining both text and visual guidance
6. **Result:** Generated image incorporates reference characteristics

#### Multiple References

You can combine all three types for maximum control:

**Example Combination:**
- **Subject:** Headshot of news anchor → AI uses this face
- **Scene:** Modern newsroom background → AI uses this setting
- **Style:** Broadcast television aesthetic → AI uses this look

**Result:** The specific anchor's face appears in a newsroom setting with TV broadcast visual style.

**Visual Weight:**
- Each reference type has equal influence
- More references = more constraints on AI
- Too many references may reduce creativity

### 3.4 Uploading Reference Images

#### Step 1: Navigate to Scene

Select the scene you want to add references to:
- Click the scene card OR
- Navigate with keyboard (`↓`/`↑` or `J`/`K`)

#### Step 2: Expand Reference Section

On the scene card, find the **"Reference Images"** section (collapsed by default):
- Click the header to expand
- Shows three upload zones: Subject, Scene, Style

#### Step 3: Upload Images

Click **"Add"** button under the reference type you want:

**For Subject Reference:**
1. Click "Add" under "📸 Subject"
2. File picker opens
3. Select your subject image (person, object, character)
4. Thumbnail preview appears
5. Green badge shows "1 reference"

**For Scene Reference:**
1. Click "Add" under "🏞️ Scene"
2. Select your background/environment image
3. Preview appears

**For Style Reference:**
1. Click "Add" under "🎨 Style"
2. Select your style example image
3. Preview appears

**File Requirements (Same as custom uploads):**
- Formats: JPEG, PNG, WebP
- Max size: 10MB per reference
- Recommended: 512×512 or larger (higher resolution = better matching)

#### Step 4: Regenerate

After uploading references:
1. Click **"REGENERATE"** button (or press `R`)
2. Confirm dialog
3. Wait ~90 seconds
4. New image appears using your references

### 3.5 Best Practices

#### Subject References

✅ **DO:**
- Use high-resolution photos (minimum 512×512, recommended 1024×1024)
- Choose well-lit, clear images
- Keep the subject prominent and centered
- Use frontal or 3/4 angle shots (not profile)
- Single subject only (not group photos)
- Minimal background clutter

❌ **DON'T:**
- Use blurry or low-quality images
- Include multiple subjects (confuses the AI)
- Use images with heavy filters or edits
- Choose images with busy backgrounds
- Use extreme angles or partial views

**Example Subject References:**
- Professional headshot of news anchor
- Product photo on white background
- Celebrity press photo
- Character concept art

#### Scene References

✅ **DO:**
- Use images with clear composition
- Choose photos with good depth and perspective
- Include strong lighting and atmosphere
- Focus on environment, not people
- Wide shots showing full setting
- Consistent architectural style

❌ **DON'T:**
- Use crowded scenes with many subjects
- Choose images with poor lighting
- Use abstract or unclear compositions
- Include copyrighted locations (if public use)
- Mix indoor/outdoor if you want consistency

**Example Scene References:**
- Empty newsroom desk setup
- White House briefing room
- City skyline backdrop
- Legislative chamber interior

#### Style References

✅ **DO:**
- Choose images with distinctive visual style
- Use art with clear technique (watercolor, sketch, digital painting)
- Pick references with strong color palette
- Select images that represent the desired mood
- Consistent artistic approach

❌ **DON'T:**
- Use generic or neutral-style photos
- Choose low-contrast or washed-out images
- Mix multiple conflicting styles
- Use copyrighted artwork (respect licenses)
- Pick images with unclear aesthetic

**Example Style References:**
- Political cartoon illustration
- Vintage newsreel screenshot
- Modern flat design graphic
- Cinematic film still

### 3.6 Combining Multiple References

Using all three reference types together gives maximum control:

#### Example 1: Branded News Broadcast

**Goal:** Consistent professional newscast with specific anchor

**Setup:**
- **Subject:** Headshot of your anchor (Sarah Chen)
- **Scene:** Your newsroom studio background
- **Style:** Broadcast television look (news photography aesthetic)

**Result:** Sarah Chen appears in your newsroom with professional TV lighting and composition across all scenes.

#### Example 2: Political Cartoon Series

**Goal:** Editorial cartoon style with consistent character

**Setup:**
- **Subject:** Cartoon character illustration (political figure caricature)
- **Scene:** Capitol building background (cartoon version)
- **Style:** Political cartoon aesthetic (bold lines, exaggerated features)

**Result:** Consistent cartoon character in political settings with editorial cartoon visual treatment.

#### Example 3: Documentary Style

**Goal:** Photojournalistic look with specific location

**Setup:**
- **Subject:** (None - let AI vary people)
- **Scene:** Specific city or location
- **Style:** Documentary photography (35mm film look, natural lighting)

**Result:** Various subjects in the specific location with documentary film aesthetic.

### 3.7 Managing References

#### Viewing Active References

Each scene card shows a badge indicating active references:
- **"3 references active"** → All three types uploaded
- **"1 reference active"** → Only one type uploaded
- **No badge** → No references

#### Removing References

To remove a reference:
1. Expand "Reference Images" section
2. Hover over the reference thumbnail
3. Click the **X** button in top-right corner
4. Reference removed immediately
5. Badge updates count

**Note:** Removing a reference doesn't affect already-generated images. You must regenerate to apply the change.

#### Updating References

To replace a reference:
1. Remove the old reference (click X)
2. Upload new reference (click Add)
3. Regenerate the scene

**Or:** Simply upload a new reference (may overwrite, depending on implementation)

### 3.8 Common Questions

**Q: Do I need to use all three reference types?**
**A:** No! Use any combination. Even one reference type significantly improves results. Most users start with just style references.

**Q: Can I use the same references for all scenes?**
**A:** Yes, but you must upload them to each scene individually. Copy the reference files and upload to each scene card. (Job-level reference library is planned for future update.)

**Q: What if my generated image doesn't match the reference?**
**A:** Try:
- Higher quality reference image (1024×1024 or larger)
- More distinctive reference features (clearer, better lit)
- Adjust text prompt to complement references (e.g., "person in newsroom" if using subject + scene)
- Try different reference images
- Regenerate 1-2 more times (different random seeds)

**Q: How long does generation take with references?**
**A:** About 10-20 seconds longer than text-only generation:
- Text-only: 60-90 seconds
- With references: 80-110 seconds

**Q: Are my reference images stored in the cloud?**
**A:** No! All references are stored locally on your machine at `C:\Users\konra\ObsidianNewsDesk\images\`. They're only sent to Whisk API temporarily during generation (not permanently stored by Google).

**Q: Can I use photos I found online?**
**A:** Legally, you should only use:
- Your own photos
- Public domain images
- Licensed stock photos (check usage rights)
- Images you have explicit permission to use

Using copyrighted images without permission may violate copyright law, especially for commercial broadcasts.

### 3.9 Workflow Examples

#### Example 1: Political News Broadcast

**Goal:** Consistent branding across 8-scene political news video

**Workflow:**
1. Create broadcast with political news script
2. Wait for initial images to generate
3. Review Scene 1:
   - Upload style reference: Professional news photography (clean, well-lit, modern)
   - Upload scene reference: Government building (Capitol, White House)
   - Regenerate
4. Copy reference images to other scenes
5. Regenerate all scenes
6. Result: Consistent political news aesthetic across all scenes

**Time Investment:** +10 minutes (reference setup) for significantly more polished result

#### Example 2: Product Demo Video

**Goal:** Feature specific product in multiple contexts

**Workflow:**
1. Create broadcast with product demo script (8 scenes showing product in different settings)
2. Wait for initial images
3. For each scene:
   - Upload subject reference: Professional product photo (same product, white background)
   - Keep text prompts varied ("product in kitchen", "product in office", "product outdoors")
   - Regenerate
4. Result: Same product appears in 8 different environments

**Benefit:** Product consistency without needing 8 custom photos

#### Example 3: Character-Based News Satire

**Goal:** Consistent fictional anchor character for comedy news

**Workflow:**
1. Create broadcast with satirical news script
2. Upload subject reference: Cartoon character design (your fictional anchor)
3. Upload style reference: Editorial cartoon style
4. Apply to all scenes
5. Result: Same character appears throughout with consistent cartoon aesthetic

**Perfect for:** Comedy news channels, satire, animated news parodies

---

## 4. Avatar Generation

The avatar is the AI-generated narrator who presents your news script. This is a manual step requiring HeyGen (or optional automation).

### 4.1 Two Avatar Modes

The system supports two workflows:

#### Manual Mode (Default, Recommended)

**How it works:**
- You control the HeyGen browser
- You generate the avatar manually
- You download and upload the MP4

**Pros:**
- No setup required (works immediately)
- Full control over voice, avatar selection
- Preview before downloading
- Most reliable

**Cons:**
- Requires 2-3 minutes of manual work per video

**Best for:**
- First-time users
- Quality-critical broadcasts
- Low-volume production (1-5 videos/day)

#### Automated Mode (Optional, Advanced)

**How it works:**
- Python script controls browser automatically
- System generates avatar without human intervention
- MP4 automatically downloaded and uploaded

**Pros:**
- Hands-free (no manual work)
- Perfect for batch processing
- Consistent results

**Cons:**
- Requires Python setup (see HEYGEN_AUTOMATION_SETUP.md)
- Requires one-time HeyGen login
- May break if HeyGen UI changes
- More complex troubleshooting

**Best for:**
- High-volume production (10+ videos/day)
- Overnight batch processing
- Experienced users comfortable with Python

**Setup:** See `HEYGEN_AUTOMATION_SETUP.md` for full instructions. This guide covers manual mode only.

### 4.2 Manual Workflow (Step-by-Step)

#### Prerequisites

- Active HeyGen subscription (paid account required)
- Browser: Chrome or Edge
- Logged into HeyGen.com

#### Step 1: Launch HeyGen Browser

When job reaches `review_assets` status:

1. **Locate "AVATAR GENERATION" section** on storyboard page
2. **Click "LAUNCH HEYGEN BROWSER" button**
   - New browser window opens
   - URL: `https://app.heygen.com/`
   - Should be automatically logged in (cookies saved)

3. **If not logged in:**
   - Sign in with your HeyGen account
   - Use email/password or SSO
   - System saves login cookies for next time

#### Step 2: Copy Avatar Script

The avatar script is the narration for your AI presenter.

1. **In the Storyboard Editor, scroll to "AVATAR SCRIPT" section** (near top of page)
2. **Review the script:**
   - Generated by AI from your news script
   - Should be 150-300 words
   - Natural spoken delivery
   - May include pauses and emphasis

3. **Select all text:**
   - Click inside script box
   - Press `Ctrl+A` (Windows) or `Cmd+A` (Mac)

4. **Copy to clipboard:**
   - Press `Ctrl+C` (Windows) or `Cmd+C` (Mac)

**Example Avatar Script:**
```
Good evening. I'm Sarah Chen with your news update. The Senate has
passed landmark climate legislation tonight by a vote of 52 to 48.
The bill allocates 370 billion dollars for renewable energy projects
over the next decade. Supporters are calling it historic. Critics
warn of potential economic impact. The President is expected to sign
the bill within days. Implementation begins January first. This has
been Sarah Chen reporting.
```

#### Step 3: Create Instant Avatar Video in HeyGen

1. **Navigate to "Instant Avatar 3.0"** in HeyGen:
   - Look for sidebar menu
   - Click "Avatar" or "Instant Avatar"
   - Or use search: type "instant avatar"

2. **Paste your avatar script:**
   - Find the script input field (large text box)
   - Paste: `Ctrl+V` (Windows) or `Cmd+V` (Mac)
   - Script appears in the field

3. **Select an avatar:**
   - Click "Choose Avatar" button
   - Browse avatar library
   - **Recommended for news:**
     - "Professional News Anchor" style avatars
     - "Authoritative Male" or "Clear Female" voices
     - Formal attire, neutral background
   - Click avatar to select

4. **Select a voice:**
   - Click "Voice" dropdown
   - Browse voice library
   - **Recommended for news:**
     - Natural-sounding, professional voices
     - Clear articulation
     - Neutral accent (American, British, etc.)
   - Preview voices by clicking play button
   - Select voice

5. **⚠️ CRITICAL: Configure audio settings:**
   - Click "Settings" or "Advanced Settings"
   - **Sample Rate:** MUST be **48kHz**
   - **Codec:** H.264 (usually default)
   - **Why 48kHz matters:** Remotion requires 48kHz for audio sync. Other rates (44.1kHz, 16kHz) will cause lip-sync issues.

6. **Click "Generate Video":**
   - Progress bar appears
   - Generation takes 2-3 minutes (depends on script length)
   - You can close the tab and check back later

#### Step 4: Download Avatar MP4

1. **Wait for HeyGen to finish processing:**
   - HeyGen shows "Processing..." status
   - Email notification when complete (optional)
   - Or refresh page to check status

2. **Click "Download" button:**
   - Look for download icon or button
   - MP4 file downloads to your browser's download folder
   - Typical filename: `heygen_video_123456.mp4`

3. **Verify download:**
   - Check Downloads folder
   - File size: Usually 30-60 MB
   - Duration: Should match your script length (~60-90 seconds)

#### Step 5: Upload to Obsidian News Desk

Return to the Storyboard Editor in Obsidian News Desk.

**Method 1: Drag & Drop (Easier, Recommended)**

1. **Locate upload zone:**
   - Scroll to "AVATAR GENERATION" section
   - Find the dashed-border upload box
   - Text: "Drag avatar MP4 here or click to browse"

2. **Open Downloads folder:**
   - Open File Explorer (Windows) or Finder (Mac)
   - Navigate to Downloads
   - Find the HeyGen MP4 file

3. **Drag and drop:**
   - Click and hold the MP4 file
   - Drag it to the upload zone in your browser
   - Drop it inside the dashed border

4. **Wait for upload:**
   - "Uploading and processing..." spinner appears
   - Progress bar shows percentage (for large files)
   - Upload takes 10-30 seconds

5. **Success confirmation:**
   - Green checkmark appears
   - "Avatar uploaded successfully" message
   - Upload zone shows thumbnail preview

**Method 2: File Picker (Alternative)**

1. In the upload zone, click **"SELECT FILE"** button
2. File browser opens
3. Navigate to Downloads folder
4. Select the avatar MP4 file
5. Click "Open"
6. Upload begins automatically

#### Step 6: Automatic Status Change

After successful upload:

1. **Job status** automatically changes from `review_assets` to `rendering`
2. **Storyboard page updates** to show rendering status
3. **Remotion worker** picks up job from queue
4. **You can close HeyGen browser** (no longer needed)
5. **Wait 2-4 minutes** for final video rendering

⚠️ **Do NOT close the Storyboard Editor** during rendering. You can minimize it, but keep it open to see completion.

### 4.3 Avatar File Requirements

Your avatar MP4 must meet these specifications for proper rendering:

#### Format Requirements

- **Container:** MP4 (not MOV, AVI, MKV, WebM)
- **Video Codec:** H.264 (also called AVC or MPEG-4 Part 10)
- **Audio Codec:** AAC
- **⚠️ Audio Sample Rate:** **48kHz** (CRITICAL - other rates cause sync issues)

#### Size and Duration

- **File Size:** Under 100MB (recommend under 50MB)
- **Duration:** Should match your script length (usually 60-120 seconds)
- **Resolution:** Any (will be scaled to fit video)

#### How to Check File Specifications

**Windows:**
1. Right-click MP4 file → Properties
2. Click "Details" tab
3. Check "Audio sample rate" = 48kHz
4. Check "Video codec" = H.264

**Mac:**
1. Right-click MP4 file → Get Info
2. Or open in QuickTime Player → Window → Show Movie Inspector

**Using MediaInfo (Free Tool):**
1. Download MediaInfo from https://mediaarea.net/en/MediaInfo
2. Open your MP4 file
3. Check:
   - Format: MPEG-4
   - Video: AVC (H.264)
   - Audio: AAC, 48.0 kHz

### 4.4 Audio Requirements (Critical)

**Why 48kHz is Required:**

Remotion's video rendering engine expects 48kHz audio for proper lip sync. If you upload a different sample rate:

**What happens with wrong sample rate:**
- Avatar lips don't match audio (desync)
- Audio may drift out of sync over time
- Final video looks unprofessional

**How to ensure 48kHz:**
- **In HeyGen:** Set audio sample rate to 48kHz in settings BEFORE generating
- **If already generated wrong:** Re-generate avatar with correct settings
- **If you can't re-generate:** Use FFmpeg to re-encode (see Section 4.5)

### 4.5 Optimizing Large Avatar Files

If your avatar file is >100MB, Remotion may timeout during rendering. Optimize it first.

#### Using the Provided Script (Recommended)

The system includes an optimization script:

```bash
cd C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk
.\scripts\optimize-avatar.sh "C:\path\to\large-avatar.mp4" "optimized-avatar.mp4"
```

**What it does:**
- Reduces resolution to 640×360 (sufficient for small overlay)
- Re-encodes to web-optimized H.264
- Maintains 48kHz audio
- Adds faststart flag (for web playback)
- Output: ~2-3MB file

**Requirements:**
- FFmpeg installed (included in system setup)
- Bash shell (Git Bash on Windows)

#### Using FFmpeg Directly (Advanced)

If you have FFmpeg installed:

```bash
ffmpeg -i input.mp4 -vf scale=640:360 -c:v libx264 -preset medium -crf 28 -c:a aac -ar 48000 -b:a 128k -movflags +faststart output.mp4
```

**Explanation:**
- `scale=640:360` → Reduce resolution
- `crf 28` → Compression (lower = better quality, higher file size)
- `ar 48000` → Force 48kHz audio sample rate
- `movflags +faststart` → Optimize for web streaming

### 4.6 Automated Mode (Brief Overview)

If you complete Python setup (see HEYGEN_AUTOMATION_SETUP.md):

**How it works:**
1. Job reaches `review_assets` → Automatically transitions to `generating_avatar`
2. Python script launches headless browser
3. Script navigates to HeyGen.com
4. Submits avatar script
5. Polls for completion every 5 seconds
6. Downloads MP4 when ready
7. Uploads to Obsidian News Desk
8. Job advances to `rendering`

**All automatic - no human intervention needed.**

**To enable:**
1. Complete Python setup (install dependencies, run `setup_profile.py`)
2. Go to Settings page → Avatar Generation Mode → **Automated**
3. Save settings
4. Restart workers

**To disable:**
1. Settings → Avatar Generation Mode → **Manual**
2. Save settings

---

## 5. Final Video & Export

### 5.1 Understanding the Rendering Process

When you upload the avatar and click "Compile & Render," Remotion begins final video composition.

#### What Happens During Rendering

**Remotion compiles all assets:**
- 6-8 scene background images
- Avatar MP4 (with green screen removal)
- Ticker headlines (for scrolling overlay)
- Audio from avatar (48kHz AAC)

**Visual effects applied:**

1. **Ken Burns Effect (Background Images):**
   - Slow zoom and pan on each image
   - Creates dynamic motion from static images
   - Prevents "slideshow" look

2. **Image Transitions:**
   - **Hook section (0-15 seconds):** Images transition every 1.5 seconds (rigid timing)
   - **Body section (15+ seconds):** Images transition at 1 per sentence (based on remaining audio duration)
   - Smooth cross-fades between images

3. **Avatar Compositing:**
   - Avatar MP4 placed in bottom-right corner
   - Green screen removal using WebGL chromakey shader
   - Transparency applied to background
   - Avatar appears "floating" over background

4. **Scrolling Ticker Overlay:**
   - Bottom-edge CSS marquee ticker
   - Uses ticker headlines from all scenes
   - Scrolls continuously right-to-left
   - Separator bullets (•) between headlines

5. **Subtitles (if available):**
   - Word-level timestamps from HeyGen
   - Synced captions at bottom-center
   - Optional feature (may not be implemented yet)

#### Rendering Timeline

Typical rendering times:

- **Short video (60 seconds, 6 scenes):** ~2 minutes
- **Medium video (90 seconds, 8 scenes):** ~3 minutes
- **Long video (120 seconds, 10 scenes):** ~4 minutes

**Factors affecting speed:**
- Number of scenes (more scenes = more processing)
- Video length (longer audio = longer render)
- System performance (CPU, RAM, disk speed)
- Remotion concurrency setting (default: 4 threads)

**Progress indicators:**
- Status badge shows "RENDERING"
- Spinner animation
- No percentage progress (Remotion doesn't expose this)

### 5.2 Video Specifications

The final video is exported with these settings:

**Resolution:** 1920×1080 (Full HD)
**Aspect Ratio:** 16:9
**Frame Rate:** 30fps
**Video Codec:** H.264 (libx264)
**Audio Codec:** AAC
**Audio Sample Rate:** 48kHz
**Bitrate:** ~5 Mbps (high quality)
**File Size:** ~20-40 MB for 60-90 second video

**Why these specs:**
- Compatible with all major platforms (YouTube, TikTok, Twitter, Facebook)
- Professional broadcast quality
- Reasonable file size for web upload
- Standard HD for 2026

### 5.3 Previewing the Final Video

When status changes to `completed`:

1. **Scroll to bottom of Storyboard Editor**
2. **"FINAL VIDEO" section appears**
3. **Video player displays:**
   - HTML5 `<video>` element
   - Standard browser controls (play, pause, seek, volume, fullscreen)
   - Thumbnail preview (first frame)

4. **Click play to watch inline:**
   - Video plays directly in browser
   - No download required
   - Check quality before downloading

#### What to Check During Preview

✅ **Visual Quality:**
- Images are sharp and well-composed
- No visual glitches or artifacts
- Ken Burns effect is smooth (not jerky)

✅ **Avatar Integration:**
- Avatar is visible in bottom-right corner
- Green screen fully removed (no green fringe)
- Avatar doesn't obscure important background content
- Lip sync matches audio (48kHz working correctly)

✅ **Ticker Functionality:**
- Ticker scrolls smoothly at bottom
- Headlines are readable
- No overlapping text or visual bugs
- Correct content from your edits

✅ **Audio Sync:**
- Avatar lips match spoken words
- No audio drift or delay
- Volume levels are balanced

❌ **Common Issues:**
- **Desync audio:** Upload avatar with wrong sample rate (not 48kHz) - Re-generate avatar
- **Green screen artifacts:** Poor quality avatar or encoding issue - Re-download from HeyGen
- **Missing ticker:** Database error - Check scene headlines saved correctly
- **Jerky Ken Burns:** System performance issue - Close other applications

### 5.4 Downloading the Final Video

When satisfied with preview:

1. **Click "DOWNLOAD FINAL VIDEO" button**
   - Located below video player
   - Green button (primary action)

2. **MP4 downloads to browser's download folder:**
   - Default location: `C:\Users\[YourName]\Downloads\`
   - Filename format: `broadcast_{job_id}_{timestamp}.mp4`
   - Example: `broadcast_475da744-51f1-43f8-8f9b-5d3c72274bf8_20260322_143022.mp4`

3. **Verify download:**
   - Check Downloads folder
   - File size: ~20-40 MB (for typical 60-90 second video)
   - Open in VLC or Windows Media Player to test

### 5.5 Platform Upload Guidelines

Your video is optimized for direct upload to major platforms.

#### YouTube

**Recommended Settings:**
- Upload as-is (no re-encoding needed)
- Privacy: Private, Unlisted, or Public
- Category: News & Politics
- License: Standard YouTube License
- Resolution: Automatic (will show 1080p HD)

**YouTube Specifications Met:**
- ✅ Resolution: 1920×1080 (HD)
- ✅ Frame rate: 30fps (standard)
- ✅ Codec: H.264
- ✅ Audio: AAC 48kHz

**Upload Process:**
1. Go to https://studio.youtube.com/
2. Click "Create" → "Upload videos"
3. Drag your MP4 file
4. Add title, description, thumbnail
5. Select audience, visibility
6. Publish

#### Twitter / X

**Specifications:**
- ✅ Max duration: 2:20 (140 seconds) - Your videos are usually under this
- ✅ Max file size: 512 MB - Your videos are ~20-40 MB
- ✅ Resolution: 1920×1080 supported

**Recommendations:**
- Keep videos under 2:20 for free accounts
- Add captions (Twitter doesn't auto-generate)
- Use engaging first frame (shows in feed)

**Upload:**
1. Create new tweet
2. Click media button
3. Select MP4 file
4. Add tweet text
5. Post

#### TikTok

**Issue:** TikTok prefers vertical 9:16 format, your video is 16:9 horizontal

**Solutions:**
- **Option 1:** Crop to 9:16 using video editor (lose some content)
- **Option 2:** Add letterboxing (black bars top/bottom) - TikTok may auto-crop
- **Option 3:** Re-render for TikTok (future feature: vertical layout)

**If uploading as-is:**
- TikTok will center and crop your video
- Avatar may be cut off
- Ticker may not be visible

**Better approach:** Use for YouTube/Twitter, create separate vertical version for TikTok

#### Instagram

**Feed Posts:**
- ✅ Max duration: 60 seconds (your videos should be trimmed if longer)
- ✅ Supports 16:9
- ✅ Resolution: 1920×1080

**Stories:**
- ❌ Requires 9:16 vertical (same issue as TikTok)

**Reels:**
- ✅ Supports 16:9
- ✅ Max 90 seconds (perfect for your videos)

**Recommendation:** Upload to Feed or Reels, not Stories

#### Facebook

**Specifications:**
- ✅ Max duration: 240 minutes (your videos are fine)
- ✅ Resolution: 1920×1080 supported
- ✅ File size: Up to 10 GB (your videos are tiny)

**Upload as-is - fully compatible.**

#### LinkedIn

**Specifications:**
- ✅ Max duration: 10 minutes
- ✅ Max file size: 5 GB
- ✅ Resolution: 1920×1080

**Recommendation:**
- Perfect for professional/business news content
- Upload directly, no modifications needed

### 5.6 Re-Downloading or Sharing

**Where is the final video stored?**

- **Local file system:** `C:\Users\konra\ObsidianNewsDesk\videos\`
- **Filename:** `{job_id}.mp4` (e.g., `475da744-51f1-43f8-8f9b-5d3c72274bf8.mp4`)

**To re-download:**
1. Go to Broadcasts List page
2. Find your completed job
3. Click to open storyboard
4. Scroll to "FINAL VIDEO"
5. Click "DOWNLOAD" again

**To share directly:**
- Copy file from `C:\Users\konra\ObsidianNewsDesk\videos\`
- Send via email, cloud storage, or USB drive

**File persistence:**
- Videos are stored permanently until you delete them
- Deleting the job from database does NOT delete the video file (manual cleanup required)

---

## 6. Managing Broadcasts

### 6.1 Viewing the Broadcasts List

The Broadcasts List page shows all your jobs in a sortable table.

**Access:**
- Navigate to `/broadcasts` in the app
- Or click "BROADCASTS" in top navigation
- Or press `N` from anywhere (creates new broadcast)

**Table Columns:**

| Column | Description |
|--------|-------------|
| **Script Preview** | First 100 characters of your news script |
| **Status** | Current job state (analyzing, generating_images, review_assets, rendering, completed, failed) |
| **Created** | Date and time job was created |
| **Actions** | Buttons: View, Cancel, Delete |

**Pagination:**
- Shows 50 jobs per page
- Page numbers at bottom
- Navigate with keyboard: `←` previous page, `→` next page

### 6.2 Searching and Filtering

**Search Box:**
- Located above the table
- Type to search by script content
- Searches in real-time (no submit button needed)
- Example: Type "climate" to find all broadcasts about climate

**Filter by Status:**
- Dropdown menu: "All", "Completed", "Failed", "In Progress"
- **All:** Shows every job
- **Completed:** Only finished videos
- **Failed:** Only jobs with errors (for troubleshooting)
- **In Progress:** Currently analyzing, generating, or rendering

**Combined Search + Filter:**
- Type search term AND select filter
- Example: Search "election" + Filter "Completed" = All completed election videos

**Results Update:**
- Table updates in real-time as you type/filter
- No page reload needed
- Counts shown: "Showing 1-10 of 47 results"

### 6.3 Sorting

Click column headers to sort:

**Script Preview:**
- Alphabetical (A-Z or Z-A)
- Useful for finding specific topics

**Status:**
- Alphabetical by status name
- Groups all "completed" together, etc.

**Created (Default):**
- Newest first (default)
- Oldest first (reverse)
- Most useful for finding recent work

**Visual Indicator:**
- Sorted column header has arrow (↑ or ↓)
- Click again to reverse sort direction

### 6.4 Bulk Operations

Select multiple jobs for batch actions:

**Selecting Jobs:**
1. Click checkbox in leftmost column of each row
2. Or click header checkbox to select all on current page
3. Selected rows highlight

**Bulk Actions:**

**Cancel Selected:**
- Stops in-progress jobs
- Only works if status is `analyzing`, `generating_images`, or `rendering`
- Completed/failed jobs can't be canceled
- Confirmation dialog: "Cancel X jobs?"

**Delete Selected:**
- Permanently removes jobs from database
- ⚠️ WARNING: Cannot be undone
- Video files remain on disk (manual cleanup needed)
- Confirmation dialog: "Delete X jobs? This cannot be undone."

**Clear Selection:**
- Deselects all checkboxes
- Button appears when jobs are selected

**Keyboard Shortcut:**
- Select job: Click row
- Bulk select: Shift+Click (future enhancement)

### 6.5 Job Lifecycle Management

#### Opening a Job

**Method 1: Click anywhere on row**
- Navigates to storyboard editor
- Shows full job details

**Method 2: Click "VIEW" button**
- Same as clicking row
- More explicit action

**Method 3: Keyboard (from selected row)**
- Press `J`/`K` to navigate rows
- Press `Enter` to open selected job

#### Canceling a Job

**When to cancel:**
- You made a mistake in the script
- Job is stuck in endless loop
- You want to start over

**How to cancel:**
1. Find job in list
2. Click "CANCEL" button (only visible if job is in-progress)
3. Confirm dialog
4. Job status changes to `cancelled` (custom status)
5. Worker stops processing

**What happens:**
- BullMQ job is removed from queue
- Database status updates
- Partially generated assets remain (not deleted)

**Cannot cancel:**
- Completed jobs (already finished)
- Failed jobs (already stopped)

#### Deleting a Job

**When to delete:**
- Cleaning up old test jobs
- Removing failed jobs
- Freeing up database space

**How to delete:**
1. Find job in list
2. Click "DELETE" button
3. Confirm: "Delete this job? This cannot be undone."
4. Job removed from database

**⚠️ WARNING:**
- This is permanent
- No recovery possible
- Video files remain on disk (must delete manually)

**To fully delete:**
1. Delete job from database (via UI)
2. Manually delete files:
   - Images: `C:\Users\konra\ObsidianNewsDesk\images\{job_id}_*`
   - Avatar: `C:\Users\konra\ObsidianNewsDesk\avatars\{job_id}.mp4`
   - Video: `C:\Users\konra\ObsidianNewsDesk\videos\{job_id}.mp4`

#### Re-Running a Failed Job

If a job failed due to temporary issue:

1. Open the failed job (click row)
2. Review error message (shown in UI)
3. Fix the issue:
   - If image generation failed: Regenerate scenes
   - If avatar failed: Upload new avatar manually
   - If rendering failed: Check assets and retry
4. Resume from last successful step

**Note:** There's no "Retry" button. You manually fix the issue and continue from where it stopped.

### 6.6 Keyboard Shortcuts (Broadcasts List)

Efficient navigation without mouse:

| Key | Action |
|-----|--------|
| `↑` or `K` | Select previous job |
| `↓` or `J` | Select next job |
| `Enter` | Open selected job |
| `←` | Previous page |
| `→` | Next page |
| `N` | Create new broadcast |
| `?` | Show keyboard shortcuts help |

**Visual Feedback:**
- Selected row has bright background
- Primary ring highlight
- Auto-scrolls to keep selection visible

**Workflow Example:**
```
Load page → J J J (navigate down) → Enter (open job) → Review →
Browser back button → J (next job) → Enter (open) → Review...
```

---

## 7. Settings & Configuration

### 7.1 Accessing the Settings Page

**Navigate to:**
- Click "SETTINGS" in top navigation
- Or visit `http://localhost:8347/settings`

**Layout:**
- Sectioned configuration form
- Categories: AI Provider, Database, Queue, Browser, Avatar, Image Generation, Rendering
- Save button at bottom (saves all sections at once)

### 7.2 AI Provider Configuration

Control which AI service analyzes your scripts.

#### Selecting a Provider

**Dropdown options:**
- Google AI (Gemini)
- Claude (Anthropic)
- OpenAI (GPT-4)
- Groq (Mixtral/Llama)

**Selection process:**
1. Click "AI Provider" dropdown
2. Select provider
3. Scroll down and click "SAVE ALL SETTINGS"

**Active provider:**
- Used for all new broadcasts
- Existing broadcasts continue with their original provider

#### Entering API Keys

Each provider requires an API key.

**Google AI:**
1. Field label: "Google AI API Key"
2. Paste key (starts with `AIza...`)
3. Masked after save (shows `sk-...***...abc`)

**Claude:**
1. Field label: "Claude API Key"
2. Paste key (starts with `sk-ant-...`)
3. Masked after save

**OpenAI:**
1. Field label: "OpenAI API Key"
2. Paste key (starts with `sk-...`)
3. Masked after save

**Groq:**
1. Field label: "Groq API Key"
2. Paste key
3. Masked after save

**Security:**
- Keys are stored in `.env` file (not database)
- Never committed to git (`.env` is gitignored)
- Only visible on settings page
- Masked in logs and error messages

#### How to Get API Keys

**Google AI:**
1. Visit https://ai.google.dev/
2. Click "Get API key in Google AI Studio"
3. Create or select a Google Cloud project
4. Click "Get API key"
5. Copy the key (starts with `AIza...`)

**Claude:**
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Add payment method (required)
4. Navigate to "API Keys"
5. Click "Create Key"
6. Name it (e.g., "Obsidian News Desk")
7. Copy the key (starts with `sk-ant-...`)

**OpenAI:**
1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Add payment method
4. Click "Create new secret key"
5. Name it (optional)
6. Copy the key immediately (only shown once)

**Groq:**
1. Visit https://console.groq.com/
2. Create free account
3. Navigate to API Keys section
4. Click "Create API Key"
5. Copy the key

### 7.3 Database Configuration

**DATABASE_URL** (PostgreSQL connection string)

**Default:**
```
postgresql://postgres:postgres@localhost:5432/obsidian_news_desk
```

**Format:**
```
postgresql://[username]:[password]@[host]:[port]/[database_name]
```

**When to change:**
- Using remote Postgres server
- Different port (not 5432)
- Custom username/password
- Different database name

**For local Docker setup:**
- **DO NOT change** (Docker Compose sets this automatically)

**After changing:**
- Click "SAVE ALL SETTINGS"
- Restart workers (system needs to reconnect)

### 7.4 Redis Queue Settings

Control BullMQ connection to Redis.

**Redis Host:**
- Default: `localhost`
- Change if using remote Redis server

**Redis Port:**
- Default: `6379`
- Change if using custom port

**Redis Password:**
- Default: (empty)
- Set if your Redis requires authentication

**For local Docker setup:**
- **DO NOT change** (Docker handles this)

**After changing:**
- Save settings
- Restart workers (reconnection required)

### 7.5 Browser Automation Settings

Used for HeyGen avatar generation (automated mode only).

**Browser Selection:**
- Dropdown: Edge, Chrome, Chromium
- Default: Edge (pre-installed on Windows)

**When to change:**
- Edge not installed → Select Chrome
- Chrome not installed → Install Chrome or select Chromium
- Using Linux/Mac → Select available browser

**This setting only matters for:**
- Automated avatar generation (AVATAR_MODE=automated)
- Manual mode uses your default browser

### 7.6 Avatar Mode Configuration

Toggle between manual and automated avatar generation.

**Toggle Options:**
1. **Manual** (default)
   - You control HeyGen browser
   - You download and upload MP4
   - No Python setup required

2. **Automated** (optional)
   - Python script controls browser
   - Fully automatic
   - Requires Python setup (see HEYGEN_AUTOMATION_SETUP.md)

**How to toggle:**
1. Go to Settings → "🎭 AVATAR GENERATION" section
2. Click toggle switch
3. Manual → Automated (or vice versa)
4. Save settings
5. **⚠️ IMPORTANT:** Restart workers for change to take effect

**Restart workers:**
```bash
# Stop system
.\STOP.bat

# Wait 30 seconds

# Start system
.\START.bat
```

**Verification:**
- Check worker console output
- Should show: `✅ Avatar automation worker loaded (mode: automated)`
- Or: `✅ Avatar automation worker loaded (mode: manual)`

### 7.7 Whisk Image Generation Settings

Configure the Whisk API for image generation.

**Whisk API Token:**
- Required for image generation
- Get from Google Whisk Labs
- Expires after ~1 hour (must refresh periodically)

**How to get/refresh token:**
1. Open https://labs.google.com/whisk in browser
2. Press F12 → Network tab
3. Generate a test image in Whisk
4. Find request to `generateImage`
5. Copy `Authorization` header value (starts with `Bearer ya29.a0...`)
6. Paste in Settings field (without "Bearer " prefix)
7. Save settings

**Image Model:**
- Dropdown: IMAGEN_3_5, IMAGEN_3, IMAGEN_2
- Default: IMAGEN_3_5 (best quality)
- Change if you want faster (but lower quality) generation

**Concurrency:**
- Number: 2-5
- Default: 2 (safe for free tier)
- Higher = faster (but may trigger rate limits)

**When to change concurrency:**
- Increase to 5 if you have Whisk Pro account
- Decrease to 1 if hitting rate limits frequently

### 7.8 Remotion Rendering Settings

Control video rendering performance.

**Timeout:**
- Default: 120 seconds (2 minutes)
- Increase if videos fail to render (large assets)
- Decrease if you want faster failure detection

**When to increase timeout:**
- Rendering videos >90 seconds
- Large avatar files (>50MB)
- Slow system performance

**Example:**
```
Timeout: 180 (3 minutes)
```

**Concurrency:**
- Default: 4 threads
- Increase on powerful systems (8-core CPU)
- Decrease on slow systems (4-core CPU)

**Example:**
```
Concurrency: 8 (for 8-core+ CPU)
Concurrency: 2 (for 4-core CPU)
```

**Impact:**
- Higher concurrency = faster rendering
- Too high = system freezes (out of memory)

### 7.9 Saving Settings

**Process:**
1. Make all desired changes across all sections
2. Scroll to bottom
3. Click **"SAVE ALL SETTINGS"** button
4. Success message appears: "Settings saved successfully"

**⚠️ CRITICAL: Restart Workers**

Settings are saved to `.env` file immediately, but workers don't reload automatically.

**To apply changes:**
1. Stop system: Double-click `STOP.bat`
2. Wait 30-60 seconds (allow graceful shutdown)
3. Start system: Double-click `START.bat`
4. Wait for "System Online" indicator

**What happens if you don't restart:**
- New broadcasts use old settings
- Queue connections may fail
- API keys not updated
- Confusing behavior (settings saved but not active)

**Exception:**
- Frontend-only settings (display preferences) don't require restart
- But worker settings (AI provider, queue, etc.) DO require restart

---

## 8. Troubleshooting

### 8.1 System Won't Start

**Symptoms:**
- `START.bat` shows error messages
- "System Offline" indicator in dashboard
- Browser shows "Cannot connect" error

**Possible Causes:**
1. Docker Desktop not running
2. Missing `.env` file
3. Invalid environment variables
4. Port conflicts (8347, 5432, 6379 already in use)

#### Fix 1: Check Docker Desktop

**Steps:**
1. Open Docker Desktop application
2. Ensure it's running (whale icon in system tray)
3. Check status: Should show "Docker Desktop is running"

**If Docker not installed:**
1. Download from https://www.docker.com/products/docker-desktop/
2. Install (requires restart)
3. Start Docker Desktop
4. Wait for "Docker is running" status
5. Run `START.bat` again

#### Fix 2: Check .env File

**Steps:**
1. Navigate to: `C:\Users\konra\OneDrive\Projekte\20260319 Political content automation\obsidian-news-desk\`
2. Check if `.env` file exists
3. If missing, create it from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` in text editor
5. Fill in required API keys:
   - `AI_PROVIDER=google` (or claude, openai, groq)
   - `GOOGLE_AI_API_KEY=your_actual_key_here`
   - `WHISK_API_TOKEN=your_actual_token_here`
6. Save file
7. Run `START.bat` again

#### Fix 3: Check Environment Variables

**Common issues:**

**Missing API key:**
```
Error: No API key configured for provider 'google'
```
**Fix:** Add `GOOGLE_AI_API_KEY=...` to `.env`

**Invalid database URL:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Fix:** Check Docker containers running: `docker ps`

**Invalid Whisk token:**
```
Error: 401 Unauthorized (Whisk API)
```
**Fix:** Refresh token (see Section 7.7)

#### Fix 4: Check Port Conflicts

**Symptoms:**
```
Error: Port 8347 already in use
Error: Port 5432 already in use
```

**Check ports:**
```bash
netstat -ano | findstr :8347
netstat -ano | findstr :5432
netstat -ano | findstr :6379
```

**If ports in use:**
- Close other applications using those ports
- Or change ports in `.env`:
  ```
  PORT=8348 (instead of 8347)
  ```

### 8.2 Workers Won't Start

**Symptoms:**
- Workers console shows errors
- Jobs stuck in `pending` status
- No image generation happens

**Possible Causes:**
1. Redis connection failed
2. Database connection failed
3. Python dependencies missing (if using automated avatars)

#### Fix 1: Check Redis Connection

**Test connection:**
```bash
# Open Command Prompt
redis-cli ping
```

**Expected output:** `PONG`

**If error:**
```
Could not connect to Redis at 127.0.0.1:6379: Connection refused
```

**Fix:**
1. Check Docker containers running:
   ```bash
   docker ps
   ```
2. Should see container with `redis` image
3. If not running:
   ```bash
   docker-compose up -d redis
   ```

#### Fix 2: Check Database Connection

**Test connection:**
```bash
# Install psql (PostgreSQL client) if needed
psql postgresql://postgres:postgres@localhost:5432/obsidian_news_desk
```

**Expected:** SQL prompt (`obsidian_news_desk=#`)

**If error:**
```
psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed
```

**Fix:**
1. Check Docker containers:
   ```bash
   docker ps
   ```
2. Should see container with `postgres` image
3. If not running:
   ```bash
   docker-compose up -d db
   ```

#### Fix 3: Check Python Dependencies (Automated Avatars Only)

**Only relevant if AVATAR_MODE=automated**

**Test Python:**
```bash
python --version
```

**Expected:** `Python 3.8.0` or higher

**Test dependencies:**
```bash
cd integrations/heygen-automation
pip list | grep playwright
```

**Expected:** `playwright 1.x.x`

**If missing:**
```bash
pip install -r requirements.txt
playwright install chromium
```

### 8.3 Images Stuck on "Generating..."

**Symptoms:**
- Scene cards show "GENERATING..." for >5 minutes
- Status stays on `generating_images` indefinitely
- No new images appear

**Possible Causes:**
1. Whisk API token expired
2. Queue paused (ban detection)
3. Worker crashed
4. Rate limiting

#### Fix 1: Refresh Whisk Token

**Token expires after ~1 hour**

**Steps:**
1. Open https://labs.google.com/whisk in browser
2. Log in with Google account
3. Press F12 → Network tab
4. Generate a test image in Whisk
5. Find request to `generateImage` endpoint
6. Click request → Headers tab
7. Find `Authorization: Bearer ya29.a0...`
8. Copy everything after "Bearer " (the token)
9. Go to Settings page → Whisk API Token field
10. Paste new token
11. Save settings
12. Restart workers (`STOP.bat` → `START.bat`)

#### Fix 2: Resume Paused Queue

**Check for yellow banner:**
- "Queue appears to be paused due to ban detection"

**Cause:** Too many rapid image generation requests

**Steps to resume:**
1. **If "RESUME QUEUE" button exists:** Click it
2. **If no button:** Manually resume:
   ```bash
   # Stop workers
   STOP.bat

   # Wait 2 minutes (cooldown period)

   # Refresh Whisk token (see Fix 1)

   # Start workers
   START.bat
   ```

**Prevention:**
- Don't regenerate >5 scenes within 5 minutes
- Space out regenerations (60 seconds between)
- Use custom uploads instead of rapid regeneration

#### Fix 3: Check Worker Logs

**Open worker console window** (should be open from `START.bat`)

**Look for errors:**

**Redis connection error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Fix:** Restart Redis container: `docker-compose restart redis`

**Whisk API error:**
```
401 Unauthorized
```
**Fix:** Refresh token (see Fix 1)

**Ban detection:**
```
⚠️  Ban detected, pausing queue
```
**Fix:** Wait 10-15 minutes, then resume (see Fix 2)

**Worker crash:**
```
TypeError: Cannot read property 'id' of undefined
```
**Fix:** Restart workers

### 8.4 Queue Paused Warning

**Symptoms:**
- Yellow warning banner at top of storyboard page
- "Queue appears to be paused"
- Workers show "Ban detected, pausing queue"

**Cause:**
- Google Whisk API anti-spam detection triggered
- System generated too many images too quickly

**Automatic Response:**
- Workers pause all image generation
- Prevents permanent account ban
- Queue remains paused until manual intervention

**Recovery Steps:**

1. **Wait 10-15 minutes**
   - Let cooldown period pass
   - Google's rate limit window resets

2. **Manually log into Google Whisk:**
   - Open https://labs.google.com/whisk
   - Log in with your Google account
   - Complete any CAPTCHA challenges
   - Generate one test image manually (to prove you're human)

3. **Refresh API token:**
   - F12 → Network tab
   - Copy new `Authorization` token
   - Update in Settings
   - Save settings

4. **Restart workers:**
   ```bash
   STOP.bat
   # Wait 2 minutes
   START.bat
   ```

5. **Verify queue resumed:**
   - Check worker console
   - Should show: `✅ Queue resumed`
   - Yellow banner disappears

**Prevention:**
- Space out regenerations (>60 seconds apart)
- Avoid regenerating >5 scenes in 5 minutes
- Use custom uploads for minor tweaks
- Batch process overnight (automated mode only)

### 8.5 Avatar Upload Fails

**Symptoms:**
- "Failed to upload avatar" error message
- Upload spinner disappears but no success message
- Upload progress bar stops at 50%

**Possible Causes:**

#### Issue 1: Wrong File Format

**Error:** "Invalid file format"

**Cause:** File is not MP4

**Fix:**
- Check file extension (must be `.mp4`, not `.mov`, `.avi`, `.mkv`)
- Re-export from HeyGen as MP4
- Or convert using FFmpeg:
  ```bash
  ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
  ```

#### Issue 2: File Too Large

**Error:** "File size exceeds 100MB"

**Cause:** Avatar file >100MB

**Fix: Optimize with provided script:**
```bash
cd obsidian-news-desk
.\scripts\optimize-avatar.sh "C:\path\to\large-avatar.mp4" "optimized.mp4"
```

**Output:** ~2-3MB file, maintains 48kHz audio

#### Issue 3: Wrong Audio Sample Rate

**Error:** No immediate error, but later rendering shows desync

**Cause:** Audio sample rate is not 48kHz (e.g., 44.1kHz, 16kHz)

**Check sample rate:**
1. Right-click MP4 → Properties → Details
2. Look for "Audio sample rate"
3. Must be 48kHz (or 48000 Hz)

**Fix:**
- Re-generate avatar in HeyGen with 48kHz setting
- Or re-encode with FFmpeg:
  ```bash
  ffmpeg -i input.mp4 -c:v copy -c:a aac -ar 48000 output.mp4
  ```

#### Issue 4: Corrupted File

**Symptoms:**
- Upload completes but video won't play
- Rendering fails with "Invalid codec" error

**Test file:**
- Open in VLC Media Player
- If VLC can't play it, file is corrupted

**Fix:**
- Re-download from HeyGen
- Check download wasn't interrupted
- Try different browser for download

#### Issue 5: Network Timeout

**Error:** "Upload timed out"

**Cause:** Slow internet connection or large file

**Fix:**
- Check internet connection speed
- Optimize file to reduce size (see Issue 2)
- Try uploading again (may be temporary)

### 8.6 Rendering Fails

**Symptoms:**
- Status stuck on `rendering` for >10 minutes
- Worker shows error in console
- Job status changes to `failed`

**Possible Causes:**

#### Issue 1: Missing Scene Images

**Error:** "Cannot read property 'image_url' of null"

**Cause:** One or more scenes don't have images

**Fix:**
1. Go back to Storyboard Editor
2. Check all scene cards
3. Look for "No Image" or blank previews
4. Regenerate or upload missing images
5. Try rendering again

#### Issue 2: Corrupted Avatar MP4

**Error:** "Failed to load avatar video"

**Cause:** Avatar file is corrupted or has invalid codec

**Fix:**
1. Test avatar file in VLC Media Player
2. If it doesn't play, re-download from HeyGen
3. Upload fresh copy
4. Try rendering again

#### Issue 3: Insufficient Disk Space

**Error:** "ENOSPC: no space left on device"

**Cause:** Not enough free space on C: drive

**Fix:**
1. Open File Explorer → This PC
2. Check C: drive free space
3. Need at least 10GB free for safe rendering
4. Delete old broadcast videos:
   - Navigate to `C:\Users\konra\ObsidianNewsDesk\videos\`
   - Delete old `.mp4` files
5. Empty Recycle Bin
6. Try rendering again

#### Issue 4: Remotion Timeout

**Error:** "Rendering exceeded timeout (120s)"

**Cause:** Video is too complex or system is slow

**Fix: Increase timeout:**
1. Go to Settings page
2. Scroll to "🎬 REMOTION RENDERING" section
3. Increase timeout: `180` (3 minutes) or `240` (4 minutes)
4. Save settings
5. Restart workers
6. Try rendering again

#### Issue 5: Remotion Crash

**Error:** Stack trace in worker console

**Symptoms:**
- Worker window shows JavaScript error
- Worker stops responding

**Fix:**
1. Copy error message from console
2. Restart workers (`STOP.bat` → `START.bat`)
3. Check all assets (scenes, avatar) are valid
4. Try rendering again
5. If issue persists, report to admin with error message

### 8.7 Video Playback Issues

**Symptoms:**
- Downloaded video won't play
- Video plays but has artifacts
- Audio out of sync

#### Issue 1: Browser Can't Play Video

**Cause:** Browser doesn't support H.264 codec

**Fix:**
- Download video file
- Open in VLC Media Player (supports all codecs)
- Or try different browser (Chrome, Firefox, Edge)

#### Issue 2: Audio Desync

**Cause:** Avatar was uploaded with wrong sample rate (not 48kHz)

**Symptoms:**
- Avatar lips don't match audio
- Audio drifts out of sync over time

**Fix:**
- Re-generate avatar in HeyGen with 48kHz audio setting
- Upload new avatar
- Re-render video

**Cannot fix existing video** - must re-render with correct avatar

#### Issue 3: Video Choppy/Stuttering

**Cause:** System performance issue or corrupted render

**Fix:**
- Download video and test in VLC
- If VLC also stutters: Re-render video
- If VLC plays smoothly: Browser issue (use VLC instead)

### 8.8 Settings Not Saving

**Symptoms:**
- Click "Save Settings" but changes don't apply
- Settings revert to old values
- New broadcasts use old API key

#### Issue 1: .env File Permissions

**Cause:** `.env` file is read-only or locked

**Fix:**
1. Navigate to project folder
2. Right-click `.env` file → Properties
3. Uncheck "Read-only" if checked
4. Click OK
5. Try saving settings again

#### Issue 2: Workers Not Restarted

**Cause:** Workers are still using old settings from memory

**Symptoms:**
- Settings saved successfully
- But new broadcasts use old API provider

**Fix:**
1. Stop system: `STOP.bat`
2. Wait 60 seconds (allow graceful shutdown)
3. Start system: `START.bat`
4. Verify in worker console: Correct API provider loaded

#### Issue 3: Syntax Errors in Values

**Cause:** Invalid characters in settings fields

**Examples:**
```
DATABASE_URL=postgresql://user:pass@word@localhost:5432/db
                                  ↑ Extra @ symbol breaks parsing
```

**Fix:**
- Remove special characters from passwords
- Use simple alphanumeric values
- Or escape special characters properly

### 8.9 Hotkeys Not Working

**Symptoms:**
- Pressing `J`/`K` doesn't navigate
- `E` doesn't edit headlines
- `?` doesn't show help modal

#### Issue 1: Focus on Input Field

**Cause:** Cursor is in a text input, so hotkeys are disabled (by design)

**Fix:**
- Click outside the input field
- Press `Escape` to blur input
- Try hotkey again

#### Issue 2: Browser Shortcuts Conflicting

**Cause:** Browser has its own `Ctrl+K` shortcut (search)

**Fix:**
- Use plain letter keys (no Ctrl/Cmd)
- Or disable browser shortcuts (browser settings)

#### Issue 3: Page Not Focused

**Cause:** Browser window is in background

**Fix:**
- Click anywhere on the page first
- Ensure browser window is active
- Try hotkey again

### 8.10 Performance Issues

**Symptoms:**
- Slow page loading
- Laggy navigation
- Rendering takes >10 minutes

#### Fix 1: Close Other Applications

- Close Chrome tabs (keep only Obsidian News Desk)
- Close video editing software
- Close heavy applications (Photoshop, games)

#### Fix 2: Check System Resources

**Open Task Manager** (`Ctrl+Shift+Esc`)

**Check:**
- **CPU:** Should be <80% when rendering
- **RAM:** Should have >4GB free
- **Disk:** Should be <100% usage

**If maxed out:**
- Close background applications
- Restart computer
- Wait for Windows updates to complete

#### Fix 3: Increase Remotion Concurrency

**For powerful systems (8+ core CPU):**
1. Go to Settings → Remotion Rendering
2. Increase concurrency: `8`
3. Save settings
4. Restart workers

**For weak systems (4-core CPU):**
1. Decrease concurrency: `2`
2. Rendering will be slower but more stable

#### Fix 4: Check Disk Speed

**Symptoms:**
- Rendering stuck at "Loading assets..."
- Very slow image generation

**Cause:** Slow hard drive (HDD instead of SSD)

**Fix:**
- Move project folder to SSD if available
- Or accept slower performance on HDD
- Reduce asset sizes (optimize avatars, compress images)

---

## Workflow Summary Checklist

Use this checklist for every broadcast you create:

**Setup (One-Time):**
- [ ] System installed and configured
- [ ] API keys added to Settings
- [ ] Whisk token refreshed (if >1 hour old)
- [ ] HeyGen account active

**Creating a Broadcast:**
- [ ] Start system with `START.bat`
- [ ] Verify "System Online" indicator
- [ ] Click "NEW BROADCAST"
- [ ] Paste news script (150-300 words recommended)
- [ ] Select AI provider (Google recommended for beginners)
- [ ] Click "CREATE BROADCAST"

**Analysis Phase (Automatic):**
- [ ] Wait for `analyzing` to complete (~60 seconds)
- [ ] Review generated avatar script

**Image Generation Phase (Automatic):**
- [ ] Monitor `generating_images` status (~15-20 minutes for 8 scenes)
- [ ] Watch scenes complete one by one
- [ ] Check for yellow "Queue Paused" warning (if appears, see Section 8.3)

**Review Phase (Manual):**
- [ ] Review all scene images (check quality, relevance)
- [ ] Edit ticker headlines as needed (press `E` on each scene)
- [ ] Regenerate poor-quality images (press `R`, wait ~90 seconds)
- [ ] Or upload custom images (press `U`)
- [ ] Optional: Add reference images for consistency

**Avatar Generation (Manual):**
- [ ] Click "LAUNCH HEYGEN BROWSER"
- [ ] Copy avatar script from storyboard page
- [ ] Paste into HeyGen
- [ ] Select avatar and voice
- [ ] **⚠️ CRITICAL:** Set audio to 48kHz in HeyGen settings
- [ ] Generate avatar (wait 2-3 minutes)
- [ ] Download MP4 from HeyGen
- [ ] Upload to Obsidian News Desk (drag & drop)
- [ ] Verify green checkmark appears

**Rendering Phase (Automatic):**
- [ ] Wait for `rendering` to complete (~2-4 minutes)
- [ ] Do NOT close browser window

**Final Review:**
- [ ] Preview video in browser
- [ ] Check: Image quality, avatar sync, ticker scrolling
- [ ] Download final video

**Distribution:**
- [ ] Upload to YouTube/social media
- [ ] Share link or file

**Cleanup:**
- [ ] Stop system with `STOP.bat` (when done for the day)

---

## Getting Additional Help

**Documentation:**
- [Quick Start Guide](QUICK_START.md) - Initial setup and first broadcast
- [Reference Images Guide](REFERENCE_IMAGES_GUIDE.md) - Advanced image control
- [HeyGen Automation Setup](../HEYGEN_AUTOMATION_SETUP.md) - Optional Python automation
- [Content Policy Handling](../CONTENT_POLICY_HANDLING.md) - How the system handles content moderation
- [Hotkeys Reference](../HOTKEYS.md) - Complete keyboard shortcuts list

**Technical Documentation:**
- [CLAUDE.md](../CLAUDE.md) - System architecture (for developers)
- [Basic plan.txt](../Basic plan.txt) - Full technical specification

**Troubleshooting:**
- Check worker console for error messages
- Check browser console (F12) for client-side errors
- Review Section 8 of this guide

**Support:**
- Contact: System administrator
- Provide: Error messages, job ID, steps to reproduce

**Community Resources:**
- HeyGen support: https://help.heygen.com/
- Google Whisk: https://labs.google.com/whisk
- Remotion docs: https://www.remotion.dev/docs

---

**End of User Guide**

*You're now ready to produce professional news broadcasts efficiently. Good luck!*
