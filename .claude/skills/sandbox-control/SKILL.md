---
name: sandbox-control
description: Control Daytona sandbox environments programmatically via HTTP API. Use when Claude needs to: (1) Take screenshots of sandbox desktop, (2) Execute commands in sandbox, (3) Control mouse and keyboard, (4) Read/write files in sandbox, (5) Get display information, (6) Interact with GUI applications. Requires CONVEX_SITE_URL environment variable and a valid sandbox ID.
---

# Sandbox Control API

Control Daytona sandboxes through the Convex HTTP API. This allows programmatic interaction with remote desktop environments.

## Configuration

Set the API base URL (get this from your Convex dashboard):
```bash
export CONVEX_SITE_URL="https://calculating-hummingbird-542.convex.site"
```

## API Endpoints

All endpoints accept POST requests with JSON body containing `sandboxId` plus operation-specific parameters.

### Take Screenshot

Capture the current state of the sandbox desktop.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "compressed": true, "quality": 80}'
```

**Parameters:**
- `sandboxId` (required): The Daytona sandbox ID
- `compressed` (optional): Use JPEG compression (default: false = PNG)
- `quality` (optional): JPEG quality 1-100 (default: 80)
- `scale` (optional): Scale factor 0.0-1.0 (default: 1.0)
- `showCursor` (optional): Include cursor in screenshot (default: true)

**Returns:** `{"image": "base64...", "format": "jpeg|png", "width": 1920, "height": 1080}`

### Execute Command

Run shell commands in the sandbox.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "command": "ls -la", "timeout": 30}'
```

**Parameters:**
- `sandboxId` (required): The Daytona sandbox ID
- `command` (required): Shell command to execute
- `cwd` (optional): Working directory
- `timeout` (optional): Timeout in seconds (default: 30)

**Returns:** `{"exitCode": 0, "stdout": "...", "artifacts": []}`

### Mouse Click

Click at specific coordinates.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/mouse/click" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "x": 500, "y": 300, "button": "left"}'
```

**Parameters:**
- `sandboxId` (required): The Daytona sandbox ID
- `x` (required): X coordinate
- `y` (required): Y coordinate
- `button` (optional): "left", "right", or "middle" (default: "left")
- `double` (optional): Double-click (default: false)

### Mouse Move

Move the cursor to coordinates.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/mouse/move" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "x": 500, "y": 300}'
```

### Mouse Scroll

Scroll at a position.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/mouse/scroll" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "x": 500, "y": 300, "direction": "down", "amount": 3}'
```

**Parameters:**
- `direction` (required): "up" or "down"
- `amount` (optional): Scroll increments (default: 3)

### Keyboard Type

Type text character by character.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/keyboard/type" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "text": "Hello World"}'
```

**Parameters:**
- `text` (required): Text to type
- `delay` (optional): Milliseconds between characters

### Keyboard Hotkey

Press a keyboard shortcut.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/keyboard/hotkey" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "keys": "ctrl+s"}'
```

**Common hotkeys:**
- `ctrl+c` - Copy / Cancel
- `ctrl+v` - Paste
- `ctrl+s` - Save
- `ctrl+z` - Undo
- `ctrl+shift+t` - New terminal tab
- `ctrl+alt+t` - Open terminal (Ubuntu)
- `alt+tab` - Switch windows
- `alt+f4` - Close window

### Get Display Info

Get screen dimensions and window list.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/display" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID"}'
```

**Returns:** `{"display": {...}, "windows": [{"id": "...", "title": "..."}]}`

### Read File

Read file contents from sandbox.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/read" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "path": "/home/user/file.txt"}'
```

### Write File

Write content to a file in sandbox.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/write" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "path": "/home/user/file.txt", "content": "file contents"}'
```

### List Directory

List files in a directory.

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/list" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "path": "/home/user"}'
```

## Workflow Pattern

When interacting with a sandbox GUI:

1. **Get display info** to understand screen dimensions
2. **Take screenshot** to see current state
3. **Analyze the screenshot** to identify UI elements and their coordinates
4. **Perform action** (click, type, hotkey)
5. **Take another screenshot** to verify result
6. **Repeat** until task is complete

## Tips

- Always take a screenshot after actions to verify results
- Use compressed JPEG screenshots (quality 60-80) for faster responses
- Coordinates are relative to top-left corner (0,0)
- For text input, click to focus the field first
- Use `execute` for terminal operations rather than GUI when possible
- Allow time for UI to update between actions (take screenshot to verify)
