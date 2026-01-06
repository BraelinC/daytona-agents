#!/bin/bash
# Scrolls up or down
# Usage: ./scroll.sh [up|down] [amount]
# amount: number of scroll clicks (default: 3)

DIRECTION="${1:-down}"
AMOUNT="${2:-3}"

# Button 4 = scroll up, Button 5 = scroll down
if [ "$DIRECTION" = "up" ]; then
    BUTTON=4
elif [ "$DIRECTION" = "down" ]; then
    BUTTON=5
else
    echo "Usage: ./scroll.sh [up|down] [amount]"
    exit 1
fi

for ((i=0; i<AMOUNT; i++)); do
    DISPLAY=:1 xdotool click "$BUTTON"
    sleep 0.05
done

echo "Scrolled $DIRECTION $AMOUNT times"
