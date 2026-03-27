#!/bin/bash

# ================================
# Docker Quick Start Script
# Obsidian News Desk Automation Pipeline
# ================================
#
# This script helps you quickly start the application using Docker Compose.
# It checks prerequisites, builds images, and starts services.
#
# Usage:
#   ./scripts/docker-quickstart.sh [mode]
#
# Modes:
#   dev - Start development environment (docker-compose.yml)
#   prod - Start production environment (docker-compose.production.yml)
#
# Examples:
#   ./scripts/docker-quickstart.sh dev
#   ./scripts/docker-quickstart.sh prod

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default mode
MODE="${1:-dev}"

echo "================================"
echo "Docker Quick Start"
echo "================================"
echo ""

# Validate mode
if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
    echo -e "${RED}Error: Invalid mode '$MODE'${NC}"
    echo "Usage: $0 [dev|prod]"
    exit 1
fi

echo -e "${BLUE}Mode: $MODE${NC}"
echo ""

# Determine compose file
if [ "$MODE" == "prod" ]; then
    COMPOSE_FILE="docker-compose.production.yml"
    ENV_FILE=".env"
else
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env"
fi

echo "Using: $COMPOSE_FILE"
echo ""

# Check if Docker is installed
echo -n "Checking Docker installation... "
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ FAILED${NC}"
    echo ""
    echo "Docker is not installed. Please install Docker first:"
    echo "  https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ OK${NC}"

# Check if Docker Compose is installed
echo -n "Checking Docker Compose... "
if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ FAILED${NC}"
    echo ""
    echo "Docker Compose is not installed. Please install Docker Compose:"
    echo "  https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ OK${NC}"

# Check if Docker daemon is running
echo -n "Checking Docker daemon... "
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ FAILED${NC}"
    echo ""
    echo "Docker daemon is not running. Please start Docker."
    exit 1
fi
echo -e "${GREEN}✓ OK${NC}"

# Check if .env file exists
echo -n "Checking environment file... "
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo ""
    echo "Environment file '$ENV_FILE' not found."
    echo "Creating from .env.example..."
    echo ""

    if [ ! -f ".env.example" ]; then
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi

    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Edit .env and fill in required values before proceeding.${NC}"
    echo ""
    read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
else
    echo -e "${GREEN}✓ OK${NC}"
fi

echo ""
echo "================================"
echo "Starting Services"
echo "================================"
echo ""

# Stop existing containers (if any)
echo "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down &> /dev/null || true
echo ""

# Build images (production mode only)
if [ "$MODE" == "prod" ]; then
    echo "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    echo ""
fi

# Start services
echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "Waiting for services to become healthy..."
echo ""

# Wait for services to be healthy
MAX_WAIT=60  # Maximum wait time in seconds
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Check PostgreSQL health
    POSTGRES_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' obsidian-postgres-prod 2>/dev/null || docker inspect --format='{{.State.Health.Status}}' obsidian-postgres 2>/dev/null || echo "starting")

    # Check Redis health
    REDIS_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' obsidian-redis-prod 2>/dev/null || docker inspect --format='{{.State.Health.Status}}' obsidian-redis 2>/dev/null || echo "starting")

    # Check App health (if in production mode)
    if [ "$MODE" == "prod" ]; then
        APP_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' obsidian-app-prod 2>/dev/null || echo "starting")
    else
        APP_HEALTHY="healthy"  # No health check in dev mode
    fi

    # Display status
    echo -ne "\r  PostgreSQL: $POSTGRES_HEALTHY | Redis: $REDIS_HEALTHY"
    if [ "$MODE" == "prod" ]; then
        echo -ne " | App: $APP_HEALTHY"
    fi

    # Check if all services are healthy
    if [ "$POSTGRES_HEALTHY" == "healthy" ] && [ "$REDIS_HEALTHY" == "healthy" ] && [ "$APP_HEALTHY" == "healthy" ]; then
        echo ""
        echo ""
        echo -e "${GREEN}✓ All services are healthy!${NC}"
        break
    fi

    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo ""

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠ WARNING: Services did not become healthy within ${MAX_WAIT}s${NC}"
    echo ""
    echo "Check logs for errors:"
    echo "  docker compose -f $COMPOSE_FILE logs"
    echo ""
fi

# Display service status
echo "================================"
echo "Service Status"
echo "================================"
echo ""
docker compose -f "$COMPOSE_FILE" ps
echo ""

# Display access information
echo "================================"
echo "Access Information"
echo "================================"
echo ""

if [ "$MODE" == "prod" ]; then
    echo -e "${GREEN}Application:${NC} http://localhost:8347"
    echo -e "${GREEN}Health Check:${NC} http://localhost:8347/api/health"
    echo -e "${GREEN}PostgreSQL:${NC} localhost:5432"
    echo -e "${GREEN}Redis:${NC} localhost:6379"
else
    echo -e "${GREEN}Application:${NC} http://localhost:8347"
    echo -e "${GREEN}PostgreSQL:${NC} localhost:5432"
    echo -e "${GREEN}Redis:${NC} localhost:6379"
fi

echo ""

# Display useful commands
echo "================================"
echo "Useful Commands"
echo "================================"
echo ""
echo "View logs (all services):"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "View logs (specific service):"
echo "  docker compose -f $COMPOSE_FILE logs -f app"
echo ""
echo "Stop services:"
echo "  docker compose -f $COMPOSE_FILE down"
echo ""
echo "Restart services:"
echo "  docker compose -f $COMPOSE_FILE restart"
echo ""
echo "Check health:"
echo "  curl http://localhost:8347/api/health | jq"
echo ""

if [ "$MODE" == "dev" ]; then
    echo "Start development server:"
    echo "  npm run dev"
    echo ""
    echo "Start workers:"
    echo "  npm run workers"
    echo ""
fi

echo "================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "================================"
echo ""

# Ask if user wants to run verification
read -p "Run deployment verification tests? [y/N] " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    if [ -f "scripts/verify-deployment.sh" ]; then
        chmod +x scripts/verify-deployment.sh
        ./scripts/verify-deployment.sh http://localhost:8347
    else
        echo -e "${YELLOW}⚠ Verification script not found${NC}"
    fi
fi
