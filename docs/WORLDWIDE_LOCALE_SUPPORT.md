# Worldwide Locale Support

**Status:** ✅ Fully Automated - Works in ANY country/language

## How It Works

The extension **automatically detects your locale** from your browser and Whisk URL. No manual configuration needed!

### Auto-Detection Process

1. **Check Open Tabs:** Extension looks for open Whisk tabs
2. **Extract Locale:** Parses URL: `/fx/{LOCALE}/tools/whisk/`
3. **Cache Result:** Saves detected locale to extension storage
4. **Fallback:** Uses browser language if no Whisk tabs open

### Supported Locales

| Country/Region | Language | Locale | Example URL |
|----------------|----------|--------|-------------|
| 🇩🇪 Germany | German | `de` | `/fx/de/tools/whisk/project` |
| 🇸🇬 Singapore | English | `en` | `/fx/en/tools/whisk/project` |
| 🇺🇸 USA | English | `en` | `/fx/en/tools/whisk/project` |
| 🇬🇧 UK | English | `en` | `/fx/en/tools/whisk/project` |
| 🇫🇷 France | French | `fr` | `/fx/fr/tools/whisk/project` |
| 🇯🇵 Japan | Japanese | `ja` | `/fx/ja/tools/whisk/project` |
| 🇪🇸 Spain | Spanish | `es` | `/fx/es/tools/whisk/project` |
| 🇮🇹 Italy | Italian | `it` | `/fx/it/tools/whisk/project` |
| 🇨🇳 China | Chinese (Simplified) | `zh` | `/fx/zh/tools/whisk/project` |
| 🇰🇷 Korea | Korean | `ko` | `/fx/ko/tools/whisk/project` |
| 🇧🇷 Brazil | Portuguese | `pt` | `/fx/pt/tools/whisk/project` |
| 🇷🇺 Russia | Russian | `ru` | `/fx/ru/tools/whisk/project` |
| 🇳🇱 Netherlands | Dutch | `nl` | `/fx/nl/tools/whisk/project` |
| 🇸🇪 Sweden | Swedish | `sv` | `/fx/sv/tools/whisk/project` |
| 🇵🇱 Poland | Polish | `pl` | `/fx/pl/tools/whisk/project` |

**Note:** Google Labs uses 2-letter ISO 639-1 language codes (not region codes like en-US, en-SG).

## Installation Worldwide

### Step 1: Install Extension (Same for All Countries)

```bash
cd obsidian-news-desk/chrome-extension
# Load unpacked extension in Chrome
# No configuration needed - auto-detects locale!
```

### Step 2: Open Whisk in Your Language

Open Whisk in your browser - it will auto-redirect to your locale:
- Visit: https://labs.google/fx/tools/whisk
- Google redirects to: https://labs.google/fx/{YOUR_LOCALE}/tools/whisk
- Extension detects and remembers your locale

### Step 3: Generate Test Image

Generate any image in Whisk. Extension will:
1. Detect your locale from URL
2. Capture token from API request
3. Configure itself for your region
4. All future refreshes use correct locale

## Backend Configuration

### Auto-Detection (Recommended)

The backend also supports locale detection via environment variable:

```bash
# In .env file:
WHISK_LOCALE=auto   # Auto-detect from system
```

### Manual Override

If auto-detection doesn't work, set manually:

```bash
# Germany
WHISK_LOCALE=de

# Singapore
WHISK_LOCALE=en

# France
WHISK_LOCALE=fr

# Japan
WHISK_LOCALE=ja

# China
WHISK_LOCALE=zh
```

## Troubleshooting

### Wrong Locale Detected

**Clear cached locale:**
```javascript
// In extension console (chrome://extensions/)
chrome.storage.local.remove('detectedLocale');
// Then reload extension and open Whisk again
```

**Or manually set locale:**
```javascript
chrome.storage.local.set({ detectedLocale: 'en' }); // Change 'en' to your locale
```

### Locale Not Working

**Check Whisk URL in browser:**
1. Open Whisk: https://labs.google/fx/tools/whisk
2. Check URL bar after redirect
3. Look for `/fx/{LOCALE}/` in URL
4. If no locale visible, your region may not use one

**Check extension logs:**
```
chrome://extensions/ → Whisk Token Manager → Inspect views: service worker
Look for: [Whisk Manager] 🌍 Auto-detected locale: XX
```

### API Endpoint Different

If your region uses a different API endpoint:

**Check network requests:**
1. Open Whisk in Chrome
2. Open DevTools (F12) → Network tab
3. Generate test image
4. Look for API request URL
5. If different from `aisandbox-pa.googleapis.com`, contact support

## For Developers: Adding New Locale

If a new locale is added to Google Labs:

**Extension automatically supports it!** No code changes needed.

**Backend requires:** Update `.env` file:
```bash
WHISK_LOCALE=NEW_LOCALE_CODE
```

## Testing Locale Detection

**Test script:**
```bash
cd obsidian-news-desk/chrome-extension

# Open console in extension
# Run this to see detected locale:
CONFIG.getLocale().then(locale => console.log('Detected:', locale));
```

**Expected output:**
```
[Whisk Manager] 🌍 Auto-detected locale: de
Detected: de
```

## API Compatibility

**All locales use the same API:**
- Endpoint: `https://labs.google/fx/api/auth/session`
- Auth: OAuth 2.0 Bearer tokens (same worldwide)
- Format: `ya29.a0...` (same token format globally)

**Locale only affects UI URLs, not API endpoints!**

## Your Friend in Singapore

**For Singapore users:**

1. Install extension (same as Germany)
2. Open: https://labs.google/fx/tools/whisk
3. Google redirects to: https://labs.google/fx/en/tools/whisk
4. Extension detects: `locale = 'en'`
5. Done! Works automatically

**Backend .env in Singapore:**
```bash
WHISK_LOCALE=en
```

**Everything else is identical to German installation!**

## Benefits of Auto-Detection

✅ **Zero configuration** - Just install and use
✅ **Works worldwide** - All 15+ supported languages
✅ **Automatic updates** - New locales work instantly
✅ **No hardcoded URLs** - Adapts to Google's changes
✅ **Fallback logic** - Uses browser language if needed
✅ **Cached for performance** - Detects once, remembers forever

## Summary for Installation Guide

**For ANY country:**
```bash
1. Install extension
2. Open https://labs.google/fx/tools/whisk
3. Generate test image
4. Extension auto-configures for your locale
5. Done! Works automatically
```

**No manual configuration. No locale selection. Just works.** 🌍
