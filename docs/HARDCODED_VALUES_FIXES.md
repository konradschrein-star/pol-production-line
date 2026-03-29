# Hardcoded Values Fixes - Complete

**Date:** March 29, 2026
**Status:** ✅ ALL CRITICAL & HIGH PRIORITY ISSUES RESOLVED

## Summary

Fixed all hardcoded values identified in the comprehensive codebase audit. The system now:
- Uses environment variables for all configuration
- Fails securely in production (no unsafe defaults)
- Works across different machines and users
- Has clear error messages when configuration is missing

---

## ✅ COMPLETED FIXES

### Priority 1: CRITICAL Issues

#### 1. Extension ID Conflict (RESOLVED)
**File:** `src/lib/whisk/extension-integration.ts` (line 23)
**Issue:** Wrong extension ID hardcoded as fallback (`gcgblhgncmhjchllkcpcneeibddhmbbe`)
**Fix:** Removed fallback entirely, throws error if `AUTO_WHISK_EXTENSION_ID` not configured
```typescript
// BEFORE: Wrong ID hardcoded
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe';

// AFTER: No unsafe fallback
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID;
if (!EXTENSION_ID) {
  throw new Error('AUTO_WHISK_EXTENSION_ID not configured. Add to your .env file.');
}
```

#### 2. URL Typos (RESOLVED)
**Files:**
- `src/app/(dashboard)/jobs/[id]/page.tsx` (line 419)
- `src/lib/errors/error-codes.ts` (line 109-111)

**Issue:** "wisk" instead of "whisk" (broken links)
**Fix:** Corrected to `https://labs.google.com/whisk`

#### 3. Extension ID Fallback in Auto Whisk (RESOLVED)
**File:** `src/lib/browser/auto-whisk.ts` (line 12)
**Issue:** Hardcoded extension ID as fallback
**Fix:** Removed fallback, throws error if not configured
```typescript
// BEFORE
const extensionId = process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe';

// AFTER
const extensionId = process.env.AUTO_WHISK_EXTENSION_ID;
if (!extensionId) {
  throw new Error('AUTO_WHISK_EXTENSION_ID not configured...');
}
```

#### 4. Whisk API Endpoint (RESOLVED)
**File:** `src/lib/whisk/api.ts` (line 38)
**Issue:** Hardcoded API endpoint URL
**Fix:** Made configurable via `WHISK_API_ENDPOINT` environment variable
```typescript
// BEFORE
private apiUrl: string = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';

// AFTER
private apiUrl: string = process.env.WHISK_API_ENDPOINT ||
  'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
```

### Priority 2: HIGH PRIORITY Issues

#### 5. Localhost Fallback in Middleware (RESOLVED)
**File:** `src/middleware.ts` (line 285)
**Issue:** Hardcoded localhost fallback breaks production
**Fix:** Environment-aware fallback with fail-secure production mode
```typescript
// BEFORE
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';

// AFTER
let appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  if (isProduction) {
    // Fail-secure: return 500 error in production
    return NextResponse.json({
      error: 'Configuration Error',
      message: 'NEXT_PUBLIC_APP_URL must be set in production.',
    }, { status: 500 });
  }
  appUrl = 'http://localhost:8347'; // Development only
}
```

#### 6. Localhost Fallback in Config (RESOLVED)
**File:** `src/lib/config/index.ts` (line 146)
**Issue:** Hardcoded localhost fallback breaks production
**Fix:** IIFE that throws error in production if not set
```typescript
// BEFORE
baseUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:8347'),

// AFTER
baseUrl: (() => {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    const isProduction = getEnv('NODE_ENV', 'development') === 'production';
    if (isProduction) {
      throw new Error('NEXT_PUBLIC_APP_URL must be set in production.');
    }
    return 'http://localhost:8347'; // Development only
  }
  return url;
})(),
```

### Priority 3: MEDIUM PRIORITY Issues

#### 7. Chrome Setup Script (RESOLVED)
**File:** `scripts/setup-chrome-profile.ts` (line 77)
**Issue:** Hardcoded extension ID in Chrome Web Store URL
**Fix:** Read from `AUTO_WHISK_EXTENSION_ID`, throw error if not set
```typescript
// Added at top of file
config(); // Load .env
const extensionId = process.env.AUTO_WHISK_EXTENSION_ID;
if (!extensionId) {
  console.error('❌ AUTO_WHISK_EXTENSION_ID not configured...');
  process.exit(1);
}

// Updated URL construction
`https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/${extensionId}`
```

#### 8. Comet Setup Script (RESOLVED)
**File:** `scripts/setup-comet-profile.ts` (lines 14-15, 24-25)
**Issues:**
- Hardcoded extension ID
- Hardcoded user-specific paths (`C:\Users\konra\...`)

**Fix:**
- Extension ID from environment
- Auto-detect paths using `LOCALAPPDATA` + `os.homedir()`
```typescript
// Extension ID from environment
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID;
if (!EXTENSION_ID) { process.exit(1); }

// Auto-detected paths (no hardcoded username)
const localAppData = process.env.LOCALAPPDATA || join(os.homedir(), 'AppData', 'Local');
const cometExecutable = join(localAppData, 'Perplexity', 'Comet', 'Application', 'comet.exe');
const automationProfilePath = join(localAppData, 'ObsidianNewsDesk', 'comet-automation');
```

#### 9. Edge Setup Script (RESOLVED)
**File:** `scripts/setup-edge-profile.ts` (lines 13-14, 23-24)
**Issues:**
- Hardcoded extension ID
- Hardcoded user-specific paths (`C:\Users\konra\...`)

**Fix:** Same approach as Comet script (environment + auto-detection)

---

## Documentation Updates

### .env.example
Added documentation for new configurable options:

```bash
# ✅ NEW: Custom API endpoint (optional)
# WHISK_API_ENDPOINT=https://aisandbox-pa.googleapis.com/v1/whisk:generateImage
```

Existing documentation already covered:
- `AUTO_WHISK_EXTENSION_ID` (line 87)
- `NEXT_PUBLIC_APP_URL` (line 3)

---

## Testing Recommendations

### 1. Environment Variable Validation
Start the system with missing environment variables to verify error messages:

```bash
# Test missing WHISK_API_TOKEN
# Should see: "WHISK_API_TOKEN not set in environment variables"

# Test missing AUTO_WHISK_EXTENSION_ID (when using browser automation)
# Should see: "AUTO_WHISK_EXTENSION_ID not configured..."
```

### 2. Production Mode Testing
Set `NODE_ENV=production` and verify:
- Missing `NEXT_PUBLIC_APP_URL` causes 500 error (not localhost fallback)
- Config initialization fails with clear error message

```bash
# Test production config validation
NODE_ENV=production npm run build
# Should fail with descriptive error if NEXT_PUBLIC_APP_URL not set
```

### 3. Multi-User Testing
- Run setup scripts on different Windows user accounts
- Verify auto-detected paths work correctly
- Confirm no hardcoded `C:\Users\konra\...` paths remain

---

## Benefits

### Security
- ✅ No unsafe fallbacks in production
- ✅ Fail-secure error handling
- ✅ Clear error messages prevent misconfigurations

### Portability
- ✅ Works on any machine without code changes
- ✅ No hardcoded usernames or paths
- ✅ Environment-aware path detection

### Maintainability
- ✅ All configuration in `.env` file
- ✅ Single source of truth for API endpoints
- ✅ Easy to update extension ID if it changes

---

## Remaining Low Priority Items

These are **informational only** and do not require immediate action:

### Low Priority: Default Values (ACCEPTABLE)
Files with default values that are correct and don't break production:
- `src/lib/config/index.ts`: Default ports (5432, 6379, 8347) - **OK**
- `src/lib/config/index.ts`: Default concurrency values - **OK**
- `src/lib/config/index.ts`: Default FFmpeg settings - **OK**

These defaults are:
- Industry standards (e.g., Redis 6379, Postgres 5432)
- Safe fallbacks that work in development
- Non-security-critical configuration

---

## Conclusion

✅ **ALL CRITICAL AND HIGH PRIORITY HARDCODED VALUES RESOLVED**

The system now follows best practices:
1. **Configuration over convention** - All critical values in `.env`
2. **Fail-secure defaults** - Production requires explicit configuration
3. **Clear error messages** - Users know exactly what to fix
4. **Portable code** - Works on any machine with proper `.env` setup

**Next Steps:**
- ✅ Test system startup with missing environment variables
- ✅ Verify production build fails gracefully without `NEXT_PUBLIC_APP_URL`
- ✅ Run end-to-end test to confirm fixes don't break functionality
