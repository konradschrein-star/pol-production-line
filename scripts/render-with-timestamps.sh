#!/bin/bash

echo "🎬 Rendering video with proper word-level timestamps..."
echo ""

# Load word timestamps
WORD_TIMESTAMPS=$(cat /tmp/word-timestamps.json)

# Create render props with timestamps
cat > /tmp/render-props-fixed.json << 'EOFPROPS'
{
  "avatarMp4Url": "/avatars/avatar_1774148522174.mp4",
  "avatarDurationSeconds": 99,
  "wordTimestamps": WORD_TIMESTAMPS_PLACEHOLDER,
  "scenes": [
    {"id": "1", "image_url": "/images/60ccd0a3-fa94-4ea4-9c8c-2d0dbdbea4fa.jpg", "ticker_headline": "SENATE PASSES HISTORIC CLIMATE LEGISLATION", "scene_order": 1},
    {"id": "2", "image_url": "/images/3691f99b-ddc7-460e-a654-bf66c5e829eb.jpg", "ticker_headline": "$69 BILLION FOR GREEN TECH", "scene_order": 2},
    {"id": "3", "image_url": "/images/e532b10d-a8cf-4471-90d1-d212edb9636f.jpg", "ticker_headline": "NARROW VOTE: 51-50 IN SENATE", "scene_order": 3},
    {"id": "4", "image_url": "/images/1ce05f95-2da0-416f-a360-109e7716a80f.jpg", "ticker_headline": "ACTIVISTS CELEBRATE", "scene_order": 4},
    {"id": "5", "image_url": "/images/066b83a8-db90-441f-9d5d-35feeff85247.jpg", "ticker_headline": "40% CARBON REDUCTION BY 2030", "scene_order": 5},
    {"id": "6", "image_url": "/images/image-generation-failed.jpg", "ticker_headline": "MARKETS REACT", "scene_order": 6},
    {"id": "7", "image_url": "/images/ced0b8fe-8eee-46d8-a124-f40b620fdcd7.jpg", "ticker_headline": "HOUSE TO VOTE", "scene_order": 7},
    {"id": "8", "image_url": "/images/5d7c9ec3-2aa4-4643-b912-2afb2a167d5c.jpg", "ticker_headline": "EV CREDITS SHAPING FUTURE", "scene_order": 8}
  ]
}
EOFPROPS

# Replace placeholder with actual timestamps using jq
jq --argjson words "$(cat /tmp/word-timestamps.json | jq '.words')" \
  '.wordTimestamps = $words' \
  /tmp/render-props-fixed.json > /tmp/render-props-final.json

echo "📝 Render configuration:"
echo "   Duration: 99 seconds"
echo "   Word timestamps: $(cat /tmp/word-timestamps.json | jq '.totalWords') words"
echo "   Scenes: 8 (including 1 placeholder)"
echo ""

npx remotion render src/lib/remotion/index.ts NewsVideo ./tmp/test-with-timestamps.mp4 \
  --props=/tmp/render-props-final.json \
  --codec=h264 \
  --overwrite

if [ -f "./tmp/test-with-timestamps.mp4" ]; then
  echo ""
  echo "✅ RENDER COMPLETE!"
  echo "📹 Video: ./tmp/test-with-timestamps.mp4"
  ls -lh "./tmp/test-with-timestamps.mp4"
else
  echo ""
  echo "❌ Render failed"
  exit 1
fi
