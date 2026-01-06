#!/bin/bash
# Presses a key or key combination
# Usage: ./key.sh <key>
# Examples:
#   ./key.sh Return
#   ./key.sh ctrl+l
#   ./key.sh alt+Tab
#   ./key.sh ctrl+shift+t

KEY="$1"

if [ -z "$KEY" ]; then
    echo "Usage: ./key.sh <key>"
    echo "Examples:"
    echo "  ./key.sh Return"
    echo "  ./key.sh ctrl+l"
    echo "  ./key.sh alt+Tab"
    exit 1
fi

DISPLAY=:1 xdotool key "$KEY"
echo "Pressed: $KEY"
