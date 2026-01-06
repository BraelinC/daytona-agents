#!/bin/bash
# Clicks at the specified coordinates
# Usage: ./click.sh X Y [button]
# button: 1=left (default), 2=middle, 3=right

X="$1"
Y="$2"
BUTTON="${3:-1}"

if [ -z "$X" ] || [ -z "$Y" ]; then
    echo "Usage: ./click.sh X Y [button]"
    echo "  button: 1=left, 2=middle, 3=right"
    exit 1
fi

DISPLAY=:1 xdotool mousemove "$X" "$Y"
sleep 0.1
DISPLAY=:1 xdotool click "$BUTTON"
echo "Clicked at ($X, $Y) with button $BUTTON"
