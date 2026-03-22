#!/bin/bash

echo "🎬 Rendering video with word-level timestamps..."
echo ""

# Create render props with timestamps
npx tsx scripts/create-render-props.ts

echo ""
echo "🎥 Starting render (this will take 6-8 minutes)..."
echo ""

PROPS_FILE="$LOCALAPPDATA/Temp/render-props-final.json"

npx remotion render src/lib/remotion/index.ts NewsVideo ./tmp/test-with-timestamps.mp4 \
  --props="$PROPS_FILE" \
  --codec=h264 \
  --overwrite

if [ -f "./tmp/test-with-timestamps.mp4" ]; then
  echo ""
  echo "✅ RENDER COMPLETE!"
  echo "📹 Video: ./tmp/test-with-timestamps.mp4"
  ls -lh "./tmp/test-with-timestamps.mp4"

  echo ""
  echo "🔍 Running quality check..."
  bash scripts/detect-black-frames.sh "./tmp/test-with-timestamps.mp4"

  if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 VIDEO QUALITY VERIFIED - Ready for production!"
  else
    echo ""
    echo "⚠️  Quality check failed - review black frame detection output"
    exit 1
  fi
else
  echo ""
  echo "❌ Render failed"
  exit 1
fi
