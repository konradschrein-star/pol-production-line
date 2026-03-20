#!/bin/bash

# Phase 2 End-to-End Test Script
# This script tests the AI Script Analyst pipeline

echo "🧪 Phase 2: AI Script Analyst - End-to-End Test"
echo "================================================"
echo ""

# Step 1: Check Docker services
echo "📦 Step 1: Checking Docker services..."
docker-compose ps | grep -E "(postgres|redis)" | grep -E "Up.*healthy"
if [ $? -eq 0 ]; then
    echo "✅ Docker services are running"
else
    echo "❌ Docker services not running. Run: docker-compose up -d"
    exit 1
fi
echo ""

# Step 2: Check database
echo "💾 Step 2: Checking database..."
docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "\dt" | grep -E "(news_jobs|news_scenes)"
if [ $? -eq 0 ]; then
    echo "✅ Database tables exist"
else
    echo "❌ Database tables missing. Run: npm run init-db"
    exit 1
fi
echo ""

# Step 3: Start workers in background
echo "🔧 Step 3: Starting workers..."
npx tsx scripts/start-workers.ts > /tmp/phase2-workers.log 2>&1 &
WORKERS_PID=$!
echo "   Workers PID: $WORKERS_PID"
sleep 5

# Check if workers started
if ps -p $WORKERS_PID > /dev/null; then
    tail -10 /tmp/phase2-workers.log | grep "Connected to Redis"
    if [ $? -eq 0 ]; then
        echo "✅ Workers started and connected to Redis"
    else
        echo "❌ Workers failed to connect to Redis"
        kill $WORKERS_PID 2>/dev/null
        exit 1
    fi
else
    echo "❌ Workers failed to start"
    exit 1
fi
echo ""

# Step 4: Start Next.js dev server
echo "🌐 Step 4: Starting Next.js..."
npm run dev > /tmp/phase2-nextjs.log 2>&1 &
NEXTJS_PID=$!
echo "   Next.js PID: $NEXTJS_PID"
echo "   Waiting for Next.js to start (15 seconds)..."
sleep 15

# Check if Next.js is responding
curl -s http://localhost:3000 | grep -i "obsidian" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Next.js is running"
else
    echo "❌ Next.js failed to start"
    kill $WORKERS_PID $NEXTJS_PID 2>/dev/null
    exit 1
fi
echo ""

# Step 5: Send test request
echo "📤 Step 5: Sending test script to API..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "raw_script": "Federal Reserve Chair Jerome Powell announced today that inflation has cooled to 3.2 percent from its peak of 9.1 percent. The central bank may pause rate increases. Wall Street rallied with S&P 500 gaining 2.3 percent. Treasury yields dropped significantly. Mortgage rates could stabilize providing relief to homebuyers. Economists remain divided on whether more action is needed. The December meeting will provide crucial guidance on future monetary policy direction."
  }')

echo "$RESPONSE" | grep -q "success"
if [ $? -eq 0 ]; then
    JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Job created: $JOB_ID"
else
    echo "❌ API request failed"
    echo "Response: $RESPONSE"
    kill $WORKERS_PID $NEXTJS_PID 2>/dev/null
    exit 1
fi
echo ""

# Step 6: Wait for processing
echo "⏳ Step 6: Waiting for AI analysis (30 seconds)..."
sleep 30
echo ""

# Step 7: Check results
echo "📊 Step 7: Checking results in database..."
docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \
  "SELECT id, status, LENGTH(avatar_script) as avatar_len, (SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID') as scene_count FROM news_jobs WHERE id = '$JOB_ID';"

# Check if successful
STATUS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c \
  "SELECT status FROM news_jobs WHERE id = '$JOB_ID';")

if echo "$STATUS" | grep -q "generating_images"; then
    echo ""
    echo "✅ Phase 2 Test PASSED!"
    echo ""
    echo "📋 Results:"
    echo "   - Job status: generating_images"
    echo "   - Avatar script generated"
    echo "   - Scenes created and queued"
    echo ""
    echo "View scenes:"
    echo "docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \"SELECT scene_order, LEFT(ticker_headline, 50) as headline FROM news_scenes WHERE job_id = '$JOB_ID' ORDER BY scene_order;\""
elif echo "$STATUS" | grep -q "failed"; then
    echo ""
    echo "❌ Phase 2 Test FAILED"
    echo ""
    echo "Error message:"
    docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \
      "SELECT error_message FROM news_jobs WHERE id = '$JOB_ID';"
else
    echo ""
    echo "⏸️  Phase 2 Test INCOMPLETE"
    echo "   Job status: $STATUS"
    echo "   The job may still be processing. Wait longer or check logs."
fi
echo ""

# Step 8: Cleanup
echo "🧹 Step 8: Cleanup..."
echo "   Stopping workers (PID: $WORKERS_PID)..."
kill $WORKERS_PID 2>/dev/null
echo "   Stopping Next.js (PID: $NEXTJS_PID)..."
kill $NEXTJS_PID 2>/dev/null
sleep 2
echo "✅ Cleanup complete"
echo ""

echo "📝 Logs saved to:"
echo "   Workers: /tmp/phase2-workers.log"
echo "   Next.js: /tmp/phase2-nextjs.log"
echo ""
echo "🏁 Test complete!"
