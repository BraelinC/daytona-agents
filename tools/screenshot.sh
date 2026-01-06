#!/bin/bash
# Takes a screenshot and saves it to /tmp/screen.png
# Usage: ./screenshot.sh [output_path]

OUTPUT="${1:-/tmp/screen.png}"
DISPLAY=:1 scrot "$OUTPUT"
echo "Screenshot saved to $OUTPUT"
