#!/bin/bash
# Black Frame Detector - Quality Check for Rendered Videos
# Detects any completely black frames in the video

VIDEO_PATH="${1}"

if [ -z "$VIDEO_PATH" ]; then
  echo "Usage: ./detect-black-frames.sh <video-path>"
  exit 1
fi

if [ ! -f "$VIDEO_PATH" ]; then
  echo "❌ Video file not found: $VIDEO_PATH"
  exit 1
fi

echo "🔍 Analyzing video for black frames..."
echo "   Video: $VIDEO_PATH"
echo ""

# Use ffmpeg blackdetect filter to find black frames
# Parameters:
#   black_min_duration: minimum duration of black to detect (0.1s)
#   picture_black_ratio_th: threshold for black pixel ratio (0.98 = 98% black pixels)
#   pixel_black_th: threshold for pixel darkness (0.10 = very dark)

BLACK_FRAMES=$(ffmpeg -i "$VIDEO_PATH" -vf "blackdetect=d=0.1:pic_th=0.98:pix_th=0.10" -f null - 2>&1 | grep "black_start")

if [ -z "$BLACK_FRAMES" ]; then
  echo "✅ NO BLACK FRAMES DETECTED"
  echo "   Video quality: PASS"
  echo ""
  exit 0
else
  echo "❌ BLACK FRAMES DETECTED!"
  echo ""
  echo "$BLACK_FRAMES"
  echo ""
  echo "   Video quality: FAIL"
  echo "   Action required: Fix scene timing to eliminate gaps"
  exit 1
fi
