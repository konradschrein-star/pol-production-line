#!/bin/bash
JOB_ID="$1"
echo "🔍 Monitoring job: $JOB_ID"
echo ""

for i in {1..30}; do
  sleep 2
  
  STATUS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT status FROM news_jobs WHERE id = '$JOB_ID'" | xargs)
  SCENES=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID'" | xargs)
  
  echo "[${i}0s] Status: $STATUS | Scenes: $SCENES"
  
  if [ "$STATUS" = "generating_images" ]; then
    echo ""
    echo "✅ Analysis complete! Checking image generation..."
    echo ""
    
    for j in {1..20}; do
      sleep 3
      
      COMPLETED=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID' AND generation_status = 'completed'" | xargs)
      FAILED=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID' AND generation_status = 'failed'" | xargs)
      
      echo "[$(($j * 3))s after analysis] Images: $COMPLETED/$SCENES completed, $FAILED failed"
      
      if [ "$COMPLETED" -gt "0" ]; then
        echo ""
        echo "✅ SUCCESS! Database fix verified - images generating without errors!"
        exit 0
      fi
      
      if [ "$FAILED" -eq "$SCENES" ]; then
        echo ""
        echo "❌ All images failed - checking for database errors..."
        docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "SELECT error_message FROM news_scenes WHERE job_id = '$JOB_ID' AND generation_status = 'failed' LIMIT 1"
        exit 1
      fi
    done
    break
  fi
  
  if [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Job failed during analysis"
    exit 1
  fi
done

echo ""
echo "⏱️  Monitoring timeout - check job manually"
echo "Job ID: $JOB_ID"
