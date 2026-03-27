# ================================
# Multi-Stage Production Dockerfile
# Obsidian News Desk Automation Pipeline
# ================================

# --------------------------------
# Stage 1: Dependencies
# --------------------------------
FROM node:20-alpine AS deps

# Install system dependencies required for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (use npm ci for reproducible builds)
RUN npm ci --omit=dev --legacy-peer-deps

# --------------------------------
# Stage 2: Builder
# --------------------------------
FROM node:20-alpine AS builder

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# --------------------------------
# Stage 3: Runner (Production)
# --------------------------------
FROM node:20-alpine AS runner

# Install runtime dependencies
# - ffmpeg: Required for Remotion video rendering
# - chromium: Required for Playwright browser automation
# - python3: Optional, for HeyGen automation
RUN apk add --no-cache \
    libc6-compat \
    ffmpeg \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    py3-pip \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Tell Playwright to use the system-installed Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy Next.js build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy additional required files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/lib/db/schema.sql ./src/lib/db/schema.sql

# Create directories for local storage
RUN mkdir -p /app/storage/images /app/storage/avatars /app/storage/videos /app/tmp/remotion-cache && \
    chown -R nextjs:nodejs /app/storage /app/tmp

# Install production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8347

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8347/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "server.js"]
