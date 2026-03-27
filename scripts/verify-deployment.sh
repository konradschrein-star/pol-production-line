#!/bin/bash

# ================================
# Deployment Verification Script
# Obsidian News Desk Automation Pipeline
# ================================
#
# This script verifies that the deployment is working correctly.
# Run after deploying to production or starting Docker containers.
#
# Usage:
#   ./scripts/verify-deployment.sh [base_url]
#
# Examples:
#   ./scripts/verify-deployment.sh http://localhost:8347
#   ./scripts/verify-deployment.sh https://yourdomain.com

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default base URL
BASE_URL="${1:-http://localhost:8347}"

echo "================================"
echo "Deployment Verification"
echo "================================"
echo ""
echo "Target: $BASE_URL"
echo ""

# Function to check endpoint
check_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3

    echo -n "Checking $description... "

    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")

    if [ "$status_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code, expected $expected_status)"
        return 1
    fi
}

# Function to check JSON response
check_json_response() {
    local url=$1
    local description=$2

    echo -n "Checking $description... "

    response=$(curl -s "$url" --max-time 10 || echo "")

    if [ -z "$response" ]; then
        echo -e "${RED}✗ FAIL${NC} (No response)"
        return 1
    fi

    # Check if response is valid JSON
    if echo "$response" | jq . > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Response: $(echo "$response" | jq -c .)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Invalid JSON)"
        echo "  Response: $response"
        return 1
    fi
}

# Counter for passed tests
PASSED=0
TOTAL=0

# Test 1: Health endpoint
TOTAL=$((TOTAL + 1))
if check_json_response "$BASE_URL/api/health" "Health endpoint"; then
    PASSED=$((PASSED + 1))
fi
echo ""

# Test 2: Settings endpoint (GET)
TOTAL=$((TOTAL + 1))
if check_json_response "$BASE_URL/api/settings" "Settings endpoint"; then
    PASSED=$((PASSED + 1))
fi
echo ""

# Test 3: Jobs endpoint (GET)
TOTAL=$((TOTAL + 1))
if check_json_response "$BASE_URL/api/jobs" "Jobs list endpoint"; then
    PASSED=$((PASSED + 1))
fi
echo ""

# Test 4: Home page
TOTAL=$((TOTAL + 1))
if check_endpoint "$BASE_URL/" "200" "Home page"; then
    PASSED=$((PASSED + 1))
fi
echo ""

# Test 5: New broadcast page
TOTAL=$((TOTAL + 1))
if check_endpoint "$BASE_URL/new" "200" "New broadcast page"; then
    PASSED=$((PASSED + 1))
fi
echo ""

# Test 6: Settings page
TOTAL=$((TOTAL + 1))
if check_endpoint "$BASE_URL/settings" "200" "Settings page"; then
    PASSED=$((PASSED + 1))
fi
echo ""

# Docker-specific checks (only if running locally)
if [ "$BASE_URL" == "http://localhost:8347" ]; then
    echo "================================"
    echo "Docker Container Checks"
    echo "================================"
    echo ""

    # Check if Docker is running
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠ Docker not found - skipping container checks${NC}"
    else
        # Check if containers are running
        echo "Checking Docker containers..."

        if docker ps | grep -q "obsidian-postgres-prod"; then
            echo -e "${GREEN}✓${NC} PostgreSQL container running"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗${NC} PostgreSQL container not running"
        fi
        TOTAL=$((TOTAL + 1))

        if docker ps | grep -q "obsidian-redis-prod"; then
            echo -e "${GREEN}✓${NC} Redis container running"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗${NC} Redis container not running"
        fi
        TOTAL=$((TOTAL + 1))

        if docker ps | grep -q "obsidian-app-prod"; then
            echo -e "${GREEN}✓${NC} Application container running"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗${NC} Application container not running"
        fi
        TOTAL=$((TOTAL + 1))

        echo ""

        # Check container health
        echo "Checking container health..."

        postgres_health=$(docker inspect --format='{{.State.Health.Status}}' obsidian-postgres-prod 2>/dev/null || echo "unknown")
        if [ "$postgres_health" == "healthy" ]; then
            echo -e "${GREEN}✓${NC} PostgreSQL health: healthy"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗${NC} PostgreSQL health: $postgres_health"
        fi
        TOTAL=$((TOTAL + 1))

        redis_health=$(docker inspect --format='{{.State.Health.Status}}' obsidian-redis-prod 2>/dev/null || echo "unknown")
        if [ "$redis_health" == "healthy" ]; then
            echo -e "${GREEN}✓${NC} Redis health: healthy"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗${NC} Redis health: $redis_health"
        fi
        TOTAL=$((TOTAL + 1))

        app_health=$(docker inspect --format='{{.State.Health.Status}}' obsidian-app-prod 2>/dev/null || echo "unknown")
        if [ "$app_health" == "healthy" ]; then
            echo -e "${GREEN}✓${NC} Application health: healthy"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}✗${NC} Application health: $app_health"
        fi
        TOTAL=$((TOTAL + 1))
    fi

    echo ""
fi

# Summary
echo "================================"
echo "Summary"
echo "================================"
echo ""
echo "Passed: $PASSED / $TOTAL tests"
echo ""

if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Deployment is healthy and ready for use."
    exit 0
else
    FAILED=$((TOTAL - PASSED))
    echo -e "${RED}✗ $FAILED test(s) failed${NC}"
    echo ""
    echo "Please review the logs and fix any issues."
    echo ""
    echo "Useful debugging commands:"
    echo "  - View logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "  - Check health: curl $BASE_URL/api/health | jq"
    echo "  - Restart services: docker-compose -f docker-compose.production.yml restart"
    exit 1
fi
