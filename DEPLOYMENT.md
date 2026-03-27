# Deployment Guide

Complete deployment instructions for **Obsidian News Desk Automation Pipeline**.

## Table of Contents

1. [Quick Start: Railway.app Deployment (5 minutes)](#quick-start-railwayapp-deployment-5-minutes)
2. [Self-Hosted VPS Deployment (30 minutes)](#self-hosted-vps-deployment-30-minutes)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Monitoring and Backups](#monitoring-and-backups)
5. [Troubleshooting](#troubleshooting)
6. [Scaling Considerations](#scaling-considerations)

---

## Quick Start: Railway.app Deployment (5 minutes)

Railway.app provides the fastest path to production with automatic provisioning of PostgreSQL and Redis.

### Prerequisites

- GitHub account
- Railway.app account (free tier available)
- API keys for AI providers (OpenAI, Anthropic, Google, or Groq)
- Google Whisk API token

### Step 1: Prepare Repository

1. Push your code to GitHub
2. Ensure `railway.json` and `Dockerfile` are in the repository root

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Railway will auto-detect the `railway.json` configuration

### Step 3: Add Database Services

Railway will prompt you to add services:

1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
   - Railway automatically sets `DATABASE_URL` environment variable

2. Click **"+ New"** → **"Database"** → **"Add Redis"**
   - Railway automatically sets `REDIS_URL` environment variable

### Step 4: Configure Environment Variables

In the Railway dashboard, go to **Variables** and add:

**Required:**
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.railway.app

# AI Provider (choose one)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Google Whisk
WHISK_API_TOKEN=Bearer YOUR_TOKEN_HERE
WHISK_IMAGE_MODEL=IMAGEN_3_5
```

**Optional:**
```
# Browser Automation
AUTO_WHISK_EXTENSION_ID=gedfnhdibkfgacmkbjgpfjihacalnlpn
DEFAULT_BROWSER=chrome

# HeyGen
HEYGEN_AUDIO_SAMPLE_RATE=48000
AVATAR_MODE=manual

# Remotion Performance
REMOTION_TIMEOUT_MS=300000
REMOTION_CONCURRENCY=4

# Whisk Rate Limiting
WHISK_CONCURRENCY=2
WHISK_MIN_CONCURRENCY=2
WHISK_MAX_CONCURRENCY=5
```

**Note:** Railway automatically populates `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from provisioned services. You don't need to set these manually.

### Step 5: Deploy

1. Click **"Deploy"**
2. Railway will:
   - Build the Docker image
   - Run database migrations (via `schema.sql`)
   - Start the application
   - Perform health checks (`/api/health`)

3. Monitor the **Deployments** tab for build progress
4. Once deployed, visit `https://your-app.railway.app`

### Step 6: Initialize Database

If the database schema wasn't automatically initialized:

1. Go to **Railway Dashboard** → **PostgreSQL** → **Data**
2. Click **Query** and paste the contents of `src/lib/db/schema.sql`
3. Execute the query

### Railway-Specific Notes

- **Storage:** Railway provides ephemeral storage. For persistent assets, configure external storage (Cloudflare R2, AWS S3).
- **Scaling:** Railway offers vertical scaling (more CPU/RAM) and horizontal scaling (multiple instances).
- **Logs:** Access real-time logs in the **Deployments** tab.
- **Custom Domain:** Add your domain in **Settings** → **Domains**.

---

## Self-Hosted VPS Deployment (30 minutes)

Deploy on any VPS (AWS EC2, DigitalOcean, Hetzner, Linode) using Docker Compose.

### Prerequisites

- Linux VPS (Ubuntu 22.04+ or Debian 11+ recommended)
- Minimum specs: 2 CPU cores, 4GB RAM, 20GB storage
- Recommended specs: 4 CPU cores, 8GB RAM, 50GB SSD
- Root or sudo access
- Domain name with DNS configured (optional but recommended)

### Step 1: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
# Install Git if not present
sudo apt install git -y

# Clone repository
cd /opt
sudo git clone https://github.com/your-username/obsidian-news-desk.git
cd obsidian-news-desk
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
sudo nano .env
```

**Required variables:**
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://obsidian:CHANGE_ME_STRONG_PASSWORD@postgres:5432/obsidian_news
POSTGRES_USER=obsidian
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=obsidian_news

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Google Whisk
WHISK_API_TOKEN=Bearer YOUR_TOKEN_HERE
```

**Security Note:** Change all default passwords before deploying!

### Step 4: Build and Start Services

```bash
# Build the application
sudo docker compose -f docker-compose.production.yml build

# Start all services
sudo docker compose -f docker-compose.production.yml up -d

# Verify services are running
sudo docker compose -f docker-compose.production.yml ps
```

Expected output:
```
NAME                       STATUS              PORTS
obsidian-postgres-prod     Up (healthy)        0.0.0.0:5432->5432/tcp
obsidian-redis-prod        Up (healthy)        0.0.0.0:6379->6379/tcp
obsidian-app-prod          Up (healthy)        0.0.0.0:8347->8347/tcp
```

### Step 5: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:8347/api/health

# Expected response:
# {"status":"healthy","services":{"database":"healthy","redis":"healthy"},"timestamp":"2026-03-22T...","uptime":123.45}

# View application logs
sudo docker compose -f docker-compose.production.yml logs -f app
```

### Step 6: Configure Reverse Proxy (Production)

For production, use Nginx or Caddy as a reverse proxy with HTTPS.

#### Option A: Nginx with Let's Encrypt

```bash
# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/obsidian-news-desk
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:8347;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for long-running requests (video rendering)
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:8347/api/health;
        access_log off;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/obsidian-news-desk /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Reload Nginx
sudo systemctl reload nginx
```

#### Option B: Caddy (Automatic HTTPS)

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Create Caddyfile
sudo nano /etc/caddy/Caddyfile
```

**Caddyfile:**
```
yourdomain.com {
    reverse_proxy localhost:8347
    encode gzip
}
```

```bash
# Reload Caddy
sudo systemctl reload caddy
```

### Step 7: Setup Systemd Service (Optional)

To automatically start services on boot:

```bash
sudo nano /etc/systemd/system/obsidian-news-desk.service
```

**Service file:**
```ini
[Unit]
Description=Obsidian News Desk Automation Pipeline
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/obsidian-news-desk
ExecStart=/usr/bin/docker compose -f docker-compose.production.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service
sudo systemctl enable obsidian-news-desk.service
sudo systemctl start obsidian-news-desk.service
```

---

## Environment Variables Reference

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment mode (`development` \| `production`) |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:8347` | Public URL of the application |
| `PORT` | No | `8347` | Port the application listens on |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `POSTGRES_USER` | Docker only | `obsidian` | PostgreSQL username |
| `POSTGRES_PASSWORD` | Docker only | - | PostgreSQL password |
| `POSTGRES_DB` | Docker only | `obsidian_news` | PostgreSQL database name |

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | Yes | `localhost` | Redis server hostname |
| `REDIS_PORT` | Yes | `6379` | Redis server port |
| `REDIS_PASSWORD` | Yes | - | Redis authentication password |

### AI Providers

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | Yes | `openai` | AI provider (`openai` \| `claude` \| `google` \| `groq`) |
| `OPENAI_API_KEY` | If `AI_PROVIDER=openai` | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | If `AI_PROVIDER=claude` | - | Anthropic Claude API key |
| `GOOGLE_AI_API_KEY` | If `AI_PROVIDER=google` | - | Google AI API key |
| `GROQ_API_KEY` | If `AI_PROVIDER=groq` | - | Groq API key |

### Google Whisk

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WHISK_API_TOKEN` | Yes | - | Google Whisk Bearer token |
| `WHISK_IMAGE_MODEL` | No | `IMAGEN_3_5` | Image model (`IMAGEN_3_5` \| `IMAGEN_4`) |
| `WHISK_CONCURRENCY` | No | `2` | Initial concurrency level |
| `WHISK_MIN_CONCURRENCY` | No | `2` | Minimum adaptive concurrency |
| `WHISK_MAX_CONCURRENCY` | No | `5` | Maximum adaptive concurrency |

### Browser Automation

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTO_WHISK_EXTENSION_ID` | No | - | Chrome extension ID for Auto Whisk |
| `DEFAULT_BROWSER` | No | `chrome` | Default browser (`chrome` \| `edge` \| `chromium`) |
| `BROWSER_EXECUTABLE_PATH` | No | - | Custom browser executable path |
| `PLAYWRIGHT_USER_DATA_DIR` | No | `./playwright-data` | Persistent browser profile directory |

### HeyGen

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HEYGEN_AUDIO_SAMPLE_RATE` | No | `48000` | Audio sample rate for HeyGen |
| `AVATAR_MODE` | No | `manual` | Avatar generation mode (`manual` \| `automated`) |
| `HEYGEN_PROFILE_PATH` | If `AVATAR_MODE=automated` | - | HeyGen Chrome profile path |
| `PYTHON_EXECUTABLE` | If `AVATAR_MODE=automated` | `python` | Python executable path |

### Remotion

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REMOTION_TIMEOUT_MS` | No | `300000` | Rendering timeout in milliseconds |
| `REMOTION_CONCURRENCY` | No | `4` | Number of parallel rendering threads |
| `REMOTION_BUNDLE_CACHE_DIR` | No | `./tmp/remotion-cache` | Bundle cache directory |

---

## Monitoring and Backups

### Health Monitoring

The application exposes a health check endpoint at `/api/health`:

```bash
# Check health status
curl http://localhost:8347/api/health
```

**Response format:**
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  },
  "timestamp": "2026-03-22T10:30:00.000Z",
  "uptime": 3600.5
}
```

**Status codes:**
- `200`: Application is healthy or degraded (one service down)
- `503`: Application is unhealthy (both services down)

### Uptime Monitoring

Integrate with uptime monitoring services:

- **UptimeRobot**: Free tier with 5-minute intervals
- **Pingdom**: Enterprise-grade monitoring
- **Better Uptime**: Developer-friendly with status pages

Configure monitors to:
- Check `/api/health` every 1-5 minutes
- Alert on non-200 status codes
- Alert on response time > 5 seconds

### Application Logs

**Docker Compose:**
```bash
# View all logs
sudo docker compose -f docker-compose.production.yml logs -f

# View specific service
sudo docker compose -f docker-compose.production.yml logs -f app

# View last 100 lines
sudo docker compose -f docker-compose.production.yml logs --tail=100 app
```

**Railway:**
- Logs are available in the **Deployments** tab
- Use Railway CLI: `railway logs`

### Database Backups

**Automated daily backups (Docker):**

```bash
# Create backup script
sudo nano /opt/obsidian-news-desk/backup.sh
```

**Backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/obsidian-news-desk"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="obsidian-postgres-prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec $POSTGRES_CONTAINER pg_dump -U obsidian obsidian_news | gzip > $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz

# Backup Redis (optional)
docker exec obsidian-redis-prod redis-cli --no-auth-warning -a obsidian_redis_password SAVE
docker cp obsidian-redis-prod:/data/dump.rdb $BACKUP_DIR/redis_backup_$TIMESTAMP.rdb

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
```

```bash
# Make executable
sudo chmod +x /opt/obsidian-news-desk/backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e

# Add line:
0 2 * * * /opt/obsidian-news-desk/backup.sh >> /var/log/obsidian-backup.log 2>&1
```

**Restore from backup:**
```bash
# Restore database
gunzip -c /opt/backups/obsidian-news-desk/db_backup_TIMESTAMP.sql.gz | docker exec -i obsidian-postgres-prod psql -U obsidian obsidian_news

# Restore Redis
docker cp /opt/backups/obsidian-news-desk/redis_backup_TIMESTAMP.rdb obsidian-redis-prod:/data/dump.rdb
docker restart obsidian-redis-prod
```

### Storage Management

Application generates large video files. Monitor storage usage:

```bash
# Check Docker volume sizes
docker system df -v

# Check application storage
du -sh /var/lib/docker/volumes/obsidian-app-storage

# Clean up old assets (manual)
# - Navigate to storage volume
# - Delete old images/videos beyond retention period
```

**Automated cleanup (optional):**
```bash
# Create cleanup script
sudo nano /opt/obsidian-news-desk/cleanup.sh
```

```bash
#!/bin/bash
STORAGE_DIR="/var/lib/docker/volumes/obsidian-app-storage/_data"

# Delete videos older than 90 days
find $STORAGE_DIR/videos -name "*.mp4" -mtime +90 -delete

# Delete images older than 60 days
find $STORAGE_DIR/images -name "*.jpg" -mtime +60 -delete
find $STORAGE_DIR/images -name "*.png" -mtime +60 -delete

echo "Cleanup completed: $(date)"
```

```bash
# Run weekly on Sundays at 3 AM
0 3 * * 0 /opt/obsidian-news-desk/cleanup.sh >> /var/log/obsidian-cleanup.log 2>&1
```

---

## Troubleshooting

### Application Won't Start

**Symptom:** Container exits immediately after starting

**Solutions:**

1. **Check logs:**
   ```bash
   docker compose -f docker-compose.production.yml logs app
   ```

2. **Verify environment variables:**
   ```bash
   docker compose -f docker-compose.production.yml config
   ```

3. **Test database connection:**
   ```bash
   docker exec -it obsidian-postgres-prod psql -U obsidian -d obsidian_news -c "SELECT 1"
   ```

4. **Test Redis connection:**
   ```bash
   docker exec -it obsidian-redis-prod redis-cli --no-auth-warning -a obsidian_redis_password PING
   ```

### Database Connection Errors

**Symptom:** `ECONNREFUSED` or `connection timeout`

**Solutions:**

1. **Verify PostgreSQL is running:**
   ```bash
   docker compose -f docker-compose.production.yml ps postgres
   ```

2. **Check DATABASE_URL format:**
   ```
   postgresql://username:password@host:port/database
   ```

3. **Verify network connectivity:**
   ```bash
   docker network inspect obsidian-network
   ```

4. **Reset database container:**
   ```bash
   docker compose -f docker-compose.production.yml restart postgres
   ```

### Redis Connection Errors

**Symptom:** `ECONNREFUSED` or `NOAUTH Authentication required`

**Solutions:**

1. **Verify Redis is running:**
   ```bash
   docker compose -f docker-compose.production.yml ps redis
   ```

2. **Test authentication:**
   ```bash
   docker exec -it obsidian-redis-prod redis-cli --no-auth-warning -a YOUR_PASSWORD PING
   ```

3. **Check password in environment:**
   ```bash
   echo $REDIS_PASSWORD
   ```

### Video Rendering Failures

**Symptom:** Jobs stuck in `rendering` state

**Solutions:**

1. **Check Remotion logs:**
   ```bash
   docker compose -f docker-compose.production.yml logs app | grep remotion
   ```

2. **Verify FFmpeg is installed:**
   ```bash
   docker exec obsidian-app-prod ffmpeg -version
   ```

3. **Increase timeout:**
   - Set `REMOTION_TIMEOUT_MS=600000` (10 minutes)

4. **Check available disk space:**
   ```bash
   df -h
   ```

5. **Verify Chromium is available (for Playwright):**
   ```bash
   docker exec obsidian-app-prod chromium-browser --version
   ```

### Out of Memory Errors

**Symptom:** `JavaScript heap out of memory`

**Solutions:**

1. **Increase Node.js memory limit:**
   ```bash
   # Add to docker-compose.production.yml under app.environment
   NODE_OPTIONS: "--max-old-space-size=4096"
   ```

2. **Reduce concurrency:**
   ```bash
   REMOTION_CONCURRENCY=2
   WHISK_CONCURRENCY=1
   ```

3. **Increase Docker memory limits:**
   ```yaml
   # In docker-compose.production.yml
   services:
     app:
       deploy:
         resources:
           limits:
             memory: 4G
   ```

### Image Generation Failures

**Symptom:** Scenes stuck in `generating_images` state

**Solutions:**

1. **Verify Whisk API token:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://labs.google.com/api/whisk/v1/status
   ```

2. **Check rate limits:**
   - Reduce `WHISK_CONCURRENCY` to 1
   - Increase `WHISK_MIN_CONCURRENCY` to avoid aggressive scaling

3. **Check browser automation:**
   ```bash
   docker compose -f docker-compose.production.yml logs app | grep playwright
   ```

### SSL Certificate Errors

**Symptom:** `ERR_CERT_AUTHORITY_INVALID`

**Solutions:**

1. **Renew Let's Encrypt certificate:**
   ```bash
   sudo certbot renew
   sudo systemctl reload nginx
   ```

2. **Verify DNS propagation:**
   ```bash
   dig yourdomain.com
   ```

3. **Check certificate expiration:**
   ```bash
   sudo certbot certificates
   ```

---

## Scaling Considerations

### Vertical Scaling

Increase resources for a single instance:

- **CPU:** 4+ cores recommended for parallel rendering
- **RAM:** 8GB minimum, 16GB recommended for high concurrency
- **Storage:** SSD recommended, 100GB+ for production workloads

**Railway:** Upgrade plan in **Settings** → **Resources**

**VPS:** Resize instance via provider dashboard

### Horizontal Scaling

Run multiple instances behind a load balancer:

1. **Stateless Application:** Next.js app is stateless (session data in Redis/DB)
2. **Shared Storage:** Use external storage (S3, R2) for assets
3. **Queue Workers:** Run dedicated worker instances

**Architecture:**
```
[Load Balancer] → [App 1] → [Shared Redis]
                  [App 2] → [Shared Postgres]
                  [App 3] → [Shared Storage]
```

**Docker Compose scaling:**
```bash
docker compose -f docker-compose.production.yml up -d --scale app=3
```

**Note:** Requires load balancer (Nginx, HAProxy, AWS ALB) to distribute traffic.

### Database Scaling

**PostgreSQL:**
- Use managed database (AWS RDS, Railway PostgreSQL)
- Enable connection pooling (PgBouncer)
- Optimize queries with indexes
- Consider read replicas for analytics

**Redis:**
- Use managed Redis (Railway, AWS ElastiCache)
- Enable persistence (AOF) for data durability
- Consider Redis Cluster for high availability

### Worker Isolation

Separate workers from web app for better resource management:

1. **Uncomment worker service** in `docker-compose.production.yml`
2. **Scale workers independently:**
   ```bash
   docker compose -f docker-compose.production.yml up -d --scale workers=5
   ```

3. **Monitor queue metrics:**
   - Active jobs
   - Wait time
   - Throughput

### CDN Integration

Serve static assets via CDN:

- **Cloudflare:** Free tier with unlimited bandwidth
- **AWS CloudFront:** Global edge network
- **Fastly:** Real-time analytics

**Configuration:**
1. Upload videos to R2/S3
2. Configure CDN to cache video files
3. Update `final_video_url` to use CDN URL

---

## Security Considerations

### Environment Variables

- **Never commit `.env` files** to version control
- **Use secrets management** (AWS Secrets Manager, Railway Secrets)
- **Rotate API keys** regularly
- **Use strong passwords** (20+ characters, alphanumeric + symbols)

### Network Security

- **Firewall rules:** Only expose necessary ports (443, 80)
- **Fail2Ban:** Protect against brute force attacks
- **VPN/SSH hardening:** Disable password authentication, use SSH keys

### Application Security

- **CORS:** Configure allowed origins in production
- **Rate limiting:** Implement API rate limits
- **Input validation:** Validate all user inputs
- **SQL injection:** Use parameterized queries (already implemented)

### SSL/TLS

- **Use HTTPS only** in production
- **HSTS:** Enforce HTTPS with Strict-Transport-Security header
- **Certificate monitoring:** Set up expiration alerts

---

## Support

For issues or questions:

1. **Check logs first:** Most issues are visible in application logs
2. **Review this guide:** Common solutions are documented above
3. **GitHub Issues:** Report bugs at https://github.com/your-username/obsidian-news-desk/issues
4. **Documentation:** See `USER_GUIDE.md` for application usage

---

**Deployment Checklist:**

- [ ] Environment variables configured
- [ ] Database initialized with schema
- [ ] Health check endpoint responding
- [ ] SSL certificate installed (production)
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Logs accessible
- [ ] Firewall rules configured
- [ ] Test video rendering end-to-end
- [ ] Document custom configuration for team

---

**Version:** 1.0.0 (March 2026)
**Maintainer:** Obsidian News Desk Team
