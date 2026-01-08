#!/bin/bash
# burst_capture.sh - Capture 10 frames at 10fps from X11 display
# Returns base64-encoded JPEGs for Gemini vision analysis
# Cost: ~3000 tokens (~$0.0002) per burst

set -e

BURST_DIR="/tmp/burst_$$"
FRAME_COUNT="${1:-10}"
FPS="${2:-10}"
DURATION=$(echo "scale=2; $FRAME_COUNT / $FPS" | bc)
QUALITY="${3:-70}"  # JPEG quality (lower = smaller = fewer tokens)
DISPLAY="${DISPLAY:-:1}"

# Create temp directory
mkdir -p "$BURST_DIR"

# Capture frames using ffmpeg
# -f x11grab: capture from X11 display
# -framerate: capture rate
# -t: duration in seconds
# -q:v: JPEG quality (2-31, lower is better quality)
ffmpeg -f x11grab \
  -framerate "$FPS" \
  -t "$DURATION" \
  -video_size 1024x768 \
  -i "$DISPLAY" \
  -q:v $((31 - QUALITY * 31 / 100)) \
  "$BURST_DIR/frame_%02d.jpg" \
  -y 2>/dev/null

# Output as JSON array of base64-encoded images
echo "{"
echo "  \"burst\": true,"
echo "  \"frame_count\": $FRAME_COUNT,"
echo "  \"fps\": $FPS,"
echo "  \"frames\": ["

FIRST=true
for f in "$BURST_DIR"/frame_*.jpg; do
  if [ -f "$f" ]; then
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo ","
    fi
    B64=$(base64 -w0 "$f")
    echo -n "    \"data:image/jpeg;base64,$B64\""
  fi
done

echo ""
echo "  ]"
echo "}"

# Cleanup
rm -rf "$BURST_DIR"
