# Security Best Practices

This document outlines security guidelines and best practices for the Obsidian News Desk application.

## API Key Management

### Never Commit Secrets

**CRITICAL:** Never commit `.env` files or API keys to version control.

**Verification Checklist:**
- [ ] `.env` is in `.gitignore`
- [ ] Run `git log --all --full-history -- .env` to verify no history
- [ ] Use `.env.example` for templates only (with placeholder values)

### API Key Rotation

**When to Rotate:**
- Immediately if keys are exposed in git commits
- Every 90 days for production systems
- When team members with access leave
- After security incidents

**How to Rotate:**

1. **OpenAI API Key:**
   - Visit https://platform.openai.com/account/api-keys
   - Revoke old key
   - Generate new key
   - Update `.env`: `OPENAI_API_KEY=sk-proj-...`
   - Restart application

2. **Whisk API Token:**
   - Open https://labs.google.com/whisk in browser
   - Press F12 → Network tab
   - Generate test image
   - Find "generateImage" request
   - Copy new Authorization Bearer token
   - Update `.env`: `WHISK_API_TOKEN=ya29...`
   - Restart application

3. **Admin API Key:**
   - Generate new 32-character random string:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Update `.env`: `ADMIN_API_KEY=<new-key>`
   - Restart application
   - Update any scripts/clients using this key

### Environment-Specific Keys

Use different API keys for each environment:

- **Development:** Low-cost/free-tier keys, limited permissions
- **Staging:** Separate keys for testing, same provider as production
- **Production:** High-limit keys, strict access controls

## Authentication & Authorization

### Settings API Protection

The `/api/settings` endpoint modifies `.env` files and **requires authentication**.

**Request Format:**
```bash
curl -X POST http://localhost:8347/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -d '{"AI_PROVIDER":"openai"}'
```

**Response Codes:**
- `200 OK` - Settings updated successfully
- `401 Unauthorized` - Invalid or missing admin API key
- `400 Bad Request` - Invalid settings data

### Future Improvements

Consider implementing:
- OAuth2 for user authentication
- Role-based access control (RBAC)
- API rate limiting per user/key
- Audit logging for sensitive operations
- JWT tokens for stateless authentication

## Database Security

### Connection Security

**Current Setup:**
- Local PostgreSQL via Docker (development)
- Password-protected connections
- Port 5432 not exposed externally

**Production Recommendations:**
- Use SSL/TLS connections: `DATABASE_URL=postgresql://...?sslmode=require`
- Enable `pg_hba.conf` IP restrictions
- Use strong passwords (20+ characters)
- Rotate database passwords quarterly
- Enable audit logging: `log_statement = 'all'` in `postgresql.conf`

### SQL Injection Prevention

**Built-in Protections:**
- All API routes use parameterized queries
- Input validation on pagination parameters (sortBy whitelist)
- No dynamic SQL string concatenation

**Example (Safe):**
```typescript
await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
```

**Example (Unsafe - Never Do This):**
```typescript
// ❌ NEVER DO THIS
await db.query(`SELECT * FROM jobs WHERE id = '${jobId}'`);
```

## Redis Security

### Password Protection

Redis is password-protected via `REDIS_PASSWORD` environment variable.

**Best Practices:**
- Use strong passwords (20+ characters)
- Change default password from `.env.example`
- Never expose Redis port (6379) publicly
- Use Redis ACLs for fine-grained permissions (Redis 6+)

### Production Hardening

```bash
# redis.conf recommendations
requirepass your_strong_password_here
bind 127.0.0.1
protected-mode yes
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

## Input Validation

### API Endpoints

All user input is validated before processing:

1. **Pagination:** Bounded to max 1000 pages, 100 items per page
2. **Sort Parameters:** Whitelisted columns only (prevents SQL injection)
3. **File Uploads:** Type validation (MP4 for avatars, images for scenes)
4. **Job Scripts:** No validation yet - **TODO: Add XSS protection**

### File Uploads

**Current Implementation:**
- Avatar uploads: Validates `.mp4` extension
- Scene image uploads: Validates image MIME types
- Files stored locally (not R2 cloud)

**Recommendations:**
- Scan uploaded files for malware (ClamAV)
- Enforce file size limits (max 100MB for avatars)
- Validate video encoding (prevent malicious MP4 exploits)
- Use Content Security Policy (CSP) headers

## Dependency Security

### Regular Audits

Run security audits regularly:

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# View detailed report
npm audit --json
```

### Update Strategy

- **Minor/Patch Updates:** Weekly (automated via Dependabot)
- **Major Updates:** Monthly (manual review required)
- **Critical Security Updates:** Immediate (within 24 hours)

## Docker Security

### Container Hardening

**Current Setup:**
- Non-root user (`nextjs` UID 1001)
- Minimal Alpine Linux base
- Read-only filesystem where possible

**Recommendations:**
- Enable Docker Content Trust: `export DOCKER_CONTENT_TRUST=1`
- Scan images for vulnerabilities: `docker scan obsidian-news-desk:latest`
- Use multi-stage builds to minimize attack surface
- Drop unnecessary capabilities: `--cap-drop=ALL`

## Logging & Monitoring

### Current Logging

- Database queries logged (with slow query warnings)
- API errors logged to console
- Worker job failures logged
- No sensitive data in logs (passwords, API keys)

### Production Recommendations

- Centralized logging (ELK stack, Datadog, CloudWatch)
- Error tracking (Sentry, Rollbar)
- Security event monitoring (failed auth attempts)
- Log retention policies (30-90 days)
- Alert on suspicious patterns (mass deletions, unusual API usage)

## Incident Response Plan

### If API Keys Are Exposed

1. **Immediately revoke exposed keys** (see API Key Rotation above)
2. **Rotate all related secrets** (database password, Redis password)
3. **Check audit logs** for unauthorized usage
4. **Notify affected users** (if applicable)
5. **Document incident** in post-mortem

### If Database Is Compromised

1. **Disconnect database** from network
2. **Restore from last known good backup**
3. **Audit all access logs** to find entry point
4. **Patch vulnerability** that allowed compromise
5. **Reset all passwords** and API keys
6. **Notify affected users** per data breach laws

## Compliance

### Data Protection

- No personal user data stored currently
- HeyGen avatars may contain voice data (user-owned)
- Final videos stored locally (user-controlled)

### GDPR Considerations (If Applicable)

- Implement right to deletion (delete job + scenes + files)
- Provide data export (download job data as JSON)
- Document data retention policies
- Add privacy policy and terms of service

## Security Checklist for Production

Before deploying to production:

- [ ] All API keys rotated (not using dev/test keys)
- [ ] `.env` not committed to git
- [ ] Database uses SSL/TLS connections
- [ ] Redis password changed from default
- [ ] Admin API key is strong (32+ chars)
- [ ] Settings API authentication enabled
- [ ] Docker container runs as non-root user
- [ ] All dependencies up-to-date (`npm audit` clean)
- [ ] Firewall rules configured (block external DB/Redis access)
- [ ] HTTPS enabled for web traffic
- [ ] Error messages don't leak sensitive info
- [ ] Logging configured (no passwords in logs)
- [ ] Backup strategy implemented
- [ ] Incident response plan documented

---

**Last Updated:** 2026-03-23
**Security Team Contact:** TBD
