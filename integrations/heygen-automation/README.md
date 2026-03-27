# HeyGen Web Automation Integration

This directory contains the Python-based browser automation for HeyGen avatar generation.

## Overview

The automation uses Playwright to:
1. Submit avatar scripts to HeyGen web UI
2. Monitor generation progress
3. Auto-download completed videos
4. Communicate status via JSON files

**Source Repository:** https://github.com/marifaceless/heygen-web-automation

## Prerequisites

- Python 3.8 or higher
- Google Chrome browser
- HeyGen account with active subscription

## Installation

### Step 1: Clone the Repository

```bash
cd integrations
git clone https://github.com/marifaceless/heygen-web-automation.git heygen-automation
cd heygen-automation
```

### Step 2: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `playwright` - Browser automation
- `python-dotenv` - Environment variable support
- Other dependencies from requirements.txt

### Step 3: Install Playwright Browsers

```bash
playwright install chromium
```

### Step 4: One-Time HeyGen Login

```bash
python setup_profile.py
```

This will:
1. Open a Chrome browser window
2. Navigate to HeyGen login page
3. Wait for you to manually log in
4. Save the login session to `heygen-chrome-profile/`

**Important:** Complete the login and close the browser when prompted.

## Verification

Run the validation script to check your setup:

```bash
python verify-setup.py
```

Expected output:
```
✅ Python version: 3.9.0
✅ Playwright installed
✅ Chrome profile exists
✅ Ready for automated avatar generation
```

## File-Based Communication

The automation uses JSON files for Node.js <-> Python communication:

### Input: `ui_queue.json`

Node.js writes this file to queue avatar generation:

```json
{
  "text": "Your avatar script here...",
  "avatar": "AvatarName",
  "quality": "720p",
  "fps": "30"
}
```

### Output: `tracking.json`

Python updates this file with generation status:

```json
{
  "status": "processing",
  "progress": 45,
  "video_path": null,
  "error": null,
  "timestamp": "2026-03-20T10:30:00Z"
}
```

Status values:
- `queued` - Submitted to HeyGen
- `processing` - Generation in progress
- `completed` - Video downloaded
- `failed` - Error occurred

## Troubleshooting

### "Python not found"

- Windows: Install from https://www.python.org/downloads/
- Ensure Python is added to PATH
- Try `python --version` or `python3 --version`

### "Module not found" errors

```bash
pip install -r requirements.txt
playwright install chromium
```

### "HeyGen login required"

Re-run the profile setup:
```bash
python setup_profile.py
```

### "Element not found" / "Selector timeout"

HeyGen UI has likely changed. Check for updates to the automation script:
- Visit: https://github.com/marifaceless/heygen-web-automation
- Pull latest changes: `git pull origin main`

### Avatar generation stuck

1. Check tracking.json for error messages
2. Verify HeyGen account has credits
3. Try manual generation in HeyGen web UI
4. Switch to manual mode in settings

## Windows-Specific Notes

- Use forward slashes in paths: `C:/Users/name/project`
- Set `PYTHON_EXECUTABLE` in .env if Python not in PATH
- Chrome profile path: `./integrations/heygen-automation/heygen-chrome-profile`

## Security Considerations

- **Never commit** `heygen-chrome-profile/` (contains login session)
- **Never commit** `.env` files with API keys
- Review HeyGen Terms of Service regarding automation

## Support

For issues with the automation script itself, see:
- Original repository: https://github.com/marifaceless/heygen-web-automation/issues

For integration issues with Obsidian News Desk, check:
- Project documentation: `../../../CLAUDE.md`
- Settings UI: http://localhost:8347/settings
