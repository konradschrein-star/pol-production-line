# Alerting Strategy

**Last Updated:** March 28, 2026
**Phase:** 8 - Monitoring & Observability
**Status:** Phase 8 Implementation (Console-only alerts)

---

## Executive Summary

This document defines the alerting strategy for the Obsidian News Desk production system. Phase 8 implements **console-only alerts** with a structured rule-based system. Future phases will add email, Slack, and webhook integrations.

**Key Principles:**
- Alert on actionable conditions only (no noise)
- Implement alert cooldown (5 minutes) to prevent fatigue
- Log critical alerts to audit_log for historical analysis
- Severity-based routing (CRITICAL → console, WARNING → console, INFO → console)

---

## Severity Levels

### CRITICAL 🚨
**When to use:** System is down or severely degraded, requires immediate action

**Examples:**
- Worker crash (process exit)
- Database connection pool exhausted (waiting connections > 0)
- Disk space <10% remaining
- Queue depth >50 jobs (saturation)

**Current Action:** Console error log
**Future Action:** Console + Email + Slack ping

---

### WARNING ⚠️
**When to use:** System is degraded but operational, requires attention soon

**Examples:**
- Queue depth >10 jobs
- Database pool utilization >80%
- >5 authentication failures from same IP in 1 minute
- Worker stalled (no progress in 60s)
- Disk space 10-20% remaining

**Current Action:** Console warning log
**Future Action:** Console + Slack message

---

### INFO ℹ️
**When to use:** Informational event that may require review later

**Examples:**
- New job created
- Worker started/stopped
- Configuration changed

**Current Action:** Console info log
**Future Action:** Console only (no notification)

---

## Alert Rules

### Implemented Alert Rules (Phase 8)

| Rule ID | Name | Severity | Condition | Action |
|---------|------|----------|-----------|--------|
| `worker_crash` | Worker Crash Detected | CRITICAL | Worker process exits with error | Log to console + audit_log |
| `worker_stalled` | Worker Stalled | WARNING | No progress in 60s | Log to console |
| `queue_depth_high` | High Queue Depth | WARNING | Queue depth >10 jobs | Log to console |
| `queue_depth_critical` | Critical Queue Depth | CRITICAL | Queue depth >50 jobs | Log to console + audit_log |
| `db_pool_exhausted` | Database Pool Exhausted | CRITICAL | Connection pool waiting >0 | Log to console + audit_log |
| `db_pool_high_utilization` | High DB Pool Utilization | WARNING | Pool utilization >80% | Log to console |
| `auth_failures` | Multiple Auth Failures | WARNING | >5 auth failures in 1 min from same IP | Log to console + audit_log |
| `admin_access_denied` | Admin Access Denied | WARNING | Admin endpoint access denied | Log to console + audit_log |
| `disk_space_low` | Low Disk Space | CRITICAL | Disk usage >90% | Log to console + audit_log |
| `disk_space_warning` | Disk Space Warning | WARNING | Disk usage >80% | Log to console |
| `bulk_delete_large` | Large Bulk Delete | WARNING | >20 jobs deleted in single operation | Log to console + audit_log |
| `render_timeout` | Render Timeout | WARNING | Render exceeds timeout | Log to console |
| `image_generation_failures` | Multiple Image Gen Failures | WARNING | >5 image generation failures in 10 min | Log to console |
| `rate_limit_threshold` | High Rate Limit Hits | WARNING | >10 rate limit hits in 5 min | Log to console |

**Total Rules:** 14 (12 enabled by default, 2 optional)

---

## Alert Cooldown

**Purpose:** Prevent alert fatigue by suppressing duplicate alerts within a time window.

**Default Cooldown:** 5 minutes per rule

**Example:**
```
10:00 AM - Alert: Queue depth >10 jobs (12 jobs pending)
10:02 AM - Condition still true (15 jobs pending) → Suppressed (within cooldown)
10:05 AM - Condition still true (18 jobs pending) → Suppressed (within cooldown)
10:06 AM - Alert: Queue depth >10 jobs (20 jobs pending) → Sent (cooldown expired)
```

**Cooldown Management:**
- Per-rule cooldown (each rule has its own cooldown timer)
- Resets after alert is sent
- Can be manually reset for testing via `AlertService.resetCooldown(ruleId)`

---

## Alert Dispatch Channels

### Phase 8: Console-Only (Current Implementation)

**Console Output Format:**
```
🚨 [CRITICAL] 2026-03-28T10:15:32.123Z [worker_crash] Worker Crash Detected: Worker analyze.worker crashed: ECONNREFUSED
⚠️  [WARNING] 2026-03-28T10:16:45.456Z [queue_depth_high] High Queue Depth: Queue depth: 12 jobs pending (threshold: 10)
ℹ️  [INFO] 2026-03-28T10:17:01.789Z [job_created] Job Created: Job abc-123 created by user@example.com
```

**Advantages:**
- Simple, no external dependencies
- Easy to debug in development
- No cost (no email/Slack API calls)

**Disadvantages:**
- Not visible when terminal is not monitored
- No persistent record (unless logs are captured)
- No automated escalation

---

### Phase 9: Email Integration (Future)

**Use Case:** Send email notifications for CRITICAL alerts to on-call engineer

**Implementation:**
```typescript
// src/lib/monitoring/channels/email.ts
import nodemailer from 'nodemailer';

export async function sendEmail(alert: {
  rule: AlertRule;
  message: string;
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: 'alerts@obsidian-news-desk.com',
    to: process.env.ALERT_EMAIL,
    subject: `[${alert.rule.severity}] ${alert.rule.name}`,
    text: alert.message,
  });
}
```

**Configuration:**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (environment variables)
- `ALERT_EMAIL` (recipient email address)

**Routing:**
- CRITICAL alerts → Email
- WARNING alerts → No email (Slack only)
- INFO alerts → No email

---

### Phase 9: Slack Integration (Future)

**Use Case:** Send Slack messages to #alerts channel for WARNING and CRITICAL alerts

**Implementation:**
```typescript
// src/lib/monitoring/channels/slack.ts
export async function sendSlackMessage(alert: {
  rule: AlertRule;
  message: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `[${alert.rule.severity}] ${alert.rule.name}`,
      attachments: [
        {
          color: alert.rule.severity === 'critical' ? 'danger' : 'warning',
          text: alert.message,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }),
  });
}
```

**Configuration:**
- `SLACK_WEBHOOK_URL` (Slack incoming webhook URL)

**Routing:**
- CRITICAL alerts → Slack ping
- WARNING alerts → Slack message (no ping)
- INFO alerts → No Slack

---

### Phase 10: Webhook Integration (Future)

**Use Case:** Send alerts to custom webhook for integration with PagerDuty, Opsgenie, etc.

**Implementation:**
```typescript
// src/lib/monitoring/channels/webhook.ts
export async function sendWebhook(alert: {
  rule: AlertRule;
  message: string;
}) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: alert.rule.id,
      name: alert.rule.name,
      severity: alert.rule.severity,
      message: alert.message,
      timestamp: new Date().toISOString(),
    }),
  });
}
```

**Configuration:**
- `ALERT_WEBHOOK_URL` (custom webhook endpoint)

---

## Integration Points

### 1. Health Check Endpoint

**File:** `src/app/api/health/route.ts`

**Integration:**
```typescript
import { checkQueueHealth, checkDatabaseHealth } from '@/lib/monitoring/alert-service';

export async function GET() {
  const queueDepth = await getQueueDepth();
  const poolStats = pool.getPoolStats();

  // Check queue health
  checkQueueHealth({ queueDepth });

  // Check database health
  checkDatabaseHealth({
    connectionPool: {
      total: poolStats.total,
      idle: poolStats.idle,
      waiting: poolStats.waiting,
      utilization: Math.round((poolStats.total - poolStats.idle) / poolStats.total * 100),
    },
  });

  return new Response(JSON.stringify({ status: 'ok' }));
}
```

---

### 2. BullMQ Workers

**File:** `src/workers/analyze.worker.ts`, `images.worker.ts`, `render.worker.ts`

**Integration:**
```typescript
import { checkWorkerHealth } from '@/lib/monitoring/alert-service';

worker.on('failed', (job, error) => {
  checkWorkerHealth({
    type: 'worker_failed',
    workerName: 'analyze.worker',
    error: error.message,
  });
});

worker.on('stalled', (jobId) => {
  checkWorkerHealth({
    type: 'worker_stalled',
    workerName: 'analyze.worker',
    jobId,
  });
});
```

---

### 3. Audit Log Events

**File:** `src/middleware.ts`, `src/app/api/settings/route.ts`

**Integration:**
```typescript
import { AlertService } from '@/lib/monitoring/alert-service';

// After logging auth failure to audit_log
if (authFailureCount > 5) {
  AlertService.checkRule('auth_failures', {
    authFailures: authFailureCount,
    ip: req.ip,
  }, { logToAudit: true });
}
```

---

## Alert Best Practices

### DO ✅
- Alert on actionable conditions only
- Use appropriate severity levels
- Include enough context in alert messages (job ID, error type, metrics)
- Test alerts during development
- Review alert frequency weekly

### DON'T ❌
- Alert on every event (causes alert fatigue)
- Use CRITICAL for warnings (causes desensitization)
- Send duplicate alerts within cooldown period
- Alert on expected behavior (e.g., job completed)

---

## Alert Review Process

### Weekly Review (Recommended)

1. **Check Alert Frequency**
   ```bash
   # Query audit_log for alert_triggered events
   psql obsidian_news_desk -c "
     SELECT
       details->>'ruleName' as rule,
       COUNT(*) as count
     FROM audit_log
     WHERE event_type = 'alert_triggered'
       AND timestamp > NOW() - INTERVAL '7 days'
     GROUP BY details->>'ruleName'
     ORDER BY count DESC;
   "
   ```

2. **Identify Noisy Alerts**
   - If alert fires >10 times/day → Increase threshold or disable

3. **Identify Missing Alerts**
   - Review recent incidents → Add new alert rules if needed

4. **Adjust Cooldowns**
   - If alerts are too frequent → Increase cooldown
   - If alerts are missed → Decrease cooldown

---

## Testing Alerts

### Manual Alert Testing

```typescript
import { AlertService } from '@/lib/monitoring/alert-service';
import { getRuleById } from '@/lib/monitoring/alert-definitions';

// Test queue depth alert
const rule = getRuleById('queue_depth_high');
if (rule) {
  AlertService.dispatch(rule, { queueDepth: 15 }, { logToAudit: false });
}

// Test database pool alert
const poolRule = getRuleById('db_pool_exhausted');
if (poolRule) {
  AlertService.dispatch(poolRule, {
    connectionPool: { total: 50, idle: 0, waiting: 5, utilization: 100 },
  }, { logToAudit: true });
}
```

---

## Future Enhancements (Phase 9+)

### 1. Alert Aggregation
- Group similar alerts within time window
- Example: "10 authentication failures from 3 IPs" instead of 10 separate alerts

### 2. Alert Escalation
- CRITICAL alert not acknowledged in 15 minutes → Send SMS
- CRITICAL alert not acknowledged in 30 minutes → Call on-call engineer

### 3. Alert Dashboard
- Real-time alert feed in web UI
- Alert history & trend analysis
- Alert acknowledgement workflow

### 4. Intelligent Alerting
- Machine learning to detect anomalies
- Predictive alerts (e.g., "Queue depth trending towards saturation in 30 minutes")

---

## Configuration

### Environment Variables

```bash
# Phase 8 (Console-only)
# No configuration needed

# Phase 9+ (Email, Slack)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@obsidian-news-desk.com
SMTP_PASS=xxxxxxxxxxxxx
ALERT_EMAIL=oncall@example.com

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ

# Phase 10+ (Webhooks)
ALERT_WEBHOOK_URL=https://custom-webhook.example.com/alerts
```

---

## Troubleshooting

### Alert not triggering?

1. **Check if rule is enabled**
   ```typescript
   import { getRuleById } from '@/lib/monitoring/alert-definitions';
   const rule = getRuleById('queue_depth_high');
   console.log('Enabled:', rule?.enabled);
   ```

2. **Check condition logic**
   ```typescript
   const metrics = { queueDepth: 12 };
   console.log('Condition met:', rule?.condition(metrics));
   ```

3. **Check cooldown**
   ```typescript
   import { AlertService } from '@/lib/monitoring/alert-service';
   console.log('Time since last alert:', AlertService.getTimeSinceLastAlert('queue_depth_high'));
   ```

### Alert firing too frequently?

1. **Increase alert cooldown**
   - Edit `ALERT_COOLDOWN_MS` in `alert-service.ts`
   - Default: 5 minutes → Increase to 10-15 minutes

2. **Adjust threshold**
   - Edit rule condition in `alert-definitions.ts`
   - Example: Queue depth >10 → Change to >20

3. **Disable rule temporarily**
   - Set `enabled: false` in `alert-definitions.ts`

---

**Reviewed By:** [Name]
**Date:** March 28, 2026
**Next Review:** June 28, 2026 (quarterly)
