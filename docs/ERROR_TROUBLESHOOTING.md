# Error Troubleshooting Guide

Quick reference for common errors and solutions in the Obsidian News Desk quality check system.

---

## Error Categories

### 🔴 Policy Violation

**What it means:** Whisk API rejected the image due to content policy filters (political, controversial, or sensitive content).

**Common causes:**
- Politician names (e.g., "Donald Trump", "Biden")
- Controversial events (e.g., "insurrection", "protest")
- Sensitive topics (violence, weapons, explicit content)

**How to fix:**
1. **Automatic (first 3 attempts):** AI will rewrite prompt to be policy-compliant
2. **Manual (after 3 failures):**
   - Replace names: "Donald Trump" → "government official"
   - Use generic terms: "protest" → "public gathering"
   - Remove controversial context: "controversial bill" → "new legislation"

**Example:**
```
❌ "Donald Trump speaking at MAGA rally with Confederate flags"
✅ "Political leader speaking at outdoor event with supporters"
```

---

### 🟡 Timeout

**What it means:** Whisk API took too long to respond (>90 seconds).

**Common causes:**
- High load on Whisk servers
- Complex prompts requiring extra processing
- Network issues

**How to fix:**
1. **Retry the scene** (usually works on second attempt)
2. **Simplify the prompt:**
   - Remove excessive details
   - Use simpler language
   - Split complex scenes into multiple simpler ones

**Example:**
```
❌ "Photorealistic 8K cinematic wide-angle shot of a bustling downtown cityscape at golden hour with dramatic volumetric lighting and lens flares..."
✅ "Cityscape at sunset"
```

---

### 🟠 Rate Limit

**What it means:** Too many requests sent to Whisk API in a short time.

**System behavior:**
- Adaptive rate limiter automatically reduces concurrency
- Worker backs off exponentially (5s → 10s → 20s)
- Retries automatically after backoff

**How to fix:**
- **Wait:** System handles this automatically
- **Check health widget:** Shows current rate limit usage
- **Avoid:** Don't regenerate >5 scenes within 5 minutes

**Prevention:**
- Space out regenerations
- Use bulk retry instead of individual retries
- Monitor health widget to avoid hitting limits

---

### 🔴 Token Expired (Auth Error)

**What it means:** Whisk API token has expired (tokens last ~1 hour).

**System behavior:**
- All new image generations will fail immediately
- Health widget shows 🔴 "Critical"
- Browser notification: "Whisk token expired"

**How to fix:**
1. Click health widget (top-right)
2. Click "Refresh Token"
3. Follow **WhiskTokenRefreshWizard** steps:
   - Open https://labs.google.com/whisk
   - F12 → Network tab
   - Generate test image
   - Find "generateImage" request
   - Copy `Authorization: Bearer` header
   - Paste in wizard
4. Test + Save

**Prevention:**
- Refresh token proactively when widget shows < 10 min remaining
- Set a timer for 50 minutes when starting generation session

---

### 🟠 API Error

**What it means:** Whisk API returned an error (500, 503, or unknown).

**Common causes:**
- Whisk server downtime
- Temporary service issues
- Invalid request format (rare)

**How to fix:**
1. **Check Whisk status:** https://labs.google.com/whisk
2. **Retry the scene** (usually resolves after a few minutes)
3. **If persistent:** Check worker logs for detailed error message

---

### ⚪ Unknown Error

**What it means:** Error doesn't match any known category.

**Common causes:**
- Network connectivity issues
- Unexpected API response format
- Bug in worker code

**How to fix:**
1. Check worker logs for detailed error message
2. Check network connectivity
3. Restart workers if needed
4. Report to development team if persistent

---

## Common Scenarios

### Scenario 1: All Scenes Failing with Policy Violations

**Symptom:** Every scene in job shows "Policy Violation" error.

**Likely cause:** News script contains politically sensitive content.

**Solution:**
1. Click **BulkRetryPanel** → Check "Reset prompts to original"
2. DON'T retry yet
3. Go to each failed scene
4. Click "Edit & Retry"
5. Manually sanitize prompts:
   - Remove politician names
   - Remove controversial terms
   - Use generic descriptions
6. After editing all, click "Retry All Failed Scenes"

**Time estimate:** 5-10 minutes for 8 scenes

---

### Scenario 2: Token Expires Mid-Generation

**Symptom:** First 3 scenes succeed, next 5 fail with "Token Expired".

**What happened:** Token expired after ~1 hour.

**Solution:**
1. Refresh token (see "Token Expired" section above)
2. Go back to storyboard
3. Click **BulkRetryPanel** → "Retry All Failed Scenes"
4. All 5 scenes will re-generate with new token

**Time estimate:** 5 min (token refresh) + 15 min (regeneration)

---

### Scenario 3: 1-2 Scenes Stuck on "Generating" Forever

**Symptom:** Most scenes complete, but 1-2 show "Generating" for >10 minutes.

**Likely cause:** Worker stalled or job got stuck.

**Solution:**
1. **Check worker logs:**
   ```bash
   docker logs obsidian-workers
   ```
2. **If worker is stuck:**
   ```bash
   npm run workers:restart
   ```
3. **After restart:**
   - Stuck scenes will reset to "pending"
   - System will retry automatically

**Prevention:** Workers have 3-minute lock timeout (auto-recover from stalls)

---

### Scenario 4: Rate Limit After Bulk Regeneration

**Symptom:** After clicking "Retry All", first 3 scenes succeed, rest fail with "Rate Limited".

**What happened:** Sent too many requests too quickly.

**Solution:**
- **Wait 5-10 minutes**
- **Check health widget:** Rate limit should drop below 70%
- **Retry failed scenes** (individually or bulk)

**Prevention:**
- Don't regenerate entire jobs repeatedly
- Use "Edit & Retry" for specific scenes instead of bulk regeneration

---

### Scenario 5: Max Sanitization Attempts Reached (3/3)

**Symptom:** SceneErrorPanel shows "3 of 3 attempts used (max reached)".

**What happened:** AI tried to sanitize prompt 3 times, all failed.

**Solution:**
1. **PromptInterventionModal** should auto-appear
2. Review original + sanitized prompts
3. **Understand what AI changed:**
   - Did it remove names?
   - Did it simplify language?
   - Did it work around controversial terms?
4. **Edit manually:**
   - Build on AI's last attempt
   - Remove remaining problematic terms
   - Use even more generic language
5. Click "Try Again with Manual Edit"

**Example progression:**
```
Original:   "Donald Trump signing executive order banning immigration"
Sanitize 1: "President signing executive order on immigration policy"  ❌
Sanitize 2: "Government leader signing document on border policy"     ❌
Sanitize 3: "Official signing policy document at desk"                ❌
Manual:     "Person signing document in office"                        ✅
```

---

## Prevention Best Practices

### 1. Monitor Health Widget

- Keep widget expanded during generation sessions
- Refresh token when < 15 min remaining
- Watch rate limit (stay below 70%)

### 2. Write Generic Prompts

**Bad prompts (likely to fail):**
- "Donald Trump at Mar-a-Lago rally"
- "Biden's infrastructure bill signing"
- "Israeli-Palestinian conflict protest"

**Good prompts (less likely to fail):**
- "Political leader at outdoor event"
- "Government official signing legislation"
- "Public demonstration on urban street"

### 3. Space Out Regenerations

- Wait 30-60 seconds between manual regenerations
- Use bulk retry for multiple scenes (it has built-in rate limiting)
- Don't regenerate entire jobs >3 times per hour

### 4. Review Before Generating

- Check raw script for politically sensitive terms
- Pre-sanitize script before job creation
- Use style presets with conservative prompts

### 5. Handle Errors Early

- Don't wait for all 8 scenes to fail before intervening
- Fix failed scenes immediately (while others generate)
- Use "Edit & Retry" instead of letting AI sanitize 3 times

---

## Emergency Procedures

### All Services Down

**Symptom:** Health widget shows 🔴 for Postgres, Redis, and Workers.

**Solution:**
```bash
cd obsidian-news-desk
STOP.bat
START.bat
```

### Database Corruption

**Symptom:** Jobs stuck in weird states, scenes not saving.

**Solution:**
```bash
# Backup database first
docker exec obsidian-postgres pg_dump -U obsidian obsidian_news > backup.sql

# Restart database
docker restart obsidian-postgres

# If corruption persists, restore from backup
docker exec -i obsidian-postgres psql -U obsidian obsidian_news < backup.sql
```

### Worker Crash Loop

**Symptom:** Workers restart every few seconds, jobs never process.

**Solution:**
```bash
# Check logs for error
docker logs obsidian-workers --tail 100

# Common causes:
# 1. Redis connection failed → restart Redis
# 2. Database connection failed → check DATABASE_URL in .env
# 3. Invalid job data → manually mark stuck jobs as failed

# Mark stuck jobs as failed
psql -U obsidian obsidian_news -c "
  UPDATE news_jobs
  SET status = 'failed', error_message = 'Manual intervention'
  WHERE status IN ('analyzing', 'generating_images', 'rendering')
    AND updated_at < NOW() - INTERVAL '1 hour';
"
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# In .env
LOG_LEVEL=debug

# Restart workers
npm run workers:restart
```

### Check Job State

```sql
-- Get job details
SELECT id, status, error_message, created_at, updated_at
FROM news_jobs
WHERE id = 'job-uuid-here';

-- Get scene details
SELECT id, scene_order, generation_status, error_category, sanitization_attempts
FROM news_scenes
WHERE job_id = 'job-uuid-here'
ORDER BY scene_order;

-- Get generation history
SELECT scene_id, attempt_number, success, error_message, created_at
FROM generation_history
WHERE job_id = 'job-uuid-here'
ORDER BY created_at DESC;
```

### Test API Endpoints

```bash
# Test health
curl http://localhost:8347/api/system/health | jq

# Test error details
curl http://localhost:8347/api/jobs/{jobId}/scenes/{sceneId}/errors | jq

# Test token validation
curl -X POST http://localhost:8347/api/system/test-whisk-token \
  -H "Content-Type: application/json" \
  -d '{"token": "ya29.XXX..."}'
```

---

## Support Resources

**Documentation:**
- `/docs/QUALITY_CHECK_SYSTEM.md` - Full implementation guide
- `/docs/BLACK_SCREEN_FIX.md` - Asset preparation details
- `/CLAUDE.md` - Project overview

**Logs:**
- Worker logs: `docker logs obsidian-workers -f`
- Next.js logs: Check terminal where `npm run dev` is running
- Database logs: `docker logs obsidian-postgres -f`

**Quick Commands:**
```bash
# View all jobs
psql -U obsidian obsidian_news -c "SELECT id, status, created_at FROM news_jobs ORDER BY created_at DESC LIMIT 10;"

# Count failed scenes
psql -U obsidian obsidian_news -c "SELECT COUNT(*) FROM news_scenes WHERE generation_status = 'failed';"

# Check Redis connection
docker exec obsidian-redis redis-cli ping
```

**Last Updated:** March 29, 2026
