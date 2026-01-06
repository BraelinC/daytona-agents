# Computer Use Agent

## Goal

Create an agent that controls a browser via Daytona's VNC desktop to complete tasks like taking quizzes, filling forms, or navigating websites. OpenCode runs in a terminal and uses computer control tools to interact with the GUI.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Daytona Sandbox                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  VNC Desktop (xfce4)                            │    │
│  │  ┌─────────────┐  ┌──────────────────────────┐ │    │
│  │  │  Browser    │  │  Terminal (xfce4-term)   │ │    │
│  │  │  (Firefox)  │  │  └─ OpenCode running     │ │    │
│  │  └─────────────┘  └──────────────────────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  Tools available to OpenCode:                            │
│  - screenshot.sh  → /tmp/screen.png                     │
│  - click.sh X Y   → click at coordinates                │
│  - type_text.sh   → type text                           │
│  - scroll.sh      → scroll up/down                      │
│  - key.sh         → press keys                          │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints & Authentication

### Daytona SDK

```python
from daytona import Daytona, DaytonaConfig, CreateSandboxBaseParams

config = DaytonaConfig(
    api_key=os.getenv("DAYTONA_API_KEY"),
    api_url=os.getenv("DAYTONA_API_URL", "https://app.daytona.io/api"),
    target=os.getenv("DAYTONA_TARGET", "us")
)
daytona = Daytona(config)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DAYTONA_API_KEY` | Yes | API key from Daytona dashboard |
| `DAYTONA_API_URL` | No | Default: https://app.daytona.io/api |
| `DAYTONA_TARGET` | No | Default: "us" |
| `ANTHROPIC_API_KEY` | No | For OpenCode to use Claude |

## Step-by-Step Workflow

### Phase 1: Sandbox Setup

1. Create Daytona sandbox with `public=True`
2. Start VNC desktop with `sandbox.computer_use.start()`
3. Wait 5 seconds for desktop to initialize

### Phase 2: Install Dependencies

4. Install OpenCode: `npm install -g opencode-ai@latest`
5. Upload tool scripts to `/home/daytona/tools/`
6. Make scripts executable: `chmod +x /home/daytona/tools/*.sh`

### Phase 3: Launch Applications

7. Open terminal: `keyboard.hotkey("ctrl+alt+t")`
8. Wait 3 seconds for terminal to open
9. Click to focus terminal: `mouse.click(500, 350, "left")`
10. Type command: `keyboard.type("opencode")`
11. Press Enter: `keyboard.press("m", ["ctrl"])` ← **Use Ctrl+M, not Return!**

### Phase 4: Optional - Open Browser

12. Open Firefox: `keyboard.hotkey("ctrl+alt+t")` then type `firefox [URL]`
    OR use process.exec: `sandbox.process.exec('DISPLAY=:1 firefox [URL] &')`

## Expected Inputs/Outputs

### Inputs

- `url` (optional): URL to open in browser
- `task` (optional): Task description for OpenCode

### Outputs

- VNC URL for viewing the desktop
- Sandbox ID for management
- Terminal with OpenCode running

## Tool Scripts

Located in `/home/daytona/tools/`:

| Script | Usage | Description |
|--------|-------|-------------|
| `screenshot.sh` | `./screenshot.sh` | Saves to /tmp/screen.png |
| `click.sh` | `./click.sh 500 300` | Click at coordinates |
| `type_text.sh` | `./type_text.sh "hello"` | Type text |
| `scroll.sh` | `./scroll.sh down 3` | Scroll direction + amount |
| `key.sh` | `./key.sh Return` | Press a key |

---

## Constraints & Learnings

⚠️ CONSTRAINT: `keyboard.press("Return")` does NOT work in Daytona's Xvfb environment. The API call succeeds but the key is not sent to the terminal.

✅ BEST PRACTICE: Use `keyboard.press("m", ["ctrl"])` for Enter key. Ctrl+M is ASCII carriage return and works in terminals.

⚠️ CONSTRAINT: `keyboard.hotkey("Return")` fails with "invalid hotkey format". Hotkey expects format like "ctrl+c", not single keys.

✅ BEST PRACTICE: Use `keyboard.hotkey("ctrl+alt+t")` to open terminal in xfce4 desktop.

⚠️ CONSTRAINT: `apt-get install` fails with exit code 100 (permission denied) in Daytona sandbox.

✅ BEST PRACTICE: Use `npm install -g opencode-ai@latest` to install OpenCode instead of curl installer.

⚠️ CONSTRAINT: `xterm` is not installed by default in Daytona's xfce4 environment.

✅ BEST PRACTICE: Use Ctrl+Alt+T to open the default terminal emulator instead of launching xterm directly.

✅ BEST PRACTICE: Click on terminal window (500, 350) before typing to ensure focus.

✅ BEST PRACTICE: Add 3-5 second delays after opening terminal to let it fully initialize.
