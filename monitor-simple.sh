#!/bin/bash

JOB_ID="61d374c9-8bf7-45f0-bfd6-c10b97de5196"

echo "🎬 Monitoring Job: $JOB_ID"
echo "======================================"

while true; do
  STATUS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT status FROM news_jobs WHERE id = '$JOB_ID';" | tr -d ' ')
  
  echo "[$(date +%H:%M:%S)] Status: $STATUS"
  
  if [ "$STATUS" = "generating_images" ]; then
    PROGRESS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT generation_status, COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID' GROUP BY generation_status;")
    echo "   Progress: $PROGRESS"
  fi
  
  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅ JOB COMPLETED!"
    echo "======================================"
    docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "SELECT final_video_url, thumbnail_url FROM news_jobs WHERE id = '$JOB_ID';"
    break
  fi
  
  if [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ JOB FAILED"
    docker exec obsidian-postgres psql -U obsidian -d obsidian_news -c "SELECT error_message FROM news_jobs WHERE id = '$JOB_ID';"
    break
  fi
  
  sleep 5
done
