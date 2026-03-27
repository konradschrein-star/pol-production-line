#!/bin/bash

# Integration Test Suite for Obsidian News Desk
# Tests database schema, API endpoints, Redis connectivity, and environment variables

set -e  # Exit on error

echo "========================================="
echo "  Integration Test Suite"
echo "  Obsidian News Desk"
echo "========================================="
echo ""

# Load environment variables
if [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
fi

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# ===================================
# Test 1: Database Schema
# ===================================
echo "📊 Test 1: Verifying database schema..."

# Check retry_count column
RETRY_COL=$(psql $DATABASE_URL -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='news_scenes' AND column_name='retry_count';")
if [ -z "$RETRY_COL" ]; then
  echo "   ❌ FAILED: retry_count column missing from news_scenes"
  ((TESTS_FAILED++))
else
  echo "   ✅ PASS: retry_count column exists"
  ((TESTS_PASSED++))
fi

# Check failed_permanently column
FAILED_COL=$(psql $DATABASE_URL -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='news_scenes' AND column_name='failed_permanently';")
if [ -z "$FAILED_COL" ]; then
  echo "   ❌ FAILED: failed_permanently column missing from news_scenes"
  ((TESTS_FAILED++))
else
  echo "   ✅ PASS: failed_permanently column exists"
  ((TESTS_PASSED++))
fi

# Check word_timestamps column
WORD_TS_COL=$(psql $DATABASE_URL -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='news_jobs' AND column_name='word_timestamps';")
if [ -z "$WORD_TS_COL" ]; then
  echo "   ❌ FAILED: word_timestamps column missing from news_jobs"
  ((TESTS_FAILED++))
else
  echo "   ✅ PASS: word_timestamps column exists"
  ((TESTS_PASSED++))
fi

echo ""

# ===================================
# Test 2: API Endpoints
# ===================================
echo "🌐 Test 2: Testing API endpoints..."

# Test GET /api/jobs
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8347/api/jobs?page=1&limit=10)
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ PASS: GET /api/jobs responds with 200"
  ((TESTS_PASSED++))
else
  echo "   ❌ FAILED: GET /api/jobs returned $HTTP_CODE"
  ((TESTS_FAILED++))
fi

# Test settings endpoint without auth (should fail with 401)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8347/api/settings -H "Content-Type: application/json" -d '{}')
if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✅ PASS: POST /api/settings requires authentication"
  ((TESTS_PASSED++))
else
  echo "   ❌ FAILED: POST /api/settings returned $HTTP_CODE (expected 401)"
  ((TESTS_FAILED++))
fi

echo ""

# ===================================
# Test 3: Redis Connectivity
# ===================================
echo "🔴 Test 3: Testing Redis connectivity..."

REDIS_PING=$(redis-cli -h localhost -p 6379 -a $REDIS_PASSWORD PING 2>/dev/null || echo "FAILED")
if [ "$REDIS_PING" = "PONG" ]; then
  echo "   ✅ PASS: Redis connection successful"
  ((TESTS_PASSED++))
else
  echo "   ❌ FAILED: Redis connection failed"
  ((TESTS_FAILED++))
fi

echo ""

# ===================================
# Test 4: Environment Variables
# ===================================
echo "⚙️  Test 4: Checking environment variables..."

if [ -n "$LOCAL_STORAGE_ROOT" ]; then
  echo "   ✅ PASS: LOCAL_STORAGE_ROOT is set ($LOCAL_STORAGE_ROOT)"
  ((TESTS_PASSED++))
else
  echo "   ❌ FAILED: LOCAL_STORAGE_ROOT is not set"
  ((TESTS_FAILED++))
fi

if [ -n "$DATABASE_URL" ]; then
  echo "   ✅ PASS: DATABASE_URL is set"
  ((TESTS_PASSED++))
else
  echo "   ❌ FAILED: DATABASE_URL is not set"
  ((TESTS_FAILED++))
fi

if [ -n "$REDIS_PASSWORD" ]; then
  echo "   ✅ PASS: REDIS_PASSWORD is set"
  ((TESTS_PASSED++))
else
  echo "   ❌ FAILED: REDIS_PASSWORD is not set"
  ((TESTS_FAILED++))
fi

if [ -n "$ADMIN_API_KEY" ]; then
  echo "   ✅ PASS: ADMIN_API_KEY is set"
  ((TESTS_PASSED++))
else
  echo "   ❌ FAILED: ADMIN_API_KEY is not set"
  ((TESTS_FAILED++))
fi

echo ""

# ===================================
# Summary
# ===================================
echo "========================================="
echo "  Test Summary"
echo "========================================="
echo "   ✅ Passed: $TESTS_PASSED"
echo "   ❌ Failed: $TESTS_FAILED"
echo "========================================="
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 All tests passed successfully!"
  exit 0
else
  echo "⚠️  Some tests failed. Please review the output above."
  exit 1
fi
