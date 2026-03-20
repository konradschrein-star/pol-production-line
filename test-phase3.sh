#!/bin/bash

# Phase 3 End-to-End Test Script
# Tests the complete pipeline: AI Analysis + Image Generation

echo "🧪 Phase 3: Complete Pipeline Test (AI + Images)"
echo "=================================================="
echo ""

# Step 1: Check prerequisites
echo "📦 Step 1: Checking prerequisites..."

# Check Docker
docker-compose ps | grep -E "(postgres|redis)" | grep -E "Up.*healthy" > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Docker services not running. Run: docker-compose up -d"
    exit 1
fi
echo "✅ Docker services running"

# Check Auto Whisk extension
echo ""
echo "⚠️  IMPORTANT: Before continuing, ensure:"
echo "   1. Auto Whisk extension is installed in Chrome/Edge"
echo "   2. You're signed in to Google account in the extension"
echo "   3. R2_PUBLIC_URL is configured in .env"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."

# Step 2: Start workers
echo ""
echo "🔧 Step 2: Starting workers..."
npx tsx scripts/start-workers.ts > /tmp/phase3-workers.log 2>&1 &
WORKERS_PID=$!
echo "   Workers PID: $WORKERS_PID"
sleep 6

if ps -p $WORKERS_PID > /dev/null; then
    echo "✅ Workers started"
else
    echo "❌ Workers failed to start"
    exit 1
fi

# Step 3: Start Next.js
echo ""
echo "🌐 Step 3: Starting Next.js..."
npm run dev > /tmp/phase3-nextjs.log 2>&1 &
NEXTJS_PID=$!
echo "   Next.js PID: $NEXTJS_PID"
echo "   Waiting for startup (15 seconds)..."
sleep 15

curl -s http://localhost:3000 | grep -i "obsidian" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Next.js is running"
else
    echo "❌ Next.js failed to start"
    kill $WORKERS_PID $NEXTJS_PID 2>/dev/null
    exit 1
fi

# Step 4: Create test job
echo ""
echo "📤 Step 4: Creating test job..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "raw_script": "Breaking: Federal Reserve announces policy shift. Chair Powell signals pause in rate hikes as inflation cools to 3.2 percent. Markets rally with S&P 500 gaining 2.3 percent. Treasury yields drop sharply. Economists divided on next steps. Mortgage rates may stabilize, helping homebuyers."
  }')

JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "❌ Failed to create job"
    echo "Response: $RESPONSE"
    kill $WORKERS_PID $NEXTJS_PID 2>/dev/null
    exit 1
fi

echo "✅ Job created: $JOB_ID"

# Step 5: Wait for AI analysis
echo ""
echo "⏳ Step 5: Waiting for AI analysis (30 seconds)..."
sleep 30

# Check if scenes were created
SCENE_COUNT=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c \
  "SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID';")

echo "   Scenes created: $SCENE_COUNT"

if [ "$SCENE_COUNT" -lt 1 ]; then
    echo "❌ No scenes created. Check AI analysis."
    kill $WORKERS_PID $NEXTJS_PID 2>/dev/null
    exit 1
fi

echo "✅ AI analysis complete"

# Step 6: Monitor image generation
echo ""
echo "🖼️ Step 6: Monitoring image generation..."
echo "   This will take ~60 seconds per scene"
echo "   You should see browser windows opening automatically"
echo ""

MAX_WAIT=600  # 10 minutes
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Check completed scenes
    COMPLETED=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c \
      "SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID' AND generation_status = 'completed';")

    echo "   Progress: $COMPLETED / $SCENE_COUNT scenes complete (${ELAPSED}s elapsed)"

    # Check if all complete
    if [ "$COMPLETED" -eq "$SCENE_COUNT" ]; then
        echo ""
        echo "✅ All images generated!"
        break
    fi

    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ "$COMPLETED" -ne "$SCENE_COUNT" ]; then
    echo ""
    echo "⏸️  Image generation taking longer than expected"
    echo "   Completed: $COMPLETED / $SCENE_COUNT"
    echo "   Check logs: tail -f /tmp/phase3-workers.log"
fi

# Step 7: Check job status
echo ""
echo "📊 Step 7: Checking final job status..."
JOB_STATUS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c \
  "SELECT status FROM news_jobs WHERE id = '$JOB_ID';")

echo "   Job status: $JOB_STATUS"

if echo "$JOB_STATUS" | grep -q "review_assets"; then
    echo ""
    echo "✅ Phase 3 Test PASSED!"
    echo ""
    echo "📋 Summary:"
    echo "   - Job ID: $JOB_ID"
    echo "   - Status: review_assets (ready for human review)"
    echo "   - Scenes: $SCENE_COUNT"
    echo "   - All images generated and uploaded to R2"
    echo ""
    echo "View images:"
    docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \
      "SELECT scene_order, LEFT(ticker_headline, 40) as headline, LEFT(image_url, 60) as image_url FROM news_scenes WHERE job_id = '$JOB_ID' ORDER BY scene_order;"
elif echo "$JOB_STATUS" | grep -q "generating_images"; then
    echo ""
    echo "⏸️  Phase 3 Test INCOMPLETE"
    echo "   Some scenes are still generating. Wait longer or check errors."
    echo ""
    echo "Check scene status:"
    docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \
      "SELECT scene_order, generation_status, error_message FROM news_scenes WHERE job_id = '$JOB_ID' ORDER BY scene_order;"
else
    echo ""
    echo "❌ Phase 3 Test FAILED"
    echo "   Unexpected job status: $JOB_STATUS"
    echo ""
    docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c \
      "SELECT error_message FROM news_jobs WHERE id = '$JOB_ID';"
fi

# Step 8: Cleanup
echo ""
echo "🧹 Step 8: Cleanup..."
echo "   Stopping workers (PID: $WORKERS_PID)..."
kill $WORKERS_PID 2>/dev/null
echo "   Stopping Next.js (PID: $NEXTJS_PID)..."
kill $NEXTJS_PID 2>/dev/null
sleep 2
echo "✅ Cleanup complete"

echo ""
echo "📝 Logs saved to:"
echo "   Workers: /tmp/phase3-workers.log"
echo "   Next.js: /tmp/phase3-nextjs.log"
echo ""
echo "🏁 Test complete!"
