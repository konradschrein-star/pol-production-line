#!/bin/bash
# Avatar Optimization Script for Remotion Compatibility
# Usage: ./scripts/optimize-avatar.sh <input-video> [output-name]

INPUT="$1"
OUTPUT_NAME="${2:-optimized-avatar.mp4}"
OUTPUT_DIR="public/avatars"
OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_NAME"

if [ -z "$INPUT" ]; then
  echo "❌ Error: No input file specified"
  echo "Usage: ./scripts/optimize-avatar.sh <input-video> [output-name]"
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "❌ Error: Input file not found: $INPUT"
  exit 1
fi

echo "🎬 Optimizing avatar video for Remotion..."
echo "   Input: $INPUT"
echo "   Output: $OUTPUT_PATH"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Re-encode video with web-optimized settings:
# - Scale to 640x360 for small overlay size
# - CRF 28 for good quality at low bitrate
# - Maxrate 1M to keep file size under control
# - AAC audio at 96k
# - Fast start for streaming
ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -preset fast \
  -crf 28 \
  -maxrate 1M \
  -bufsize 2M \
  -vf "scale=640:360" \
  -c:a aac \
  -b:a 96k \
  -movflags +faststart \
  "$OUTPUT_PATH" \
  -y

if [ $? -eq 0 ]; then
  ORIGINAL_SIZE=$(du -h "$INPUT" | cut -f1)
  OPTIMIZED_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)

  echo ""
  echo "✅ Optimization complete!"
  echo "   Original size: $ORIGINAL_SIZE"
  echo "   Optimized size: $OPTIMIZED_SIZE"
  echo "   Location: $OUTPUT_PATH"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Update NewsVideo.tsx to use: /avatars/$OUTPUT_NAME"
  echo "   2. Run render script"
else
  echo "❌ Optimization failed"
  exit 1
fi
