# HeyGen Automation Integration - Setup Guide

## Overview

The Obsidian News Desk now supports **two modes** for avatar generation:

1. **Manual Mode (Default)** - You control the browser, generate avatar manually
2. **Automated Mode (Optional)** - Python automation handles everything

## Quick Start - Manual Mode (No Setup Required)

Manual mode is enabled by default. After images complete:

1. Click "LAUNCH HEYGEN BROWSER" button
2. Generate avatar in HeyGen web UI
3. Download the .mp4 file
4. Upload it via the "COMPILE" button

**No Python setup needed!**

---

## Automated Mode Setup (Optional)

For hands-free avatar generation, follow these steps:

### Prerequisites

- ✅ Python 3.8 or higher
- ✅ Google Chrome browser
- ✅ Active HeyGen subscription
- ✅ ~500MB disk space (for Playwright Chromium)

### Step 1: Install Python

**Windows:**
1. Download from https://www.python.org/downloads/
2. ✅ Check "Add Python to PATH" during installation
3. Verify: Open Command Prompt and run `python --version`

**Expected output:** `Python 3.9.0` (or higher)

### Step 2: Clone HeyGen Automation Repository

```bash
cd obsidian-news-desk/integrations
git clone https://github.com/marifaceless/heygen-web-automation.git heygen-automation
cd heygen-automation
```

**Expected result:** Directory `integrations/heygen-automation/` created

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

**This installs:**
- `playwright` - Browser automation framework
- `python-dotenv` - Environment variable support
- Playwright Chromium browser (~500MB)

**Expected output:**
```
Successfully installed playwright-1.x.x python-dotenv-x.x.x
Playwright build v1111 installed
```

### Step 4: One-Time HeyGen Login

```bash
python setup_profile.py
```

**What happens:**
1. Chrome browser opens automatically
2. Navigate to HeyGen login page
3. **You manually log in** to HeyGen (use your credentials)
4. Browser saves login session to `heygen-chrome-profile/`
5. Close browser when complete

**⚠️ Security Note:** Never commit `heygen-chrome-profile/` (contains login session)

### Step 5: Verify Setup

From the main project directory:

```bash
npm run validate:python
```

**Expected output:**
```
✅ Python version: 3.9.0
✅ Playwright installed
✅ heygen_automation.py found
✅ setup_profile.py found
✅ requirements.txt found
✅ Chrome profile exists
✅ All checks passed - Ready for automated avatar generation
```

### Step 6: Enable Automated Mode

1. Open http://localhost:8347/settings
2. Scroll to "🎭 AVATAR GENERATION"
3. Change mode from **Manual** to **Automated**
4. Click "SAVE ALL SETTINGS"
5. Restart workers:
   ```bash
   # Stop workers (Ctrl+C)
   npm run workers
   ```

**Expected output:**
```
✅ Analyze worker loaded
✅ Images worker loaded
✅ Avatar automation worker loaded (mode: automated)
✅ Render worker loaded
```

---

## How Automated Mode Works

### Flow Diagram

```
Images Complete
    ↓
Python automation spawned (detached process)
    ↓
Submits avatar script to HeyGen web UI
    ↓
Polls for completion every 5 seconds
    ↓
Auto-downloads .mp4 when ready (2-5 minutes)
    ↓
Updates database
    ↓
Queues for rendering
```

### File-Based Communication

Node.js and Python communicate via JSON files:

**Input:** `integrations/heygen-automation/ui_queue.json`
```json
{
  "text": "Your avatar script here...",
  "avatar": "Angela_public",
  "quality": "720p",
  "fps": "30"
}
```

**Output:** `integrations/heygen-automation/tracking.json`
```json
{
  "status": "completed",
  "progress": 100,
  "video_path": "/path/to/avatar.mp4",
  "error": null
}
```

---

## Troubleshooting

### "Python not found"

**Cause:** Python not installed or not in PATH

**Fix:**
```bash
# Check Python installation
python --version

# If not found, install from https://www.python.org/downloads/
# Ensure "Add Python to PATH" is checked
```

### "Module not found: playwright"

**Cause:** Python dependencies not installed

**Fix:**
```bash
cd integrations/heygen-automation
pip install -r requirements.txt
playwright install chromium
```

### "HeyGen login required"

**Cause:** Chrome profile doesn't exist or session expired

**Fix:**
```bash
cd integrations/heygen-automation
python setup_profile.py
# Log in to HeyGen when browser opens
```

### "Element not found" / "Selector timeout"

**Cause:** HeyGen UI changed (web scraping broke)

**Fix:**
1. Check for updates: `git pull` in `heygen-automation/` directory
2. If no updates available, switch to manual mode temporarily
3. Report issue: https://github.com/marifaceless/heygen-web-automation/issues

### Avatar generation stuck at "processing"

**Possible causes:**
- HeyGen server slow
- No credits in HeyGen account
- Rate limiting

**Fix:**
1. Check HeyGen account credits
2. Wait 30 minutes (default timeout)
3. Check worker logs: `npm run workers`
4. Retry will happen automatically (2 attempts with exponential backoff)
5. After max retries, switch to manual mode

### Worker shows "mode: manual" but .env says "automated"

**Cause:** Workers not restarted after .env change

**Fix:**
```bash
# Stop workers (Ctrl+C)
npm run workers
# Should now show: "mode: automated"
```

---

## Switching Between Modes

### Manual → Automated

1. Complete automated mode setup (Steps 1-5 above)
2. Settings → Avatar Generation Mode → **Automated**
3. Save settings
4. Restart workers

### Automated → Manual

1. Settings → Avatar Generation Mode → **Manual**
2. Save settings
3. Restart workers (optional - takes effect immediately for new jobs)

**No data loss** - Jobs preserve their state during mode switch

---

## Cost Comparison

| Mode | HeyGen Credits | Time per Avatar | Human Effort |
|------|----------------|----------------|--------------|
| Manual | Same | 2-3 min | 2-3 min manual work |
| Automated | Same | 2-5 min | 0 min (fully automated) |

**Both modes use the same HeyGen credits.** Automated mode just removes manual work.

---

## Best Practices

### Use Manual Mode When:
- ✅ First-time setup/testing
- ✅ Quality-critical broadcasts
- ✅ HeyGen UI has changed (automation broke)
- ✅ You want full control

### Use Automated Mode When:
- ✅ High-volume batch processing (10+ videos/day)
- ✅ Overnight/unattended workflows
- ✅ Repetitive production with same avatar
- ✅ Time is critical

### Security Recommendations:
- ⚠️ Never commit `.env` or `heygen-chrome-profile/`
- ⚠️ Review HeyGen Terms of Service regarding automation
- ⚠️ Keep `heygen-automation/` up to date (`git pull` regularly)
- ⚠️ Use strong password for HeyGen account

---

## Technical Details

### BullMQ Queue: `queue_avatar_automation`

- **Concurrency:** 1 (only one avatar generation at a time)
- **Timeout:** 30 minutes
- **Retries:** 2 attempts with exponential backoff (1min, 2min)
- **Polling:** Every 5 seconds

### Database Status Flow

```
review_assets (images complete)
    ↓
generating_avatar (automation started)
    ↓
rendering (avatar complete, queued to Remotion)
    ↓
completed (final video ready)
```

### Error States

- **failed** - Automation failed after max retries
- **error_message** column contains diagnostic info

---

## Logs and Monitoring

### Worker Logs

```bash
npm run workers
```

**Look for:**
```
🎭 [AVATAR] Starting automated generation for job abc-123
📝 Avatar script length: 1234 characters
🚀 Starting HeyGen automation...
⏳ Job abc-123: processing (45%) - 90s
✅ Avatar generated in 180s: /path/to/avatar.mp4
```

### Error Logs

```
❌ [AVATAR] Error for job abc-123: Python not found
💡 Fix: Install Python 3.8+ or set PYTHON_EXECUTABLE in .env
```

---

## Advanced Configuration

### Custom Avatar Name

Edit `.env`:
```bash
HEYGEN_DEFAULT_AVATAR=YourAvatarName
```

### Custom Python Path (Windows)

If `python` command doesn't work:
```bash
PYTHON_EXECUTABLE=C:\Python39\python.exe
```

Or use `python3`:
```bash
PYTHON_EXECUTABLE=python3
```

### Custom Timeout (for slow HeyGen servers)

Edit `src/lib/queue/workers/avatar.worker.ts`:
```typescript
const result = await generateAvatar(jobId, {
  scriptText: avatar_script,
  timeoutMs: 60 * 60 * 1000, // 60 minutes (default: 30)
  pollIntervalMs: 10000 // Poll every 10s (default: 5s)
});
```

---

## FAQ

**Q: Does automated mode cost more credits?**
A: No, both modes use the same HeyGen credits.

**Q: Can I run multiple avatar generations in parallel?**
A: No, concurrency is set to 1 to prevent HeyGen rate limiting.

**Q: What happens if I switch modes mid-job?**
A: Current job completes in its original mode. New jobs use the new mode.

**Q: Can I use this on Linux/Mac?**
A: Yes! The Python automation supports all platforms. Just change paths in `.env`.

**Q: Is this against HeyGen Terms of Service?**
A: Review HeyGen's ToS. This is browser automation (web scraping), not API usage.

**Q: What if HeyGen updates their UI?**
A: Check https://github.com/marifaceless/heygen-web-automation for updates. Otherwise, switch to manual mode temporarily.

**Q: Can I customize the avatar, quality, or FPS?**
A: Yes, edit `.env` or modify `src/lib/integrations/heygen/tracking-parser.ts` defaults.

---

## Support

- **Integration issues:** Check this guide first, then CLAUDE.md
- **Python automation issues:** https://github.com/marifaceless/heygen-web-automation/issues
- **HeyGen account issues:** HeyGen support

---

## Summary Checklist

### Manual Mode (Default)
- [x] Works out of the box
- [x] No setup required
- [x] Click "LAUNCH HEYGEN BROWSER" → generate → upload

### Automated Mode (Optional)
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Repository cloned (`integrations/heygen-automation/`)
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Playwright browsers installed (`playwright install chromium`)
- [ ] HeyGen login complete (`python setup_profile.py`)
- [ ] Validation passes (`npm run validate:python`)
- [ ] Settings updated (mode → automated)
- [ ] Workers restarted (`npm run workers`)

✅ **You're ready to automate!**
