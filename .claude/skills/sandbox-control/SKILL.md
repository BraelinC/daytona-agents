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

### Take Screenshot (Store in Convex - Recommended)

Capture screenshot and store in Convex (saves sandbox disk space).

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot/store" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "quality": 70}'
```

**Parameters:**
- `sandboxId` (required): The Daytona sandbox ID
- `compressed` (optional): Use JPEG compression (default: true)
- `quality` (optional): JPEG quality 1-100 (default: 70)

**Returns:** `{"url": "https://...", "storageId": "...", "format": "jpeg", "sizeBytes": 54257}`

### Take Screenshot (Base64 - Legacy)

Returns base64 directly (uses more bandwidth, doesn't persist).

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "compressed": true, "quality": 80}'
```

**Returns:** `{"image": "base64...", "format": "jpeg|png"}`

### Get Latest Stored Screenshot

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot/latest" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID"}'
```

### Cleanup Old Screenshots

Delete old screenshots, keep last N (default 10).

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshots/cleanup" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "SANDBOX_ID", "keepLast": 10}'
```

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

## Known Constraints

⚠️ CONSTRAINT: Default sandbox has only 1GB RAM - large npm/bun installs will be killed (OOM).
- For monorepo projects, request 2-4GB RAM sandbox

⚠️ CONSTRAINT: Tier 1-2 have restricted network (GitHub, npm, pip, Anthropic only).
- For full web browsing, need Tier 3+

⚠️ CONSTRAINT: The Daytona SDK returns screenshot data in `result.screenshot` property.
- NOT `result.base64`, `result.image`, or `result.data`

✅ BEST PRACTICE: Use `keyboard.press("m", ["ctrl"])` for Enter in terminals (Return key doesn't work in Xvfb).
