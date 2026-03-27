#!/bin/bash
# Create a placeholder image for failed image generation

OUTPUT_PATH="${1:-public/images/image-generation-failed.jpg}"

# Create a 1920x1080 image with text
ffmpeg -f lavfi -i color=c=0x1a1a1a:s=1920x1080:d=1 \
  -vf "drawtext=fontfile=/Windows/Fonts/arial.ttf:fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-100:text='IMAGE GENERATION FAILED',\
       drawtext=fontfile=/Windows/Fonts/arial.ttf:fontsize=40:fontcolor=gray:x=(w-text_w)/2:y=(h-text_h)/2+50:text='Placeholder - Scene will regenerate on retry'" \
  -frames:v 1 "$OUTPUT_PATH" -y

echo "✅ Placeholder created: $OUTPUT_PATH"
