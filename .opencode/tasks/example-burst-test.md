# Burst Vision Test Task

## Objective
Test the 10 fps burst capture system by opening a terminal and typing a command.

## Steps
1. Take a burst capture to see current screen state
2. Open terminal using Ctrl+Alt+T
3. Take another burst to see terminal opening animation
4. Type "echo hello world" in the terminal
5. Press Enter (use ctrl+m)
6. Take final burst to verify command output

## Expected Result
- Terminal opens successfully
- "hello world" is displayed in terminal output
- All burst captures show smooth frame transitions

## Commands to Use

```bash
# Initial burst
/home/daytona/tools/burst_capture.sh

# Open terminal
/home/daytona/tools/key.sh ctrl+alt+t

# Wait for terminal
sleep 1

# Burst to see terminal
/home/daytona/tools/burst_capture.sh

# Type command
/home/daytona/tools/type_text.sh "echo hello world"

# Press enter (ctrl+m for Xvfb)
/home/daytona/tools/key.sh ctrl+m

# Final burst
/home/daytona/tools/burst_capture.sh
```

## Success Criteria
- Burst captures return valid base64 images
- Frame count = 10 per burst
- Terminal command executes successfully
