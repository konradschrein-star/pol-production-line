# Obsidian News Desk - User Guide

**Complete guide to creating professional news broadcasts with AI automation**

Version: 1.0
Last Updated: March 22, 2026

---

## Table of Contents

1. [Quick Start (5 Minutes to First Video)](#quick-start)
2. [System Overview](#system-overview)
3. [Core Workflows](#core-workflows)
4. [Advanced Features](#advanced-features)
5. [Settings & Configuration](#settings--configuration)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Quick Start

**Goal:** Create your first broadcast video in 5 minutes

### Prerequisites

- Docker Desktop running (check status bar icon)
- HeyGen account (free tier works)
- News script (minimum 100 characters)

### Step-by-Step

1. **Start the Application**
   ```bash
   npm run dev
   ```
   Open browser to `http://localhost:8347`

2. **Create New Broadcast**
   - Click "New Broadcast" button
   - Select AI Provider (recommend "Google AI" for free tier)
   - Choose Visual Style Preset (default: "Professional News")
   - Paste your news script (100-10,000 characters)

3. **Generate Avatar Video in HeyGen**
   - Copy your script
   - Go to [HeyGen](https://app.heygen.com)
   - Create instant avatar video
   - **Critical:** Export as MP4, H.264 codec, 48kHz audio
   - Download the file

4. **Upload Avatar & Submit**
   - Drag-drop the HeyGen MP4 into upload zone
   - Click "Create Broadcast"
   - System analyzes script (30-60 seconds)

5. **Review Generated Images**
   - Job status changes to "Review Assets"
   - Check all 8 scene images
   - Edit ticker headlines if needed
   - Upload custom images for any scene (optional)

6. **Render Video**
   - Click "Render Video" button
   - Wait 2-5 minutes for final output
   - Download from "Final Video" card

**Done!** Your professional broadcast is ready.

---

## System Overview

### What Does This System Do?

Obsidian News Desk automates 90% of video production:

1. **Script Analysis** → AI extracts 8 visual scenes from your news script
2. **Image Generation** → Whisk API creates professional broadcast images
3. **Human Review** → You approve/edit images and headlines
4. **Video Rendering** → Remotion composites avatar + images + subtitles + ticker

### State Machine Workflow

```
pending → analyzing → generating_images → review_assets → rendering → completed
```

**Key Pause Point:** `review_assets` is where you manually review before final render

### Tech Stack

- **Frontend:** Next.js 14, React, TailwindCSS
- **Backend:** TypeScript, BullMQ (Redis queues)
- **Database:** PostgreSQL (via Docker)
- **Storage:** Local file system (images, avatars, videos)
- **AI:** Multi-LLM support (Claude, OpenAI, Google, Groq)
- **Image Gen:** Google Whisk API
- **Video:** Remotion (React-based video rendering)

---

## Core Workflows

### Workflow 1: Standard Production

**Timeline:** 10-15 minutes end-to-end

1. **Script Preparation** (2 min)
   - Write or paste news script (300-2000 words ideal)
   - Script should have clear story beats (hook, body, conclusion)
   - Minimum 100 characters required

2. **Avatar Generation** (3-5 min)
   - Go to HeyGen → Instant Avatar
   - Paste script → Select avatar → Generate
   - **Export Settings:** MP4, H.264, 48kHz audio (**critical for sync**)
   - Download file

3. **Job Creation** (1 min)
   - New Broadcast → Select AI provider → Choose style preset
   - Upload HeyGen avatar MP4
   - Submit → Wait for analysis

4. **Image Review** (3-5 min)
   - System generates 8 scene images automatically
   - Review each image for quality and relevance
   - Edit ticker headlines (200 char max per scene)
   - Upload custom images for any scenes that need replacement

5. **Final Render** (2-5 min)
   - Click "Render Video"
   - System composites all assets
   - Download final MP4

**Total Time:** 10-15 minutes
**Manual Effort:** 5-8 minutes (rest is automated)

### Workflow 2: Custom Image Override

**Use Case:** AI-generated image doesn't match your vision

**Steps:**

1. Find external image (1920x1080 recommended)
2. In Storyboard Editor → Click scene card
3. Drag-drop image OR click "Upload Custom Image"
4. System validates aspect ratio and resolution
5. Image replaces AI-generated version
6. Continue to render

**Supported Formats:** JPG, PNG, WebP
**Max File Size:** 10 MB
**Min Resolution:** 1280x720

### Workflow 3: Regenerate Failed Scenes

**Use Case:** Scene generation fails (content policy, API error)

**Indicators:**
- Red "Failed" badge on scene card
- Warning: "Failed After 3 Attempts"

**Fix Options:**

**Option A: Regenerate with Same Prompt**
1. Click "Regenerate" button on scene card
2. System retries with progressive prompt sanitization
3. Wait for completion

**Option B: Custom Prompt Override**
1. Click scene card → Edit mode
2. Modify image prompt to be more policy-compliant
3. Remove specific terms that may trigger violations
4. Click "Regenerate"

**Option C: Manual Upload**
1. Upload your own image (see Workflow 2)

### Workflow 4: Batch Production

**Use Case:** Create 10+ videos quickly

**Optimization Tips:**

1. **Prepare Scripts in Advance**
   - Use consistent structure across scripts
   - Pre-generate all HeyGen avatars in batch

2. **Use Same Style Preset**
   - Select one preset for all videos
   - Maintains visual consistency

3. **Queue Multiple Jobs**
   - Create jobs one after another
   - System processes in parallel (2-5 concurrent images)

4. **Monitor Queue**
   - Check Settings → Queue Status
   - Pause/resume if needed

5. **Batch Review**
   - Review all jobs at once
   - Use keyboard shortcuts (future feature)

**Expected Throughput:**
- **With monitoring:** 5-7 videos/hour
- **Unattended (advanced):** 10-15 videos/hour

---

## Advanced Features

### Style Presets

**Purpose:** Maintain consistent visual branding across all videos

**Default Presets:**

1. **Professional News** (Recommended)
   - Clean, broadcast-quality imagery
   - Sharp focus, high resolution
   - Best for serious topics

2. **Dramatic Documentary**
   - Cinematic lighting
   - Film grain texture
   - Best for investigative/documentary content

3. **Minimalist Modern**
   - Clean compositions
   - Bold colors, high contrast
   - Best for tech/business news

4. **Vintage Broadcast**
   - 1980s-90s aesthetic
   - Warm color grading
   - Best for historical/nostalgic content

5. **Tech Innovation**
   - Futuristic, high-tech style
   - Neon accents, sleek design
   - Best for technology news

**How It Works:**
- Preset adds prefix/suffix to your image prompts
- Example: "politician speaking" becomes "professional news photography, politician speaking, broadcast quality"
- Applied automatically to all 8 scenes

**Custom Presets:**
- Go to Settings → Style Presets
- Create new preset
- Define prefix and suffix text
- Save and use in future jobs

### Reference Images (Scene-Level)

**Purpose:** Guide AI to generate specific visual style

**How to Use:**

1. Click scene card → "Show Reference Images"
2. Upload 1-3 reference images:
   - **Subject:** Main person/object you want
   - **Scene:** Environment/setting style
   - **Style:** Overall aesthetic/mood
3. Whisk API uses these as visual guidance
4. Click "Regenerate" to apply

**Best Practices:**
- Use high-quality reference images (1920x1080+)
- Clear, well-lit subjects work best
- Don't mix conflicting styles

**Limitations:**
- Not exact replication (AI interpretation)
- Works better for style than specific faces
- May increase generation time

### Ticker Headline Editing

**Purpose:** Customize scrolling bottom ticker text

**How It Works:**
- Each scene has independent ticker headline (200 chars max)
- Ticker scrolls continuously during that scene
- Speed adjusts automatically based on text length

**Editing:**

1. Click scene card in Storyboard Editor
2. Edit ticker headline field
3. Click "Save"
4. Changes reflected in final render

**Tips:**
- Keep headlines concise (60-80 chars ideal)
- Use all-caps for traditional news ticker look
- Update in real-time during review phase

### Error Recovery

**Automatic Features:**

1. **Progressive Prompt Sanitization**
   - Attempt 1: Quick rule-based sanitization
   - Attempt 2: AI-powered moderate rewrite
   - Attempt 3: Aggressive AI sanitization
   - Logs all attempts in database

2. **Adaptive Rate Limiting**
   - Starts with 2 concurrent requests
   - Increases to 5 on success
   - Decreases to 1 on rate limits
   - Auto-backoff (5s → 10s → 20s)

3. **Placeholder Images**
   - If all retries fail, generates gray placeholder
   - Allows workflow to continue
   - You can replace later

**Manual Recovery:**

1. **Paused Queue** (token expired)
   - Go to Settings → Update Whisk API Token
   - Click "Resume Queue" button

2. **Failed Job**
   - Check error message in job card
   - Fix underlying issue (API key, network)
   - Click "Retry" or create new job

---

## Settings & Configuration

### AI Providers

**Location:** Settings page or New Broadcast form

**Options:**

1. **OpenAI (ChatGPT)**
   - Model: GPT-4 Turbo
   - Speed: Medium (5-10s analysis)
   - Quality: High
   - Cost: ~$0.02 per job
   - Rate Limit: 500 req/day (free tier)
   - **Recommended For:** Balanced quality/speed

2. **Claude (Anthropic)**
   - Model: Claude Sonnet 4.5
   - Speed: Medium (8-12s analysis)
   - Quality: Premium (best for complex scripts)
   - Cost: ~$0.03 per job
   - Rate Limit: API key required (paid)
   - **Recommended For:** Complex multi-topic scripts

3. **Google AI (Gemini)**
   - Model: Gemini 1.5 Flash
   - Speed: Fast (3-6s analysis)
   - Quality: Good
   - Cost: Free (up to 60 req/min)
   - Rate Limit: 60 req/min (generous)
   - **Recommended For:** Beginners, high-volume production

4. **Groq**
   - Model: Llama 3.1 70B
   - Speed: Very Fast (2-4s analysis)
   - Quality: Good
   - Cost: Free (beta)
   - Rate Limit: 30 req/min
   - **Recommended For:** Testing, rapid iteration

**How to Switch:**
1. Go to Settings
2. Update API keys
3. Select default provider
4. Save → Restart workers

### Whisk API Token

**Purpose:** Access Google's Whisk image generation API

**How to Get Token:**

1. Open [Google Whisk](https://labs.google.com/whisk) in browser
2. Press F12 → Network tab
3. Generate a test image
4. Find request with "Authorization: Bearer ya29..."
5. Copy full token (starts with `ya29`, ~500 chars)
6. Paste in Settings → Whisk API Token

**Token Lifetime:** ~1 hour
**Refresh:** Get new token when expired (auto-pause notifies you)

**Troubleshooting:**
- If images fail with 401: Token expired → refresh
- If fails with 403: Check Google account access
- If fails with 429: Rate limited → wait 1 minute

### Avatar Mode

**Options:**

1. **Manual Mode** (Default)
   - You generate avatar in HeyGen manually
   - Upload MP4 file
   - Full control over avatar quality
   - **Recommended For:** Most users

2. **Automated Mode** (Advanced)
   - Python script automates HeyGen browser
   - Requires 40-minute setup
   - See: `HEYGEN_AUTOMATION_SETUP.md`
   - **Recommended For:** High-volume production (50+ videos/day)

**Switching:**
- Settings → Avatar Mode → Select → Save
- Restart workers to apply

### Storage Configuration

**Default Paths:**
- **Images:** `C:\Users\<you>\ObsidianNewsDesk\images\`
- **Avatars:** `C:\Users\<you>\ObsidianNewsDesk\avatars\`
- **Videos:** `C:\Users\<you>\ObsidianNewsDesk\videos\`

**Change Location:**
1. Edit `.env` file
2. Update `LOCAL_STORAGE_ROOT=<new path>`
3. Restart application
4. Old files NOT migrated automatically

**Disk Space:**
- **Per Video:** ~50-150 MB (avatar + images + final)
- **100 Videos:** ~10 GB
- **Cleanup:** Delete old jobs from UI (future feature)

---

## Troubleshooting

### Common Issues

#### "Script too short" Error

**Cause:** Script less than 100 characters
**Fix:** Add more content or combine multiple stories

#### Images Stuck on "Generating"

**Possible Causes:**
1. Whisk API token expired
2. Content policy violation
3. Network timeout

**Fix:**
1. Check browser console for errors
2. Refresh Whisk token
3. Check job error message
4. Click "Regenerate" on stuck scenes

#### "Avatar out of sync" with Audio

**Cause:** HeyGen export settings incorrect
**Fix:**
- **Critical:** Export MP4 with H.264 codec, **48kHz audio**
- Re-export from HeyGen with correct settings
- Upload new avatar file
- Re-render video

#### Render Fails with "Asset not found"

**Cause:** Scene images missing
**Fix:**
1. Check all scenes have `image_url` in database
2. Verify files exist in `LOCAL_STORAGE_ROOT/images/`
3. Re-generate missing scenes
4. Try render again

#### Docker Not Running

**Symptoms:** "Connection refused" errors
**Fix:**
1. Open Docker Desktop
2. Wait for status "Engine running"
3. Restart application

### Performance Issues

#### Slow Image Generation

**Optimizations:**
1. Increase `WHISK_MAX_CONCURRENCY` in `.env` (max 5)
2. Simplify image prompts (shorter = faster)
3. Avoid complex reference images
4. Use Google AI provider (fastest analysis)

#### Render Takes >10 Minutes

**Normal For:**
- Videos >3 minutes long
- High resolution (4K)
- Complex animations

**Speed Up:**
1. Reduce `REMOTION_TIMEOUT_MS` (risky)
2. Increase `REMOTION_CONCURRENCY` to 4
3. Ensure avatar MP4 is H.264 (not HEVC)

### Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 401 | Unauthorized | Refresh Whisk API token |
| 429 | Rate Limited | Wait 60 seconds, retry |
| 400 | Content Policy | Edit prompt, remove violations |
| 500 | Server Error | Check logs, retry later |
| 503 | Service Down | Whisk API outage, wait |

---

## FAQ

### General

**Q: How much does it cost per video?**

**A:** Costs breakdown (typical 2-minute video):
- AI Analysis: $0-0.03 (depends on provider)
- Image Generation: Free (Whisk API, for now)
- HeyGen Avatar: $0-0.30 (free tier: 1 min free)
- **Total:** $0-0.33 per video

**Q: Can I use this commercially?**

**A:** Check each service's ToS:
- HeyGen: Yes (with paid plan)
- Whisk API: Check Google's terms
- This software: MIT license (free for commercial use)

**Q: How long until a video is ready?**

**A:**
- **Hands-on time:** 5-8 minutes (script + review)
- **Automated time:** 5-10 minutes (analysis + generation + render)
- **Total:** 10-18 minutes end-to-end

**Q: Can I edit videos after rendering?**

**A:** Not in current version. Future feature:
- Trim clips
- Adjust timing
- Replace scenes
- Re-export

### Technical

**Q: What video formats are supported?**

**A:**
- **Input (Avatar):** MP4 (H.264, 48kHz audio required)
- **Output:** MP4 (H.264, AAC audio, 1920x1080)

**Q: Can I change video resolution?**

**A:** Not in UI. Advanced users can modify:
- `src/lib/remotion/render.ts` → Change composition dimensions
- Requires TypeScript knowledge

**Q: How do I back up my database?**

**A:**
```bash
# Export PostgreSQL backup
docker exec obsidian-postgres pg_dump -U obsidian obsidian_news > backup.sql

# Restore backup
docker exec -i obsidian-postgres psql -U obsidian obsidian_news < backup.sql
```

**Q: Can I host this remotely?**

**A:** Yes! See `DEPLOYMENT.md` for:
- Railway.app deployment (5 minutes)
- Self-hosted VPS setup (30 minutes)
- Docker Compose production config

### Content

**Q: What types of scripts work best?**

**A:**
- **Best:** News broadcasts, educational content, explainers
- **Good:** Product demos, company updates, tutorials
- **Poor:** Abstract concepts, interviews (no B-roll), poetry

**Q: Can I use multiple speakers?**

**A:** Not currently. HeyGen supports one avatar per video.
**Workaround:** Create separate videos, merge externally.

**Q: What languages are supported?**

**A:**
- **Script Analysis:** All major languages (depends on AI provider)
- **Avatar Speech:** 40+ languages (HeyGen)
- **Subtitles:** Auto-generated for all languages

---

## Getting Help

### Resources

- **GitHub Issues:** [obsidian-news-desk/issues](https://github.com/your-org/obsidian-news-desk/issues)
- **Documentation:** `/docs/` folder
- **Email Support:** support@yourdomain.com (if applicable)

### Reporting Bugs

**Include:**
1. Job ID (from URL: `/jobs/<ID>`)
2. Error message (copy full text)
3. Screenshot of issue
4. Steps to reproduce

### Feature Requests

**Submit via:**
- GitHub Issues (preferred)
- Email with subject: "[FEATURE] Your idea"

**Current Roadmap:**
- Batch image upload
- Video editing post-render
- A/B testing (with/without references)
- Auto-thumbnail generation
- One-click installer

---

## Credits

**Built With:**
- [Next.js](https://nextjs.org) - Web framework
- [Remotion](https://remotion.dev) - Video rendering
- [BullMQ](https://bullmq.io) - Queue management
- [Google Whisk](https://labs.google.com/whisk) - Image generation
- [HeyGen](https://heygen.com) - Avatar generation

**License:** MIT
**Maintained By:** Your Team

---

**Last Updated:** March 22, 2026
**Version:** 1.0.0

For the latest updates, see [CHANGELOG.md](./CHANGELOG.md)
