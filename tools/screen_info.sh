#!/bin/bash
# Gets screen dimensions and info
# Usage: ./screen_info.sh

echo "=== Screen Information ==="
DISPLAY=:1 xdpyinfo | grep -E "dimensions|depth|resolution" | head -5

echo ""
echo "=== Mouse Position ==="
DISPLAY=:1 xdotool getmouselocation

echo ""
echo "=== Active Window ==="
DISPLAY=:1 xdotool getactivewindow getwindowname 2>/dev/null || echo "No active window"
