# HARDCODED VALUES AUDIT REPORT
**Date:** March 29, 2026
**Scope:** Full codebase scan for hardcoded values

---

## 🔴 CRITICAL ISSUES

### 1. Hardcoded Extension ID (Multiple Locations)

**Impact:** HIGH - System expects specific extension, fails if different version installed

#### Source Code Files (CRITICAL):

**`src/lib/browser/auto-whisk.ts:12`**
```typescript
const extensionId = process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe';
```
❌ **Problem:** Falls back to hardcoded ID if env var not set

**`src/app/api/settings/route.ts:43`**
```typescript
AUTO_WHISK_EXTENSION_ID: process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe',
```
❌ **Problem:** API returns hardcoded default

**`src/app/api/settings/route.ts:79`**
```typescript
AUTO_WHISK_EXTENSION_ID: settings.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe',
```
❌ **Problem:** Settings fallback to hardcoded ID

**`src/app/(dashboard)/settings/page.tsx:163`**
```typescript
setAutoWhiskExtId(data.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe');
```
❌ **Problem:** UI fallback to hardcoded ID

**`src/lib/whisk/extension-integration.ts:23`**
```typescript
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe';
```
❌ **Problem:** DIFFERENT fallback ID! (`gcgblhgncmhjchllkcpcneeibddhmbbe` ≠ `gcgblhgncmhjchllkcpcneeibddhmbbe`)

**This is a MAJOR BUG!** Two different extension IDs are used as fallbacks in different parts of the codebase.

---

### 2. Hardcoded API Endpoints

#### `src/lib/whisk/api.ts:38`
```typescript
private apiUrl: string = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
```
❌ **Problem:** API endpoint is hardcoded, not configurable
✅ **Fix:** Should use `process.env.WHISK_API_ENDPOINT` with this as fallback

#### `src/lib/whisk/token-refresher.ts:12`
```typescript
const WHISK_URL = 'https://labs.google.com/whisk';
```
❌ **Problem:** Service URL is hardcoded
✅ **Fix:** Should use `process.env.WHISK_WEB_URL` with this as fallback

#### `src/lib/config/index.ts:201`
```typescript
endpoint: 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage',
```
❌ **Problem:** Duplicate hardcoded endpoint

---

### 3. Hardcoded Localhost URLs

#### `src/middleware.ts:285`
```typescript
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
```
⚠️ **Problem:** Falls back to localhost (breaks in production if env not set)

#### `src/lib/config/index.ts:146`
```typescript
baseUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:8347'),
```
⚠️ **Problem:** Same fallback

#### `src/lib/whisk/extension-integration.ts:24`
```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';
```
⚠️ **Problem:** Extension calls will fail in production

---

## 🟡 MODERATE ISSUES

### 4. Extension Setup Scripts (Inconsistent IDs)

**`scripts/setup-comet-profile.ts:14-15`**
```typescript
const AUTO_WHISK_URL = 'https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/gcgblhgncmhjchllkcpcneeibddhmbbe';
const EXTENSION_ID = 'gcgblhgncmhjchllkcpcneeibddhmbbe';
```

**`scripts/setup-edge-profile.ts:13-14`**
```typescript
const AUTO_WHISK_URL = 'https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/gcgblhgncmhjchllkcpcneeibddhmbbe';
const EXTENSION_ID = 'gcgblhgncmhjchllkcpcneeibddhmbbe';
```

**`scripts/setup-chrome-profile.ts:77`**
```typescript
'https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/gcgblhgncmhjchllkcpcneeibddhmbbe'
```

⚠️ **Problem:** Extension URL is hardcoded in setup scripts
✅ **Fix:** Should read from `.env` or accept as CLI argument

---

### 5. Security Headers with Hardcoded Domains

**`src/lib/security/headers.ts:25`**
```typescript
"img-src 'self' data: blob: https://aisandbox-pa.googleapis.com", // Whisk images
```

⚠️ **Problem:** CSP policy hardcodes Whisk domain
✅ **Fix:** Should be configurable if API endpoint changes

---

### 6. UI Components with Hardcoded URLs

**`src/app/(dashboard)/jobs/[id]/page.tsx:419`**
```typescript
href="https://labs.google.com/wisk"
```
❌ **Problem:** Typo! Should be `/whisk` not `/wisk`

**`src/app/(dashboard)/settings/page.tsx:802`**
```typescript
<a href="https://labs.google.com/whisk" target="_blank">
```

**`src/components/system/WhiskTokenRefreshWizard.tsx:142-147`**
```typescript
href="https://labs.google.com/whisk"
```

⚠️ **Problem:** Help links are hardcoded (ok for now, but should be configurable)

---

## 🟢 LOW PRIORITY ISSUES

### 7. Placeholder Text with Hardcoded Extension ID

**`src/app/(dashboard)/settings/page.tsx:663`**
```typescript
placeholder="gcgblhgncmhjchllkcpcneeibddhmbbe"
```

⚠️ **Problem:** Placeholder shows specific extension ID
✅ **Fix:** Should use dynamic placeholder or generic text like "Extension ID (32 characters)"

---

## 📊 SUMMARY OF FINDINGS

| Issue | Severity | Count | Impact |
|-------|----------|-------|--------|
| **Conflicting Extension IDs** | 🔴 CRITICAL | 2 | System uses wrong extension |
| **Hardcoded Extension ID Fallbacks** | 🔴 CRITICAL | 5 | Breaks if extension changes |
| **Hardcoded API Endpoints** | 🔴 CRITICAL | 3 | Not configurable for prod |
| **Hardcoded Localhost URLs** | 🟡 MODERATE | 3 | Breaks in production |
| **Setup Script Hardcoding** | 🟡 MODERATE | 3 | Manual updates needed |
| **Hardcoded Help URLs** | 🟢 LOW | 4 | Acceptable for now |
| **Typo in URL** | 🔴 CRITICAL | 1 | Broken link |

**Total Issues:** 21 hardcoded values found

---

## 🔧 RECOMMENDED FIXES

### Priority 1: BLOCKING (Fix Immediately)

#### 1.1 Fix Extension ID Conflict

**File:** `src/lib/whisk/extension-integration.ts:23`

**BEFORE:**
```typescript
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe';
```

**AFTER:**
```typescript
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe';
```

❌ **OR BETTER:** Remove all fallbacks and throw error if not set:
```typescript
const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID;
if (!EXTENSION_ID) {
  throw new Error('AUTO_WHISK_EXTENSION_ID not set in environment');
}
```

#### 1.2 Fix Typo in URL

**File:** `src/app/(dashboard)/jobs/[id]/page.tsx:419`

**BEFORE:**
```typescript
href="https://labs.google.com/wisk"
```

**AFTER:**
```typescript
href="https://labs.google.com/whisk"
```

#### 1.3 Remove Hardcoded Fallbacks

**Files to update:**
- `src/lib/browser/auto-whisk.ts:12`
- `src/app/api/settings/route.ts:43`
- `src/app/api/settings/route.ts:79`
- `src/app/(dashboard)/settings/page.tsx:163`

**Change pattern:**
```typescript
// BEFORE (unsafe)
const extensionId = process.env.AUTO_WHISK_EXTENSION_ID || 'gcgblhgncmhjchllkcpcneeibddhmbbe';

// AFTER (safe)
const extensionId = process.env.AUTO_WHISK_EXTENSION_ID;
if (!extensionId) {
  throw new Error(
    'AUTO_WHISK_EXTENSION_ID not configured. ' +
    'Set AUTO_WHISK_EXTENSION_ID in .env file.'
  );
}
```

---

### Priority 2: HIGH (Fix Before Production)

#### 2.1 Make API Endpoints Configurable

**File:** `src/lib/whisk/api.ts:38`

**BEFORE:**
```typescript
private apiUrl: string = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
```

**AFTER:**
```typescript
private apiUrl: string = process.env.WHISK_API_ENDPOINT || 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
```

**Add to `.env.example`:**
```bash
# Optional: Override Whisk API endpoint (default: https://aisandbox-pa.googleapis.com/v1/whisk:generateImage)
# WHISK_API_ENDPOINT=https://custom-endpoint.com/v1/whisk:generateImage
```

#### 2.2 Fix Localhost Fallbacks

**Files to update:**
- `src/middleware.ts:285`
- `src/lib/config/index.ts:146`
- `src/lib/whisk/extension-integration.ts:24`

**Change pattern:**
```typescript
// BEFORE (unsafe for production)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8347';

// AFTER (safe)
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  throw new Error(
    'NEXT_PUBLIC_APP_URL not configured. ' +
    'Set NEXT_PUBLIC_APP_URL in .env file (e.g., https://your-domain.com)'
  );
}
```

---

### Priority 3: MEDIUM (Technical Debt)

#### 3.1 Make Setup Scripts Configurable

**Update all setup scripts to read from .env:**
```typescript
// Add to scripts/setup-*.ts
import { config } from 'dotenv';
config();

const EXTENSION_ID = process.env.AUTO_WHISK_EXTENSION_ID;
if (!EXTENSION_ID) {
  throw new Error('AUTO_WHISK_EXTENSION_ID not set in .env');
}

const AUTO_WHISK_URL = `https://chromewebstore.google.com/detail/auto-whisk-nano-banana-im/${EXTENSION_ID}`;
```

---

## 🧪 TESTING CHECKLIST

After fixing hardcoded values, verify:

- [ ] Extension ID is read from `.env` (no fallback used)
- [ ] App throws error if `AUTO_WHISK_EXTENSION_ID` not set
- [ ] App throws error if `NEXT_PUBLIC_APP_URL` not set (production)
- [ ] API endpoints are configurable via env vars
- [ ] Setup scripts read extension ID from `.env`
- [ ] All help links point to correct URL (whisk, not wisk)
- [ ] Extension integration uses consistent ID across all modules

---

## 🎯 ROOT CAUSE ANALYSIS

### Why This Happened:

1. **Development convenience:** Hardcoded defaults made development easier
2. **Incremental changes:** Different developers added different fallbacks over time
3. **No validation:** No startup checks for required env vars
4. **Documentation drift:** `.env.example` exists but not enforced

### How to Prevent:

1. **Add startup validation:**
   ```typescript
   // In src/lib/config/validate.ts
   export function validateRequiredEnvVars() {
     const required = [
       'AUTO_WHISK_EXTENSION_ID',
       'WHISK_API_TOKEN',
       'NEXT_PUBLIC_APP_URL',
     ];

     const missing = required.filter(key => !process.env[key]);
     if (missing.length > 0) {
       throw new Error(
         `Missing required environment variables: ${missing.join(', ')}\n` +
         `Copy .env.example to .env and fill in all required values.`
       );
     }
   }
   ```

2. **Call validation on startup:**
   ```typescript
   // In src/app/layout.tsx or middleware.ts
   import { validateRequiredEnvVars } from '@/lib/config/validate';
   validateRequiredEnvVars();
   ```

3. **Update CI/CD:** Add env var validation to deployment pipeline

---

## 📋 FILES REQUIRING IMMEDIATE ATTENTION

### Critical (Must Fix):
1. `src/lib/whisk/extension-integration.ts:23` - Wrong extension ID
2. `src/app/(dashboard)/jobs/[id]/page.tsx:419` - Typo (wisk → whisk)
3. `src/lib/browser/auto-whisk.ts:12` - Remove fallback
4. `src/app/api/settings/route.ts:43,79` - Remove fallbacks
5. `src/app/(dashboard)/settings/page.tsx:163` - Remove fallback

### High Priority (Before Production):
6. `src/lib/whisk/api.ts:38` - Make endpoint configurable
7. `src/middleware.ts:285` - Remove localhost fallback
8. `src/lib/config/index.ts:146` - Remove localhost fallback
9. `src/lib/whisk/extension-integration.ts:24` - Remove localhost fallback

### Medium Priority (Technical Debt):
10. `scripts/setup-comet-profile.ts` - Read from env
11. `scripts/setup-edge-profile.ts` - Read from env
12. `scripts/setup-chrome-profile.ts` - Read from env

---

## 🚨 IMMEDIATE ACTION REQUIRED

**The extension ID conflict (`gcgblhgncmhjchllkcpcneeibddhmbbe` vs `gcgblhgncmhjchllkcpcneeibddhmbbe`) is likely causing your issues!**

Different parts of your codebase are looking for DIFFERENT extensions. This would cause:
- Extension not found errors
- Token refresh failures
- Communication failures between backend and extension

**Fix this FIRST before testing anything else.**
