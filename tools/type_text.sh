#!/bin/bash
# Types the specified text
# Usage: ./type_text.sh "text to type"

TEXT="$1"

if [ -z "$TEXT" ]; then
    echo "Usage: ./type_text.sh \"text to type\""
    exit 1
fi

DISPLAY=:1 xdotool type --delay 50 "$TEXT"
echo "Typed: $TEXT"
