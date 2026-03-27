#!/bin/bash
JOB_ID="$1"
echo "📹 Monitoring job: $JOB_ID"
echo "Goal: Complete video generation"
echo ""

for i in {1..60}; do
  sleep 5
  
  STATUS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT status FROM news_jobs WHERE id = '$JOB_ID'" | xargs)
  SCENES=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID'" | xargs)
  
  if [ "$STATUS" = "analyzing" ]; then
    echo "[${i}×5s] 🔍 Analyzing script..."
  elif [ "$STATUS" = "generating_images" ]; then
    COMPLETED=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT COUNT(*) FROM news_scenes WHERE job_id = '$JOB_ID' AND generation_status = 'completed'" | xargs)
    echo "[${i}×5s] 🎨 Generating images: $COMPLETED/$SCENES completed"
  elif [ "$STATUS" = "review_assets" ]; then
    echo ""
    echo "✅ Images complete! Job ready for avatar upload"
    echo "📋 Job ID: $JOB_ID"
    echo "🔗 Open UI: http://localhost:8347/"
    echo ""
    echo "Next steps:"
    echo "1. Upload avatar MP4 via UI"
    echo "2. Click 'COMPILE & RENDER'"
    echo "3. Wait ~2 minutes for video"
    exit 0
  elif [ "$STATUS" = "rendering" ]; then
    echo "[${i}×5s] 🎬 Rendering final video..."
  elif [ "$STATUS" = "completed" ]; then
    VIDEO=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT final_video_url FROM news_jobs WHERE id = '$JOB_ID'" | xargs)
    echo ""
    echo "🎉 VIDEO COMPLETE!"
    echo "📹 Location: C:\Users\konra\ObsidianNewsDesk\$VIDEO"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Job failed"
    exit 1
  fi
done

echo ""
echo "⏱️ Still processing after 5 minutes"
echo "Check UI: http://localhost:8347/"
