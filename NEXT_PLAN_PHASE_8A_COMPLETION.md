# Phase 8A Completion Plan: Production Hardening (Remaining Tasks)

**Plan Created:** March 28, 2026
**Estimated Duration:** 2-3 days (25-35 hours)
**Can Start:** Immediately (not blocked by Phase 6)
**Agent Assignment:** For another agent to implement

---

## 📋 Context

**What's Complete:**
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ Audit logging infrastructure (40+ event types)
- ✅ Admin endpoint protection (IP whitelist, timing-safe auth)
- ✅ Zod validation for bulk operations

**What's Remaining:** 8 tasks across 3 categories:
1. **Security Testing** (2 tasks)
2. **Performance Testing** (4 tasks)
3. **Monitoring & Observability** (4 tasks, ✅ 2 complete)

**Why This Plan:**
- Can work in parallel with Phase 6 (installer build)
- Makes app production-ready before distribution
- Provides monitoring/dashboards for operational visibility
- Completes security validation before public release

---

## 🎯 Goals

### Primary Goals:
1. **Security Validation** - Verify app resistant to common attacks (OWASP Top 10)
2. **Performance Baseline** - Document current performance metrics
3. **Operational Visibility** - Add dashboards and monitoring before distribution

### Success Criteria:
- ✅ All security tests pass (SQL injection, XSS, path traversal)
- ✅ Load test handles 10 concurrent jobs without failure
- ✅ No memory leaks detected over 100-job cycle
- ✅ Performance dashboard displays real-time metrics
- ✅ Alert system operational (console-only for now)
- ✅ Production readiness checklist 100% complete

---

## 📦 Implementation Tasks

### **Section 1: Security Testing (8-10 hours)**

#### Task 1.5: Security Testing Suite
**Priority:** HIGH
**Time:** 5-7 hours
**Blocker:** None

**Files to Create:**
```
tests/security/
├── sql-injection.test.ts         # Test parameterized queries
├── xss.test.ts                   # Test CSP headers + React escaping
├── path-traversal.test.ts        # Test file upload path validation
├── rate-limiting.test.ts         # Test 10/min limit enforcement
└── auth.test.ts                  # Test admin key timing-safe comparison
```

**Implementation Guide:**

**1. SQL Injection Tests** (`sql-injection.test.ts`)
```typescript
import { describe, it, expect } from 'vitest';
import { pool } from '@/lib/db';

describe('SQL Injection Prevention', () => {
  it('should reject SQL injection in job title', async () => {
    const maliciousTitle = "'; DROP TABLE news_jobs; --";

    const result = await pool.query(
      'SELECT * FROM news_jobs WHERE title = $1',
      [maliciousTitle]
    );

    // Should return 0 rows, not drop table
    expect(result.rows).toHaveLength(0);

    // Verify table still exists
    const tableCheck = await pool.query(
      "SELECT to_regclass('news_jobs')"
    );
    expect(tableCheck.rows[0].to_regclass).toBe('news_jobs');
  });

  it('should use parameterized queries in all endpoints', async () => {
    // Test GET /api/jobs with malicious query param
    const response = await fetch(
      `http://localhost:8347/api/jobs?title='; DROP TABLE news_jobs; --`
    );

    expect(response.ok).toBe(true);

    // Verify table still exists
    const tableCheck = await pool.query(
      "SELECT to_regclass('news_jobs')"
    );
    expect(tableCheck.rows[0].to_regclass).toBe('news_jobs');
  });
});
```

**2. XSS Tests** (`xss.test.ts`)
```typescript
describe('XSS Prevention', () => {
  it('should have CSP header that blocks inline scripts', async () => {
    const response = await fetch('http://localhost:8347');
    const csp = response.headers.get('content-security-policy');

    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
  });

  it('should escape user input in React components', async () => {
    const xssPayload = '<script>alert("XSS")</script>';

    // Create job with XSS payload in title
    const createRes = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_script: 'Test script',
        title: xssPayload,
      }),
    });

    const job = await createRes.json();

    // Fetch job page HTML
    const pageRes = await fetch(`http://localhost:8347/jobs/${job.id}`);
    const html = await pageRes.text();

    // Should be HTML-escaped
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
```

**3. Path Traversal Tests** (`path-traversal.test.ts`)
```typescript
describe('Path Traversal Prevention', () => {
  it('should reject file uploads with path traversal', async () => {
    const formData = new FormData();
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    formData.append('file', blob, '../../../etc/passwd');

    const response = await fetch(
      'http://localhost:8347/api/jobs/123/scenes/456/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('Invalid filename');
  });

  it('should block symlink uploads', async () => {
    // Test implementation depends on upload handler
    // Should check file.isSymbolicLink() or similar
  });
});
```

**4. Rate Limiting Tests** (`rate-limiting.test.ts`)
```typescript
describe('Rate Limiting', () => {
  it('should limit requests to 10/min per IP', async () => {
    const requests = [];

    // Send 11 requests rapidly
    for (let i = 0; i < 11; i++) {
      requests.push(
        fetch('http://localhost:8347/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_script: 'test' }),
        })
      );
    }

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);

    // First 10 should succeed, 11th should be rate limited
    expect(statuses.slice(0, 10).every(s => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
```

**5. Auth Tests** (`auth.test.ts`)
```typescript
import { timingSafeEqual } from 'crypto';

describe('Authentication Security', () => {
  it('should use timing-safe comparison for admin key', () => {
    const correctKey = 'test-admin-key-12345678901234567890';
    const wrongKey = 'wrong-key-1234567890123456789012';

    // Simulate timing attack
    const iterations = 10000;
    const correctTimings: number[] = [];
    const wrongTimings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      timingSafeEqual(
        Buffer.from(correctKey),
        Buffer.from(correctKey)
      );
      correctTimings.push(performance.now() - start);
    }

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        timingSafeEqual(
          Buffer.from(correctKey),
          Buffer.from(wrongKey)
        );
      } catch {}
      wrongTimings.push(performance.now() - start);
    }

    // Timing should be constant regardless of match
    const correctAvg = correctTimings.reduce((a, b) => a + b) / iterations;
    const wrongAvg = wrongTimings.reduce((a, b) => a + b) / iterations;
    const diff = Math.abs(correctAvg - wrongAvg);

    // Difference should be < 1ms (timing-safe)
    expect(diff).toBeLessThan(1);
  });
});
```

**Verification:**
```bash
npm run test:security
# All tests should pass
```

---

#### Task 1.6: OWASP Top 10 Compliance Documentation
**Priority:** MEDIUM
**Time:** 3-4 hours
**Blocker:** None

**File to Create:** `docs/security/OWASP_COMPLIANCE.md`

**Content Template:**
```markdown
# OWASP Top 10 2021 Compliance

## A01:2021 – Broken Access Control

**Risk:** Unauthorized users access admin endpoints or other users' data

**Controls Implemented:**
- ✅ IP whitelist for `/api/settings` (localhost only)
- ✅ Admin API key required (32+ character random string)
- ✅ Timing-safe key comparison (prevents timing attacks)
- ✅ Audit logging for all admin access attempts

**Verification:**
- Security tests pass (`auth.test.ts`)
- Manual testing: `curl` with wrong key → 403 Forbidden
- Manual testing: `curl` from remote IP → 403 Forbidden

**Limitations:**
- No user authentication system (single-user app)
- IP whitelist only covers localhost (production needs update)

**Recommendations for Production:**
- Add JWT-based authentication for multi-user deployments
- Implement role-based access control (RBAC)
- Add CAPTCHA to prevent brute force attacks

---

## A02:2021 – Cryptographic Failures

**Risk:** Sensitive data exposure (API keys, credentials)

**Controls Implemented:**
- ✅ API keys stored in `.env` file (not committed to git)
- ✅ `.gitignore` prevents accidental commit
- ✅ HSTS header enforces HTTPS (when enabled)
- ✅ Timing-safe comparison for secrets

**Verification:**
- `.env` not in git history
- Security tests verify timing-safe comparison
- HSTS header present when HTTPS enabled

**Limitations:**
- No encryption at rest (database, file storage)
- API keys stored in plain text `.env`

**Recommendations for Production:**
- Use OS keyring for API key storage (Keytar, Windows Credential Manager)
- Enable database encryption (PostgreSQL pgcrypto)
- Use HTTPS for all external API calls

---

## A03:2021 – Injection

**Risk:** SQL injection, command injection, LDAP injection

**Controls Implemented:**
- ✅ Parameterized queries (`pg` library with `$1, $2` syntax)
- ✅ Zod validation for all API inputs
- ✅ No dynamic SQL construction (banned via linting)
- ✅ No `eval()` or `exec()` usage

**Verification:**
- Security tests pass (`sql-injection.test.ts`)
- All queries use parameterized syntax
- Static analysis (ESLint) prohibits dynamic SQL

**Limitations:**
- None identified

**Recommendations for Production:**
- Periodic security audits (manual code review)
- Automated static analysis in CI/CD

---

## A04:2021 – Insecure Design

**Risk:** Architectural flaws enabling attacks

**Controls Implemented:**
- ✅ Principle of least privilege (workers run as non-admin)
- ✅ Fail-safe defaults (strict CSP, no inline scripts)
- ✅ Defense in depth (CSP + React escaping + Zod validation)
- ✅ Rate limiting (10 requests/min)

**Verification:**
- Architecture review (CLAUDE.md)
- Security tests validate defense layers

**Limitations:**
- No threat modeling performed
- No security design review

**Recommendations for Production:**
- Conduct threat modeling (STRIDE methodology)
- External security design review before public release

---

## A05:2021 – Security Misconfiguration

**Risk:** Default credentials, unnecessary features, verbose errors

**Controls Implemented:**
- ✅ No default credentials (user must set API keys)
- ✅ Security headers enforced globally
- ✅ Error messages sanitized (no stack traces in production)
- ✅ Development tools disabled in production

**Verification:**
- No default `.env` committed
- Security headers present on all responses
- Production error messages generic

**Limitations:**
- Docker credentials hardcoded (obsidian/obsidian_password)

**Recommendations for Production:**
- Rotate Docker credentials for production deployments
- Implement secret rotation policy
- Add automated security configuration scanner

---

## A06:2021 – Vulnerable and Outdated Components

**Risk:** Using libraries with known vulnerabilities

**Controls Implemented:**
- ✅ `npm audit` run regularly
- ✅ Dependabot enabled (GitHub)
- ✅ Major version pinning (prevent breaking changes)

**Verification:**
- `npm audit` shows no critical vulnerabilities
- Dependabot PRs reviewed weekly

**Limitations:**
- No automated dependency updates
- No vulnerability scanning in CI/CD

**Recommendations for Production:**
- Add `npm audit` to pre-commit hook
- Implement automated security scanning (Snyk, Dependabot)
- Update dependencies monthly

---

## A07:2021 – Identification and Authentication Failures

**Risk:** Weak passwords, broken session management

**Controls Implemented:**
- ✅ Timing-safe admin key comparison
- ✅ No session management (stateless API)
- ✅ Audit logging for authentication attempts

**Verification:**
- Security tests verify timing-safe comparison
- No session cookies used

**Limitations:**
- No multi-factor authentication (MFA)
- No password complexity requirements (API keys user-defined)

**Recommendations for Production:**
- Implement MFA for admin access (TOTP)
- Enforce API key complexity (32+ chars, mixed case, symbols)
- Add login attempt monitoring (brute force detection)

---

## A08:2021 – Software and Data Integrity Failures

**Risk:** Unsigned code, insecure CI/CD, supply chain attacks

**Controls Implemented:**
- ✅ Installer code signing (optional, Phase 10)
- ✅ Git commit signatures (developer workflow)
- ✅ Lockfile integrity (`package-lock.json`)

**Verification:**
- Installer signature (when code signing enabled)
- `npm ci` enforces lockfile integrity

**Limitations:**
- Installer not code-signed yet (Phase 10 task)
- No CI/CD pipeline security hardening

**Recommendations for Production:**
- Obtain code signing certificate (Windows, $200-500/year)
- Implement signed commits policy (GPG keys)
- Add SBOM (Software Bill of Materials)

---

## A09:2021 – Security Logging and Monitoring Failures

**Risk:** Attacks go undetected due to lack of logging

**Controls Implemented:**
- ✅ Comprehensive audit logging (40+ event types)
- ✅ Severity levels (info, warning, critical)
- ✅ Actor tracking (IP, user agent)
- ✅ Alert definitions (14 rules)

**Verification:**
- Audit log populated after operations
- Alerts trigger on console for critical events
- `/api/audit` endpoint returns events

**Limitations:**
- Alerts console-only (no email/Slack)
- No automated threat detection
- No log retention policy

**Recommendations for Production:**
- Add email/Slack alerting (Nodemailer, webhooks)
- Implement automated threat detection (rate anomalies)
- Define log retention policy (30-90 days)

---

## A10:2021 – Server-Side Request Forgery (SSRF)

**Risk:** Attacker manipulates server to make requests to internal services

**Controls Implemented:**
- ✅ No user-provided URLs in API calls
- ✅ Whisk/OpenAI URLs hardcoded
- ✅ No file fetching from user-provided URLs

**Verification:**
- Code review shows no dynamic URL construction
- All external API URLs hardcoded in codebase

**Limitations:**
- None identified

**Recommendations for Production:**
- Maintain whitelist of allowed external domains
- Implement network segmentation (Docker network isolation)

---

## Summary

| OWASP Risk | Controls | Verification | Status |
|------------|----------|--------------|--------|
| A01 Broken Access Control | IP whitelist, admin key, timing-safe | Tests pass | ✅ PASS |
| A02 Cryptographic Failures | .env, HSTS, timing-safe | Manual review | ⚠️ PARTIAL |
| A03 Injection | Parameterized queries, Zod | Tests pass | ✅ PASS |
| A04 Insecure Design | Defense in depth, least privilege | Architecture review | ✅ PASS |
| A05 Security Misconfiguration | No defaults, headers enforced | Manual review | ⚠️ PARTIAL |
| A06 Vulnerable Components | npm audit, Dependabot | npm audit clean | ✅ PASS |
| A07 Authentication Failures | Timing-safe, audit logging | Tests pass | ✅ PASS |
| A08 Data Integrity | Lockfile, signatures | Manual review | ⚠️ PARTIAL |
| A09 Logging Failures | Audit log, alerts | Logs populated | ✅ PASS |
| A10 SSRF | No dynamic URLs | Code review | ✅ PASS |

**Overall:** 7/10 PASS, 3/10 PARTIAL

**Conclusion:** Application is production-ready for localhost single-user deployment. Partial risks require hardening for multi-user or internet-facing deployments.
```

**Verification:**
- Manual review of document
- Confirm all 10 risks covered
- Update summary table with current status

---

### **Section 2: Performance Testing (12-15 hours)**

#### Task 2.1: Load Testing Infrastructure
**Priority:** HIGH
**Time:** 5-6 hours
**Blocker:** None

**Files to Create:**
```
tests/performance/
├── load-test.ts                  # Main load test orchestration
├── fixtures/scripts.ts           # Test script samples
├── metrics-collector.ts          # Performance metric collection
└── docs/performance/LOAD_TEST_RESULTS.md  # Results documentation
```

**Implementation:**

**1. Load Test** (`load-test.ts`)
```typescript
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';

describe('Load Testing', () => {
  it('should handle 10 concurrent jobs', async () => {
    const startTime = Date.now();
    const jobIds: string[] = [];

    // Create 10 jobs concurrently
    const createPromises = Array.from({ length: 10 }, (_, i) =>
      fetch('http://localhost:8347/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_script: `Test script ${i + 1}: Breaking news story...`,
          title: `Load Test Job ${i + 1}`,
        }),
      }).then(r => r.json())
    );

    const jobs = await Promise.all(createPromises);
    jobIds.push(...jobs.map((j: any) => j.id));

    const createTime = Date.now() - startTime;
    console.log(`✓ Created 10 jobs in ${createTime}ms`);

    // Wait for all jobs to reach review_assets state
    const maxWait = 30 * 60 * 1000; // 30 minutes
    const pollInterval = 10000; // 10 seconds
    let elapsed = 0;

    while (elapsed < maxWait) {
      const statusQuery = await db.query(
        `SELECT COUNT(*) as count FROM news_jobs
         WHERE id = ANY($1) AND status = 'review_assets'`,
        [jobIds]
      );

      const completedCount = parseInt(statusQuery.rows[0].count);

      if (completedCount === 10) {
        console.log(`✓ All 10 jobs reached review_assets in ${elapsed}ms`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;
    }

    expect(elapsed).toBeLessThan(maxWait);

    // Check database pool status
    const poolQuery = await db.query('SELECT count(*) FROM pg_stat_activity');
    console.log(`✓ Database connections: ${poolQuery.rows[0].count}`);

    // Verify no failed jobs
    const failedQuery = await db.query(
      `SELECT COUNT(*) as count FROM news_jobs
       WHERE id = ANY($1) AND status = 'failed'`,
      [jobIds]
    );
    expect(parseInt(failedQuery.rows[0].count)).toBe(0);

    // Cleanup
    await db.query('DELETE FROM news_jobs WHERE id = ANY($1)', [jobIds]);
  }, 40 * 60 * 1000); // 40 minute timeout
});
```

**2. Metrics Collector** (`metrics-collector.ts`)
```typescript
export interface PerformanceMetrics {
  jobCreateTime: number;
  analysisTime: number;
  imageGenerationTime: number;
  renderTime: number;
  totalTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

export async function collectMetrics(jobId: string): Promise<PerformanceMetrics> {
  const job = await db.query(
    'SELECT * FROM news_jobs WHERE id = $1',
    [jobId]
  );

  const jobData = job.rows[0];

  return {
    jobCreateTime: 0, // Calculated from timestamps
    analysisTime: jobData.analysis_duration || 0,
    imageGenerationTime: jobData.image_gen_duration || 0,
    renderTime: jobData.render_duration || 0,
    totalTime: new Date(jobData.completed_at).getTime() -
               new Date(jobData.created_at).getTime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  };
}
```

**Verification:**
```bash
npm run test:performance -- tests/performance/load-test.ts
# Should complete in <30 minutes with 10/10 jobs successful
```

---

#### Task 2.2: Memory Leak Detection
**Priority:** MEDIUM
**Time:** 3-4 hours
**Blocker:** None

**Files to Create:**
```
tests/performance/memory-leak.test.ts
scripts/monitor-memory.sh
```

**Implementation:**

```typescript
describe('Memory Leak Detection', () => {
  it('should not leak memory over 100 job cycles', async () => {
    const iterations = 100;
    const memoryReadings: number[] = [];

    // Record baseline
    global.gc?.(); // Requires node --expose-gc
    await new Promise(resolve => setTimeout(resolve, 1000));
    const baselineMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      // Create small test job (fast rendering)
      const response = await fetch('http://localhost:8347/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_script: 'Breaking news. Quick test.',
          title: `Memory Test ${i}`,
        }),
      });

      const job = await response.json();

      // Wait for completion (mock workers for speed)
      await waitForJobComplete(job.id);

      // Delete job
      await fetch(`http://localhost:8347/api/jobs/${job.id}`, {
        method: 'DELETE',
      });

      // Force GC and measure
      if (i % 10 === 0) {
        global.gc?.();
        await new Promise(resolve => setTimeout(resolve, 100));
        const currentMemory = process.memoryUsage().heapUsed;
        memoryReadings.push(currentMemory);
        console.log(`Iteration ${i}: ${(currentMemory / 1024 / 1024).toFixed(2)} MB`);
      }
    }

    // Calculate memory growth
    const finalMemory = memoryReadings[memoryReadings.length - 1];
    const growthPercent = ((finalMemory - baselineMemory) / baselineMemory) * 100;

    console.log(`Baseline: ${(baselineMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Growth: ${growthPercent.toFixed(2)}%`);

    // Should be <10% growth
    expect(growthPercent).toBeLessThan(10);
  }, 60 * 60 * 1000); // 1 hour timeout
});
```

**Verification:**
```bash
node --expose-gc npm run test:performance -- tests/performance/memory-leak.test.ts
# Should show <10% memory growth
```

---

#### Task 2.3: Database Query Profiling
**Priority:** MEDIUM
**Time:** 2-3 hours
**Blocker:** None

**Files to Create:**
```
tests/performance/query-benchmark.sql
docs/performance/QUERY_OPTIMIZATION.md
```

**Implementation:**

```sql
-- query-benchmark.sql
-- Enable query timing
\timing on

-- Enable statement profiling (if pg_stat_statements installed)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Benchmark: Fetch job with scenes
EXPLAIN ANALYZE
SELECT j.*,
       json_agg(s ORDER BY s.scene_order) as scenes
FROM news_jobs j
LEFT JOIN news_scenes s ON s.job_id = j.id
WHERE j.id = 'sample-uuid'
GROUP BY j.id;

-- Benchmark: List jobs with pagination
EXPLAIN ANALYZE
SELECT * FROM news_jobs
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

-- Benchmark: Filter jobs by status
EXPLAIN ANALYZE
SELECT * FROM news_jobs
WHERE status = 'review_assets'
ORDER BY created_at DESC
LIMIT 50;

-- Benchmark: Scene updates
EXPLAIN ANALYZE
UPDATE news_scenes
SET ticker_headline = 'Updated headline'
WHERE id = 'sample-uuid';

-- Check slow queries (requires pg_stat_statements)
-- SELECT query, mean_exec_time, calls
-- FROM pg_stat_statements
-- WHERE mean_exec_time > 100 -- Over 100ms
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Verification:**
```bash
psql obsidian_news_desk -f tests/performance/query-benchmark.sql
# All queries should be <100ms
```

---

#### Task 2.4: Render Performance Benchmarking
**Priority:** LOW
**Time:** 3-4 hours
**Blocker:** None

**File to Create:** `tests/performance/render-benchmark.ts`

**Implementation:**
```typescript
describe('Render Performance', () => {
  it('should render 30s video in <90s', async () => {
    const script = 'Breaking news story with 4 short scenes.';

    const startTime = Date.now();

    // Create job with short script
    const jobRes = await fetch('http://localhost:8347/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_script: script, title: 'Render Benchmark 30s' }),
    });
    const job = await jobRes.json();

    // Mock: Fast-forward to review_assets
    await mockReviewAssets(job.id);

    // Upload avatar and start render
    const renderStartTime = Date.now();
    await uploadAvatar(job.id);

    // Wait for render complete
    await waitForStatus(job.id, 'completed');

    const renderTime = Date.now() - renderStartTime;
    const totalTime = Date.now() - startTime;

    console.log(`Render time: ${renderTime}ms`);
    console.log(`Total time: ${totalTime}ms`);

    // 30s video should render in <90s (3x realtime)
    expect(renderTime).toBeLessThan(90 * 1000);
  }, 5 * 60 * 1000);

  it('should render 60s video in <150s', async () => {
    // Similar test for 60s video
    // Target: 2.5x realtime
  }, 10 * 60 * 1000);
});
```

**Verification:**
```bash
npm run test:performance -- tests/performance/render-benchmark.ts
# Should meet timing targets
```

---

### **Section 3: Monitoring & Observability (Continuation)**

**Note:** Tasks 3.1-3.2 (dashboards) are ALREADY COMPLETE based on earlier work. Only 3.3-3.4 remain.

#### Task 3.3: Alert Service Implementation
**Priority:** MEDIUM
**Time:** 3-4 hours
**Blocker:** None

**Files to Create:**
```
src/lib/monitoring/alert-definitions.ts    # Alert rule configuration
src/lib/monitoring/alert-service.ts        # Alert dispatch system
docs/monitoring/ALERTING_STRATEGY.md       # Alert design doc
```

**Implementation:**

**1. Alert Definitions** (`alert-definitions.ts`)
```typescript
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  cooldown: number; // Seconds before re-alerting
  condition: (metrics: any) => boolean;
  message: (metrics: any) => string;
}

export const alertRules: AlertRule[] = [
  {
    id: 'worker_crash',
    name: 'Worker Crash Detected',
    description: 'BullMQ worker crashed unexpectedly',
    severity: 'critical',
    cooldown: 300, // 5 minutes
    condition: (event) =>
      event.type === 'worker_failed' && event.error.includes('crash'),
    message: (event) =>
      `Worker ${event.workerName} crashed: ${event.error}`,
  },
  {
    id: 'queue_depth_high',
    name: 'High Queue Depth',
    description: 'Queue has >10 pending jobs',
    severity: 'warning',
    cooldown: 600, // 10 minutes
    condition: (metrics) => metrics.queueDepth > 10,
    message: (metrics) =>
      `Queue depth: ${metrics.queueDepth} jobs pending`,
  },
  {
    id: 'db_pool_exhausted',
    name: 'Database Pool Exhausted',
    description: 'Connection pool has waiting connections',
    severity: 'critical',
    cooldown: 300,
    condition: (metrics) => metrics.connectionPool.waiting > 0,
    message: (metrics) =>
      `${metrics.connectionPool.waiting} connections waiting`,
  },
  {
    id: 'auth_failures',
    name: 'Multiple Authentication Failures',
    description: '>5 auth failures in 1 minute from same IP',
    severity: 'warning',
    cooldown: 300,
    condition: (metrics) => metrics.authFailures > 5,
    message: (metrics) =>
      `${metrics.authFailures} auth failures from ${metrics.ip}`,
  },
  {
    id: 'disk_space_low',
    name: 'Low Disk Space',
    description: '<10% disk space remaining',
    severity: 'critical',
    cooldown: 1800, // 30 minutes
    condition: (metrics) => metrics.diskUsagePercent > 90,
    message: (metrics) =>
      `Disk usage: ${metrics.diskUsagePercent}% (${metrics.diskFree} GB free)`,
  },
  // ... 9 more rules (total 14)
];
```

**2. Alert Service** (`alert-service.ts`)
```typescript
import { alertRules, AlertRule } from './alert-definitions';

interface AlertCooldown {
  ruleId: string;
  lastAlerted: number;
}

export class AlertService {
  private static cooldowns: Map<string, number> = new Map();

  static dispatch(rule: AlertRule, metrics: any) {
    // Check cooldown
    const lastAlerted = this.cooldowns.get(rule.id) || 0;
    const now = Date.now();

    if (now - lastAlerted < rule.cooldown * 1000) {
      return; // Still in cooldown
    }

    // Dispatch alert
    const message = rule.message(metrics);

    switch (rule.severity) {
      case 'critical':
        console.error(`🚨 [CRITICAL] ${rule.name}: ${message}`);
        break;
      case 'warning':
        console.warn(`⚠️ [WARNING] ${rule.name}: ${message}`);
        break;
      case 'info':
        console.info(`ℹ️ [INFO] ${rule.name}: ${message}`);
        break;
    }

    // Update cooldown
    this.cooldowns.set(rule.id, now);

    // Future: Send to external channels
    // await this.sendEmail(rule, message);
    // await this.sendSlack(rule, message);
  }

  static checkAll(metrics: any) {
    for (const rule of alertRules) {
      try {
        if (rule.condition(metrics)) {
          this.dispatch(rule, metrics);
        }
      } catch (error) {
        console.error(`Alert rule ${rule.id} failed:`, error);
      }
    }
  }
}
```

**Integration Example:**
```typescript
// src/app/api/health/route.ts
import { AlertService } from '@/lib/monitoring/alert-service';

export async function GET() {
  const metrics = {
    diskUsagePercent: getDiskUsage(),
    queueDepth: await getQueueDepth(),
    connectionPool: await getPoolStatus(),
  };

  // Check alerts
  AlertService.checkAll(metrics);

  return Response.json(metrics);
}
```

**Verification:**
```bash
# Trigger alerts by simulating conditions
# 1. Queue depth high - submit 15 jobs
# 2. Check console logs for alert messages
```

---

#### Task 3.4: Production Readiness Checklist
**Priority:** LOW
**Time:** 2-3 hours
**Blocker:** All other tasks

**File to Create:** `docs/PRODUCTION_READINESS.md`

**(Content provided in earlier Phase 8 plan - 300+ line checklist covering security, performance, monitoring, operations, deployment)**

**Verification:**
- Manual review of checklist
- Check all boxes that apply
- Document any gaps before Phase 9

---

## 📊 Timeline & Resource Estimates

### **By Category:**
| Category | Tasks | Hours | Priority |
|----------|-------|-------|----------|
| Security Testing | 2 | 8-10 | HIGH |
| Performance Testing | 4 | 12-15 | MEDIUM |
| Monitoring | 2 | 5-7 | MEDIUM |
| **Total** | **8** | **25-32 hours** | - |

### **By Priority:**
| Priority | Tasks | Hours | Can Defer? |
|----------|-------|-------|------------|
| HIGH | 3 | 13-16 | NO |
| MEDIUM | 4 | 10-13 | YES (to post-release) |
| LOW | 1 | 2-3 | YES |

### **Recommended Approach:**

**Option A: Complete All (Recommended)**
- Duration: 2-3 days
- Deliverable: 100% production-ready with full monitoring
- Best for: First public release

**Option B: High Priority Only**
- Duration: 1-2 days
- Skip: Memory leak test, query profiling, render benchmarks
- Deliverable: Security-validated, basic monitoring
- Best for: Internal testing

**Option C: Minimal Viable**
- Duration: 1 day
- Complete: Security tests + OWASP docs only
- Skip: All performance testing, alerts, checklist
- Best for: Quick validation before Phase 6 completes

---

## ✅ Success Criteria

### **Must Have:**
- ✅ All security tests pass (no SQL injection, XSS, etc.)
- ✅ OWASP Top 10 documented (7/10 PASS minimum)
- ✅ Load test handles 10 jobs (100% success rate)
- ✅ Alert service operational (console-only acceptable)

### **Should Have:**
- ✅ No memory leaks (<10% growth over 100 jobs)
- ✅ All queries <100ms (p95)
- ✅ Performance dashboard live

### **Nice to Have:**
- ✅ Render benchmarks documented
- ✅ Production readiness checklist 100%
- ✅ Alerting strategy doc

---

## 🚀 Getting Started

**Step 1: Accept Plan**
- Review this plan with implementing agent
- Choose approach (A, B, or C)
- Confirm timeline fits

**Step 2: Setup**
```bash
cd obsidian-news-desk

# Create test directories
mkdir -p tests/security
mkdir -p tests/performance
mkdir -p docs/security
mkdir -p docs/performance
mkdir -p docs/monitoring
mkdir -p src/lib/monitoring

# Install test dependencies (if needed)
npm install --save-dev @testing-library/react happy-dom
```

**Step 3: Implement**
- Start with HIGH priority tasks (security tests)
- Verify each task before moving to next
- Document results in respective docs files

**Step 4: Verify**
```bash
# Run all tests
npm run test:security
npm run test:performance

# Check coverage
npm run test:coverage

# Manual verification
- Review OWASP_COMPLIANCE.md
- Check alert system in console logs
- Review PRODUCTION_READINESS.md checklist
```

---

## 📝 Deliverables

### **Code Files (14 new files):**
- 5 security test files
- 4 performance test files
- 2 monitoring service files
- 1 memory monitoring script
- 1 query benchmark SQL
- 1 alert strategy doc

### **Documentation (4 new files):**
- OWASP_COMPLIANCE.md
- LOAD_TEST_RESULTS.md
- QUERY_OPTIMIZATION.md
- RENDER_OPTIMIZATION.md
- ALERTING_STRATEGY.md
- PRODUCTION_READINESS.md

### **Test Coverage:**
- Security: 5 test suites (SQL injection, XSS, path traversal, rate limiting, auth)
- Performance: 4 test suites (load, memory, queries, render)
- Total: ~50-70 new test cases

---

## 🐛 Known Issues to Address

From earlier Phase 8A review:

1. **Security events API SQL injection** (CRITICAL)
   - Fix in Task 1.5 (security tests will catch this)
   - Use parameterized queries

2. **job_metrics table missing** (MEDIUM)
   - Dashboard queries reference non-existent table
   - Add migration or rewrite queries to use news_jobs

3. **Missing chart.js dependency** (LOW)
   - Add: `npm install chart.js react-chartjs-2`
   - For performance dashboard charts

---

## 💬 Questions for Implementing Agent

Before starting, clarify:

1. **Approach:** Option A (full), B (high priority), or C (minimal)?
2. **Timeline:** Can complete in 2-3 days? Or need longer?
3. **Blockers:** Any dependencies missing? Test environment ready?
4. **Scope:** Any tasks that should be deferred to post-release?

---

## 📞 Handoff Notes

**For Reviewer (You):**
- This plan completes Phase 8A (Production Hardening)
- Can be done in parallel with Phase 6 (installer build)
- No blockers, can start immediately
- Results will inform Phase 8B (installer QA)

**For Implementing Agent:**
- All tasks are independent (can do in any order)
- Start with security tests (HIGH priority)
- Document results as you go
- Ping for review after each major section

---

**Ready to proceed? Let the implementing agent know which approach (A/B/C) to take!**
