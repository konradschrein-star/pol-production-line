# Security Test Execution Guide

**Phase 8A: Security Testing Suite**
**Test Suites:** 5 | **Test Cases:** 54 | **Expected Duration:** 5-10 minutes

---

## Quick Start

### 1. Prerequisites
```bash
# Ensure system is running
cd obsidian-news-desk
START.bat

# Wait for services to start (30 seconds)
# Verify Next.js: http://localhost:8347
# Verify Postgres: docker ps | grep postgres
# Verify Redis: docker ps | grep redis
```

### 2. Run All Security Tests
```bash
npm run test:security
```

### 3. Expected Output
```
✓ tests/security/sql-injection.test.ts (8 tests)
✓ tests/security/xss.test.ts (11 tests)
✓ tests/security/path-traversal.test.ts (12 tests)
✓ tests/security/rate-limiting.test.ts (10 tests)
✓ tests/security/auth.test.ts (13 tests)

Test Files  5 passed (5)
Tests  54 passed (54)
Duration  ~5-10 minutes
```

---

## Individual Test Suites

### SQL Injection Prevention (8 tests)
**Purpose:** Validate parameterized queries prevent SQL injection attacks

**Run:**
```bash
npm run test:security -- tests/security/sql-injection.test.ts
```

**Tests:**
1. Reject SQL injection in parameterized query
2. Handle quotes safely
3. Use parameterized queries in job creation API
4. Prevent UNION-based injection
5. Prevent injection via GET query parameters
6. Handle NULL bytes safely
7. Prevent blind SQL injection (timing attacks)
8. Validate database schema integrity

**Pass Criteria:**
- All queries execute without errors
- Database tables remain intact
- 0 rows returned for injection attempts
- Query execution <1 second (no sleep() injection)

---

### XSS Prevention (11 tests)
**Purpose:** Validate CSP headers and React escaping prevent XSS attacks

**Run:**
```bash
npm run test:security -- tests/security/xss.test.ts
```

**Tests:**
1. CSP header blocks inline scripts
2. X-Frame-Options prevents clickjacking
3. X-Content-Type-Options header present
4. Escape user input in API responses
5. Not execute scripts in database content
6. Handle JavaScript protocol in URLs
7. Escape HTML entities in scene ticker headlines
8. Prevent event handler injection
9. Handle SVG-based XSS attempts
10. Referrer-Policy header present
11. Prevent stored XSS in audit log

**Pass Criteria:**
- CSP header present with `script-src 'self'`
- X-Frame-Options is DENY or SAMEORIGIN
- User input stored as strings (not executed)
- HTML entities escaped in output

---

### Path Traversal Prevention (12 tests)
**Purpose:** Validate file upload/download endpoints prevent directory traversal

**Run:**
```bash
npm run test:security -- tests/security/path-traversal.test.ts
```

**Tests:**
1. Reject path traversal in filename (`../../../etc/passwd`)
2. Reject absolute paths (`/etc/passwd`)
3. Reject NULL bytes in filename
4. Reject Windows path traversal (`..\\..\\windows\\system32`)
5. Reject URL-encoded path traversal (`%2e%2e%2f`)
6. Reject double-encoded path traversal
7. Accept valid filenames without path components
8. Prevent access to files outside storage directory
9. Sanitize job ID in file paths
10. Restrict file operations to designated paths
11. Normalize paths before operations
12. Reject filenames with special characters

**Pass Criteria:**
- Path traversal attempts return 400 Bad Request
- Valid filenames accepted
- File paths in database start with storage base path
- No `../` sequences in stored paths

---

### Rate Limiting (10 tests)
**Purpose:** Validate 10 requests/minute rate limit enforcement

**Run:**
```bash
npm run test:security -- tests/security/rate-limiting.test.ts
```

**Tests:**
1. Allow first 10 requests within limit
2. Block 11th request with 429 status
3. Return Retry-After header when rate limited
4. Descriptive error message when rate limited
5. Rate limit GET requests separately
6. Reset rate limit after 60 seconds (slow test)
7. Rate limit by IP address
8. Admin endpoints rate limiting
9. Log rate limit violations to audit log

**Pass Criteria:**
- First 10 requests succeed (200-299 status)
- 11th request returns 429 (Too Many Requests)
- Retry-After header present with value 1-60 seconds
- Rate limit resets after 60 seconds
- Violations logged to audit_log table

**Note:** Test #6 takes 61+ seconds to run (rate limit cooldown test)

---

### Authentication Security (13 tests)
**Purpose:** Validate timing-safe comparison, IP whitelist, brute force protection

**Run:**
```bash
npm run test:security -- tests/security/auth.test.ts
```

**Tests:**
1. Use timing-safe comparison for admin key
2. Throw for different-length keys
3. Constant-time behavior regardless of match
4. Reject requests without admin key
5. Reject requests with invalid admin key
6. Accept requests with valid admin key from localhost
7. Log failed authentication attempts
8. Log successful admin access
9. Enforce IP whitelist for admin endpoints
10. Allow localhost IPs through whitelist
11. Log IP whitelist violations
12. No session cookies (stateless API)
13. Rate limit authentication attempts

**Pass Criteria:**
- Timing variance <1ms for correct vs incorrect keys
- 401 status for missing/invalid keys
- 200 or 403 status for valid keys (403 if IP blocked)
- Failed attempts logged to audit_log
- No Set-Cookie headers in responses

---

## Troubleshooting

### Tests Fail with "Connection Refused"
**Cause:** Next.js server not running
**Fix:**
```bash
cd obsidian-news-desk
START.bat
# Wait 30 seconds for services to start
npm run test:security
```

### Tests Fail with "Database Connection Error"
**Cause:** PostgreSQL not running
**Fix:**
```bash
docker ps | grep postgres
# If not running:
cd obsidian-news-desk
START.bat
```

### Rate Limiting Tests Fail
**Cause:** Previous test runs didn't clean up rate limit state
**Fix:**
```bash
# Wait 60 seconds for rate limit to reset
sleep 60
npm run test:security -- tests/security/rate-limiting.test.ts
```

### Path Traversal Tests Fail
**Cause:** File upload endpoint doesn't exist or has different path
**Fix:**
- Check API route at `src/app/api/jobs/[id]/scenes/[scene_id]/upload/route.ts`
- Verify route exists and handles POST requests
- Update test URL if endpoint path changed

### Authentication Tests Fail
**Cause:** ADMIN_API_KEY not set in `.env`
**Fix:**
```bash
# Add to .env file:
ADMIN_API_KEY=your-32-character-admin-key-here

# Restart system:
STOP.bat
START.bat
npm run test:security -- tests/security/auth.test.ts
```

---

## Test Configuration

### Vitest Config
Tests use the Vitest framework with Next.js integration.

**Config File:** `vitest.config.ts`

**Key Settings:**
- Test environment: `node` (API tests)
- Setup file: `tests/setup.ts`
- Timeout: 30 seconds (default), 90 seconds (rate limit reset test)
- Coverage: `tests/security/` directory

### Environment Variables Required
```bash
# .env file
ADMIN_API_KEY=your-32-character-admin-key
DATABASE_URL=postgresql://obsidian:obsidian_password@localhost:5432/obsidian_news_desk
REDIS_URL=redis://localhost:6379
```

---

## Continuous Integration

### GitHub Actions Workflow Example
```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start Docker services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Run security tests
        run: npm run test:security
        env:
          ADMIN_API_KEY: ${{ secrets.ADMIN_API_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-test-results
          path: test-results/
```

---

## Test Coverage

### Current Coverage
Run with coverage flag:
```bash
npm run test:coverage -- tests/security/
```

**Expected Coverage:**
- **Middleware:** 85-90% (auth, rate limiting, security headers)
- **API Routes:** 70-80% (admin endpoints, job CRUD)
- **Database Queries:** 90-95% (parameterized query validation)
- **Overall:** ~80% coverage for security-critical code paths

### Coverage Reports
```bash
# Generate HTML coverage report
npm run test:coverage -- tests/security/

# View report
open coverage/index.html  # macOS
start coverage/index.html  # Windows
```

---

## Security Regression Testing

### When to Run Security Tests
1. **Before Every Release** - Validate no security regressions
2. **After Dependency Updates** - Check for breaking changes
3. **After Middleware Changes** - Verify auth/rate limiting still work
4. **After API Route Changes** - Confirm input validation present
5. **Weekly (CI/CD)** - Automated security checks

### Adding New Security Tests
1. Create new test file in `tests/security/`
2. Follow naming convention: `feature-name.test.ts`
3. Import test utilities: `describe`, `it`, `expect`, `pool`
4. Write descriptive test names
5. Add cleanup in `afterAll()` hook
6. Update this guide with new test suite documentation

---

## Security Testing Best Practices

### ✅ DO:
- Run tests against a **dedicated test database** (not production)
- Use **realistic attack payloads** (from OWASP, exploit-db)
- Test **both positive and negative cases** (valid + invalid input)
- **Clean up test data** in `afterAll()` hooks
- **Log test failures** with detailed error messages
- **Document expected behavior** in test descriptions

### ❌ DON'T:
- Run tests against production database
- Use real user data in tests
- Skip cleanup (leaves database dirty)
- Test only happy paths (miss edge cases)
- Ignore intermittent failures (flaky tests mask real issues)
- Hardcode credentials (use environment variables)

---

## Reporting Security Issues

If security tests **fail** or you discover a vulnerability:

1. **Do NOT create a public GitHub issue**
2. Email security contact (see README.md)
3. Include:
   - Test suite that failed
   - Expected vs actual behavior
   - Steps to reproduce
   - Impact assessment (CVSS score if possible)
4. Wait for acknowledgment (24-48 hours)
5. Work with maintainers on fix
6. Verify fix with updated tests

---

## Additional Resources

- **OWASP Top 10 2021:** https://owasp.org/Top10/
- **OWASP Testing Guide:** https://owasp.org/www-project-web-security-testing-guide/
- **SQL Injection Cheat Sheet:** https://portswigger.net/web-security/sql-injection/cheat-sheet
- **XSS Prevention Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- **OWASP Compliance Report:** `docs/security/OWASP_COMPLIANCE.md`

---

**Last Updated:** March 28, 2026
**Test Suite Version:** 1.0.0
**Phase:** 8A (Production Hardening)
