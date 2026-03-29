# Token Refresh Integration Test

## Overview

This test validates the complete Whisk token refresh workflow from detection to recovery:

1. **Phase 1: Before Refresh** - Attempts to generate a test image with expired token (expects 401 error)
2. **Phase 2: Extension Refresh** - Triggers Chrome extension to capture fresh token from Whisk
3. **Phase 3: After Refresh** - Retries image generation with new token (expects success)

## Prerequisites

1. **Chrome Extension Installed:**
   - Whisk Token Manager extension must be installed
   - Extension ID: `gcgblhgncmhjchllkcpcneeibddhmbbe`
   - Check at `chrome://extensions/`

2. **Backend Running:**
   - Next.js dev server on port 8347
   - Redis and Postgres via Docker

3. **Expired Token (for testing):**
   - Test works best when token is actually expired
   - If token is valid, test will skip phases 2-3

## Running the Test

```bash
cd obsidian-news-desk
npm run test:token-refresh
```

## What Happens

### Phase 1: Before Refresh (Expected: 401 Error)
```
🎨 Attempting to generate: "A photorealistic red apple..."
❌ Expected error: Token expired (401)
✅ Token correctly detected as expired
```

### Phase 2: Extension Refresh
```
🌐 Extension ID: gcgblhgncmhjchllkcpcneeibddhmbbe
⏳ Triggering extension refresh...
```

**The test will:**
1. Call `ExtensionIntegration.triggerTokenRefresh()`
2. Open Chrome extension popup programmatically
3. Wait for extension to:
   - Open background tab to Whisk
   - Capture token from API request
   - POST token to `http://localhost:8347/api/whisk/token`
   - Update `.env` file
4. Monitor `.env` file for token change (30s timeout)

**Expected Output:**
```
✅ Token refreshed successfully
📋 New token (first 20 chars): ya29.a0ATkoCc12345...
```

### Phase 3: After Refresh (Expected: Success)
```
🎨 Generating test image: "A photorealistic red apple..."
✅ Image generated successfully!
📸 Image URL: https://labs.google/fx/output/...
⏱️  Generation time: 8234ms
```

## Success Criteria

All 3 phases must pass:

- ✅ Phase 1: Token correctly identified as expired (401 error)
- ✅ Phase 2: Extension captured new token within 30 seconds
- ✅ Phase 3: Image generation successful with fresh token

## Troubleshooting

### Extension Timeout (Phase 2 Fails)

**Symptoms:**
```
❌ Extension did not provide token within 30000ms
```

**Causes:**
1. Chrome extension not installed or disabled
2. Extension ID mismatch in `.env`
3. Chrome not running
4. Extension permissions denied

**Fix:**
1. Verify extension is installed and enabled:
   ```
   chrome://extensions/
   ```
2. Check extension ID in `.env`:
   ```
   AUTO_WHISK_EXTENSION_ID=gcgblhgncmhjchllkcpcneeibddhmbbe
   ```
3. Manually test extension:
   - Open Chrome
   - Visit https://labs.google.com/whisk
   - Generate test image
   - Check extension logs in DevTools

### 2FA Required (Phase 2 Fails)

**Symptoms:**
```
❌ Google 2-Step Verification required
```

**Fix:**
1. Open Chrome manually
2. Visit https://labs.google.com/whisk
3. Complete 2FA authentication
4. Retry test - should work now

### Token Still Valid (Phase 1 Passes Unexpectedly)

**Symptoms:**
```
⚠️  WARNING: Token is already valid. Cannot test refresh flow.
```

**This is fine!** It means your token is working. To force a refresh test:

1. Manually corrupt token in `.env`:
   ```
   WHISK_API_TOKEN=invalid_token_12345
   ```
2. Run test - Phase 1 will fail with 401
3. Phase 2 will refresh token
4. Phase 3 will succeed

### Image Generation Fails After Refresh (Phase 3 Fails)

**Symptoms:**
```
❌ Image generation failed: Token still expired after refresh
```

**Causes:**
1. Extension didn't actually capture a valid token
2. Token captured but not loaded by backend
3. Whisk API issue (not token-related)

**Fix:**
1. Check `.env` file - verify `WHISK_API_TOKEN` changed
2. Check backend logs for token update message
3. Manually verify token works:
   ```bash
   curl -H "Authorization: Bearer $(cat .env | grep WHISK_API_TOKEN | cut -d'=' -f2)" \
     https://aisandbox-pa.googleapis.com/v1/whisk:ping
   ```

## Test Output Example

### Success Case
```
╔════════════════════════════════════════════════════════════╗
║   WHISK TOKEN REFRESH INTEGRATION TEST                    ║
╚════════════════════════════════════════════════════════════╝

📊 PHASE 1: Testing image generation with expired token...
✅ Expected error: Token expired (401)

🔄 PHASE 2: Triggering Chrome extension token refresh...
📋 Original token (first 20 chars): ya29.a0ATkoCc98765...
🌐 Extension ID: gcgblhgncmhjchllkcpcneeibddhmbbe
⏳ Triggering extension refresh...
✅ Token changed detected in .env file
✅ Token refreshed successfully
📋 New token (first 20 chars): ya29.a0ATkoCc12345...

⏳ Waiting 2 seconds for backend to process new token...

✨ PHASE 3: Testing image generation with fresh token...
🎨 Generating test image: "A photorealistic red apple..."
✅ Image generated successfully!
📸 Image URL: https://labs.google/fx/output/1234567890
⏱️  Generation time: 8234ms

╔════════════════════════════════════════════════════════════╗
║   TEST RESULTS SUMMARY                                    ║
╚════════════════════════════════════════════════════════════╝

✅ Phase 1: BEFORE REFRESH
   Duration: 1523ms
   Details: Token correctly detected as expired

✅ Phase 2: EXTENSION REFRESH
   Duration: 4821ms
   Details: Extension successfully captured and updated token

✅ Phase 3: AFTER REFRESH
   Duration: 8234ms
   Details: Image generation successful with fresh token

═══════════════════════════════════════════════════════════

🎉 ALL TESTS PASSED!
```

## Integration with CI/CD

This test can be included in your pre-deployment checks:

```bash
# In your deployment script
npm run test:token-refresh

if [ $? -ne 0 ]; then
  echo "❌ Token refresh test failed - cannot deploy"
  exit 1
fi
```

## Related Documentation

- [Extension Architecture](./chrome-extension/README.md)
- [Whisk API Integration](./WHISK_API.md)
- [Token Management](./TOKEN_MANAGEMENT.md)
