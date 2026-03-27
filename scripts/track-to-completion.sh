#!/bin/bash
# Track job to completion with automatic progress updates

JOB_ID="5424cf36-7cf2-4299-bad9-1605c0ae9ec7"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  TRACKING JOB TO COMPLETION                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Job ID: $JOB_ID"
echo "Started: $(date '+%H:%M:%S')"
echo ""

while true; do
  # Get job status
  STATUS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT status FROM news_jobs WHERE id = '$JOB_ID';" | tr -d ' ')

  # Get scene progress
  PROGRESS=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN generation_status = 'generating' THEN 1 END) as generating
    FROM news_scenes WHERE job_id = '$JOB_ID';" | tr -d ' ')

  TOTAL=$(echo "$PROGRESS" | cut -d'|' -f1)
  COMPLETED=$(echo "$PROGRESS" | cut -d'|' -f2)
  GENERATING=$(echo "$PROGRESS" | cut -d'|' -f3)

  # Clear and display
  clear
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  TRACKING JOB TO COMPLETION                                ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "🆔 Job ID: $JOB_ID"
  echo "⏰ Time: $(date '+%H:%M:%S')"
  echo ""
  echo "📊 Status: $STATUS"
  echo ""

  if [ "$STATUS" = "generating_images" ]; then
    echo "🎨 Image Generation:"
    echo "   ✅ Completed: $COMPLETED/$TOTAL"
    echo "   ⏳ Generating: $GENERATING"
    echo "   ⏸️  Pending: $((TOTAL - COMPLETED - GENERATING))"

    # Progress bar
    PERCENT=$((COMPLETED * 100 / TOTAL))
    BAR_LENGTH=$((PERCENT / 5))
    printf "   ["
    for i in $(seq 1 20); do
      if [ $i -le $BAR_LENGTH ]; then
        printf "█"
      else
        printf "░"
      fi
    done
    printf "] %d%%\n" $PERCENT

  elif [ "$STATUS" = "rendering" ]; then
    echo "🎬 Rendering final video..."
    echo "   (This takes 2-3 minutes)"

  elif [ "$STATUS" = "completed" ]; then
    echo "✅ JOB COMPLETED!"
    echo ""
    echo "📹 Video ready at:"
    echo "   obsidian-news-desk/tmp/$JOB_ID.mp4"
    echo ""
    break

  elif [ "$STATUS" = "failed" ]; then
    echo "❌ JOB FAILED"
    ERROR=$(docker exec obsidian-postgres psql -U obsidian -d obsidian_news -t -c "SELECT error_message FROM news_jobs WHERE id = '$JOB_ID';")
    echo "   Error: $ERROR"
    break
  fi

  echo ""
  echo "⏱️  Next update in 10 seconds... (Ctrl+C to stop monitoring)"

  sleep 10
done

echo ""
echo "Monitoring complete at $(date '+%H:%M:%S')"
