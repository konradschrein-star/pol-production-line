# Railway.app Deployment - Quick Reference

This is a condensed guide for deploying Obsidian News Desk to Railway.app in under 5 minutes.

For complete deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- GitHub account with repository access
- Railway.app account ([railway.app](https://railway.app))
- API keys ready:
  - AI Provider (OpenAI, Claude, Google, or Groq)
  - Google Whisk Bearer token

## Step-by-Step Deployment

### 1. Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Deploy from GitHub repo"**
3. Select your `obsidian-news-desk` repository
4. Railway auto-detects `railway.json` configuration

### 2. Add Database Services

Railway will prompt you to add services:

**PostgreSQL:**
1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway automatically sets `DATABASE_URL`

**Redis:**
1. Click **"+ New"** → **"Database"** → **"Add Redis"**
2. Railway automatically sets Redis connection variables

### 3. Configure Environment Variables

Go to your app service → **Variables** tab and add:

#### Required Variables

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app

# AI Provider (choose one)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# Google Whisk (required)
WHISK_API_TOKEN=Bearer ya29.a0...
WHISK_IMAGE_MODEL=IMAGEN_3_5
```

#### Optional Variables

```bash
# Browser Automation
AUTO_WHISK_EXTENSION_ID=gcgblhgncmhjchllkcpcneeibddhmbbe
DEFAULT_BROWSER=chrome

# HeyGen
AVATAR_MODE=manual
HEYGEN_AUDIO_SAMPLE_RATE=48000

# Performance
REMOTION_TIMEOUT_MS=300000
REMOTION_CONCURRENCY=4
WHISK_CONCURRENCY=2
```

**Note:** Railway automatically populates database and Redis variables. You don't need to set:
- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

### 4. Deploy

1. Click **"Deploy"** in the Railway dashboard
2. Wait for build to complete (~5-10 minutes)
3. Railway will:
   - Install dependencies
   - Build Next.js application
   - Run database migrations
   - Start the application
   - Perform health checks

### 5. Verify Deployment

1. Click on your app service to get the deployment URL
2. Visit `https://your-app.up.railway.app`
3. Check health: `https://your-app.up.railway.app/api/health`

Expected health response:
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  },
  "timestamp": "2026-03-22T...",
  "uptime": 123.45
}
```

### 6. Initialize Database (if needed)

If the database wasn't automatically initialized:

1. Go to **PostgreSQL service** → **Data** tab
2. Click **"Query"**
3. Copy contents of `src/lib/db/schema.sql`
4. Paste and execute

## Troubleshooting

### Build Failures

**Check build logs:**
- Railway dashboard → Your app → **Deployments** → Click on deployment

**Common issues:**
- Missing environment variables
- Invalid `railway.json` configuration
- Dependency installation failures

**Solutions:**
1. Verify all required variables are set
2. Check `railway.json` syntax
3. Try rebuilding: **Deployments** → **...** → **Redeploy**

### Database Connection Errors

**Symptom:** App crashes with `ECONNREFUSED` or database errors

**Solutions:**
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is automatically set by Railway
3. Restart PostgreSQL service
4. Restart app service

### Redis Connection Errors

**Symptom:** Queue workers fail, `NOAUTH` errors

**Solutions:**
1. Verify Redis service is running
2. Check Redis variables are automatically set
3. Restart Redis service
4. Restart app service

### Health Check Failures

**Symptom:** Deployment marked as unhealthy

**Solutions:**
1. Check `/api/health` endpoint manually
2. Review application logs
3. Verify database and Redis are healthy
4. Increase health check timeout in `railway.json`

## Post-Deployment Configuration

### Custom Domain

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain name
4. Update DNS records as instructed
5. Update `NEXT_PUBLIC_APP_URL` to match your domain

### Scaling

**Vertical Scaling (more resources):**
1. Go to **Settings** → **Resources**
2. Choose a plan with more CPU/RAM

**Horizontal Scaling (multiple instances):**
- Available on Pro plan and above
- Configure in **Settings** → **Deploy**

### Monitoring

**View logs:**
- Railway dashboard → Your app → **Logs**

**Use Railway CLI:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# View logs
railway logs

# SSH into container
railway shell
```

## Environment Variable Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://app.railway.app` |
| `AI_PROVIDER` | AI provider choice | `openai` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `WHISK_API_TOKEN` | Google Whisk token | `Bearer ya29.a0...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `WHISK_IMAGE_MODEL` | Whisk image model | `IMAGEN_3_5` |
| `AVATAR_MODE` | Avatar generation | `manual` |
| `DEFAULT_BROWSER` | Browser choice | `chrome` |
| `REMOTION_CONCURRENCY` | Render threads | `4` |

See [DEPLOYMENT.md](./DEPLOYMENT.md#environment-variables-reference) for complete reference.

## Getting API Keys

### OpenAI
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Copy key (starts with `sk-proj-`)

### Google Whisk
1. Open [labs.google.com/whisk](https://labs.google.com/whisk)
2. Open DevTools (F12) → **Network** tab
3. Generate a test image
4. Find `generateImage` request
5. Copy **Authorization** header value (entire `Bearer ...` string)

### Anthropic Claude
1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Create API key
3. Copy key (starts with `sk-ant-`)

## Cost Estimates

**Railway Free Tier:**
- $5/month credit
- Shared resources
- Good for testing/demo

**Railway Hobby Plan ($5/month):**
- $5 credit + usage-based billing
- Suitable for light production use
- ~500 hours compute time

**Railway Pro Plan ($20/month):**
- $20 credit + usage-based billing
- Horizontal scaling
- Priority support
- Recommended for production

**Additional costs:**
- API calls (OpenAI, Claude, Whisk)
- Data transfer (negligible for most use cases)

## Next Steps

After successful deployment:

1. **Test the full workflow:**
   - Create a test broadcast
   - Generate images
   - Upload avatar
   - Render final video

2. **Configure integrations:**
   - Set up Google Whisk properly
   - Test browser automation
   - Verify HeyGen integration

3. **Monitor performance:**
   - Check logs regularly
   - Monitor queue metrics
   - Track rendering times

4. **Setup backups:**
   - Railway provides automatic backups
   - Consider additional backup strategy for critical data

5. **Review security:**
   - Rotate API keys regularly
   - Enable 2FA on Railway account
   - Review access logs

## Support

- **Full Documentation:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **User Guide:** [USER_GUIDE.md](./USER_GUIDE.md)
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **GitHub Issues:** [Repository Issues](https://github.com/your-username/obsidian-news-desk/issues)

## Quick Commands

```bash
# View logs
railway logs -f

# SSH into container
railway shell

# Run commands in container
railway run npm run workers

# Check environment variables
railway variables

# Restart deployment
railway up --detach

# Delete deployment
railway down
```

---

**Deployment Time:** ~5 minutes
**Difficulty:** Beginner
**Cost:** Free tier available
