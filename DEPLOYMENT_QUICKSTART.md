# Deployment Quick Start - One Page Reference

**Choose your deployment method:**

## 🚀 Option 1: Railway.app (Fastest - 5 minutes)

```bash
# 1. Push to GitHub
git push origin main

# 2. Go to railway.app/new
# 3. Select your repo
# 4. Add PostgreSQL and Redis databases
# 5. Set environment variables:

NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
WHISK_API_TOKEN=Bearer ya29.a0...

# 6. Deploy and wait (~5 min)
# 7. Visit: https://your-app.up.railway.app
```

**Full guide:** [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

---

## 🐋 Option 2: Docker Compose (Local/VPS - 10 minutes)

```bash
# 1. Clone repository
git clone https://github.com/your-username/obsidian-news-desk.git
cd obsidian-news-desk

# 2. Create .env from template
cp .env.example .env
nano .env  # Edit required values

# 3. Start services
docker-compose -f docker-compose.production.yml up -d

# 4. Verify health
curl http://localhost:8347/api/health

# 5. Visit: http://localhost:8347
```

**Full guide:** [DEPLOYMENT.md](./DEPLOYMENT.md#self-hosted-vps-deployment-30-minutes)

---

## 📋 Required Environment Variables

| Variable | Example | Where to get it |
|----------|---------|-----------------|
| `AI_PROVIDER` | `openai` | Choose: openai, claude, google, groq |
| `OPENAI_API_KEY` | `sk-proj-...` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `WHISK_API_TOKEN` | `Bearer ya29...` | DevTools → Network → Authorization header |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Your deployment URL |

---

## ✅ Verification

```bash
# Check health
curl https://your-app.com/api/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}

# Run full verification
./scripts/verify-deployment.sh https://your-app.com
```

---

## 🆘 Troubleshooting

### App won't start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs app
# or Railway: railway logs
```

### Database errors
```bash
# Verify connection
docker exec -it obsidian-postgres-prod psql -U obsidian -d obsidian_news -c "SELECT 1"
```

### Redis errors
```bash
# Test Redis
docker exec -it obsidian-redis-prod redis-cli --no-auth-warning -a YOUR_PASSWORD PING
```

---

## 📚 Full Documentation

- **Comprehensive Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md) (50+ pages)
- **Railway Guide:** [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) (Quick reference)
- **User Guide:** [USER_GUIDE.md](./USER_GUIDE.md) (Application usage)
- **Implementation:** [HOSTING_CONFIGURATION_SUMMARY.md](./HOSTING_CONFIGURATION_SUMMARY.md)

---

## 🔧 Useful Commands

### Docker
```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Stop services
docker-compose -f docker-compose.production.yml down

# Rebuild
docker-compose -f docker-compose.production.yml build --no-cache
```

### Railway CLI
```bash
# Install
npm i -g @railway/cli

# Login
railway login

# View logs
railway logs -f

# Shell access
railway shell
```

---

**Deployment time:** 5-30 minutes
**Difficulty:** Beginner to Intermediate
**Support:** See troubleshooting section in DEPLOYMENT.md
