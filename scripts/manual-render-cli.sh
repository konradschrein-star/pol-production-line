#!/bin/bash

JOB_ID="5424cf36-7cf2-4299-bad9-1605c0ae9ec7"
OUTPUT_PATH="./tmp/${JOB_ID}.mp4"

echo "🎬 Rendering video via Remotion CLI..."
echo "   Job ID: $JOB_ID"
echo ""

# Create input props JSON
cat > /tmp/render-props.json << 'EOFPROPS'
{
  "avatarMp4Url": "C:\\Users\\konra\\ObsidianNewsDesk\\avatars\\avatar_1774148522174.mp4",
  "scenes": [
    {"imageUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\60ccd0a3-fa94-4ea4-9c8c-2d0dbdbea4fa.jpg", "tickerHeadline": "SENATE PASSES HISTORIC CLIMATE LEGISLATION"},
    {"imageUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\3691f99b-ddc7-460e-a654-bf66c5e829eb.jpg", "tickerHeadline": "$69 BILLION FOR GREEN TECH"},
    {"imageUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\e532b10d-a8cf-4471-90d1-d212edb9636f.jpg", "tickerHeadline": "NARROW VOTE: 51-50 IN SENATE"},
    {"imageUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\1ce05f95-2da0-416f-a360-109e7716a80f.jpg", "tickerHeadline": "ACTIVISTS CELEBRATE OUTSIDE CAPITOL"},
    {"imageUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\066b83a8-db90-441f-9d5d-35feeff85247.jpg", "tickerHeadline": "CARBON EMISSIONS TO DROP 40% BY 2030"},
    {"imageUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\ced0b8fe-8eee-46d8-a124-f40b620fdcd7.jpg", "tickerHeadline": "HOUSE TO VOTE ON CLIMATE BILL"},
    {"imageUrl": "C:\\Users\\konra\\ObsidianNewsDesk\\images\\5d7c9ec3-2aa4-4643-b912-2afb2a167d5c.jpg", "tickerHeadline": "EV TAX CREDITS SHAPING THE FUTURE"}
  ]
}
EOFPROPS

echo "📝 Rendering with props:"
cat /tmp/render-props.json
echo ""
echo "🎥 Starting render (this takes 2-3 minutes)..."
echo ""

npx remotion render src/lib/remotion/index.ts NewsVideo "$OUTPUT_PATH" \
  --props=/tmp/render-props.json \
  --codec=h264 \
  --overwrite

if [ -f "$OUTPUT_PATH" ]; then
  echo ""
  echo "✅ RENDER COMPLETE!"
  echo "📹 Video saved to: $OUTPUT_PATH"
  ls -lh "$OUTPUT_PATH"
else
  echo ""
  echo "❌ Render failed - output file not found"
  exit 1
fi
