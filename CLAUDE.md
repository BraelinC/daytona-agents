# CLAUDE.md - Framework Rules for AI Assistants

## The "ii" Framework (Information/Implementation)

This project uses the "ii" framework for building agentic automation systems.

## Directory Structure

```
opencode-runner/
├── instruction/          # Information layer (SOPs, API docs, constraints)
│   └── [workflow].md     # One file per workflow
├── implementation/       # Implementation layer (executable scripts)
│   └── [workflow].py     # One file per workflow
├── core/                 # Shared utilities
├── downloads/            # Output files
├── tools/                # Shell scripts for computer control
├── .env                  # API keys and secrets
├── requirements.txt      # Dependencies
├── CLAUDE.md             # This file - framework rules
└── README.md
```

## Framework Rules

### Rule 1: Every workflow has TWO files

- `instruction/[name].md` - The "what" and "why"
  - API documentation
  - Step-by-step workflow
  - Constraints and learnings
  - Expected inputs/outputs

- `implementation/[name].py` - The "how"
  - Executable Python script
  - Full error handling
  - CLI arguments

### Rule 2: The Loop

```
READ instruction → CODE implementation → EXECUTE → ANNEAL
```

**On failure:**
1. Fix the code
2. UPDATE instruction with: `⚠️ CONSTRAINT: [what failed and why]`

**On success:**
1. UPDATE instruction with: `✅ BEST PRACTICE: [what worked]`

### Rule 3: Never Regress

Before coding any workflow:
1. READ the instruction file first
2. Check for past failures (⚠️ CONSTRAINT markers)
3. Follow established best practices (✅ markers)

## Current Workflows

| Workflow | Instruction | Implementation | Status |
|----------|-------------|----------------|--------|
| computer_use_agent | `instruction/computer_use_agent.md` | `implementation/computer_use_agent.py` | Active |

## Daytona-Specific Knowledge

### Keyboard Input in Xvfb

⚠️ CONSTRAINT: `keyboard.press("Return")` does NOT work in Daytona's Xvfb environment.

✅ BEST PRACTICE: Use `keyboard.press("m", ["ctrl"])` (Ctrl+M) for Enter key in terminals.

### Computer Use API

- `sandbox.computer_use.start()` - Start VNC desktop
- `sandbox.computer_use.keyboard.type(text)` - Type text
- `sandbox.computer_use.keyboard.press(key, [modifiers])` - Press key
- `sandbox.computer_use.keyboard.hotkey(combo)` - Press key combo (e.g., "ctrl+alt+t")
- `sandbox.computer_use.mouse.click(x, y, button)` - Click at coordinates
- `sandbox.computer_use.screenshot.take_full_screen()` - Take screenshot

### Process Execution

- `sandbox.process.exec(command, timeout=N)` - Run shell command
- `sandbox.fs.upload_file(path, content)` - Upload file to sandbox

## Convex HTTP API for Programmatic Control

The sandbox can be controlled via HTTP API at `https://calculating-hummingbird-542.convex.site`:

### Screenshot API
```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "ID", "compressed": true, "quality": 80}'
```

✅ BEST PRACTICE: The Daytona SDK returns image data in `result.screenshot` property (not `base64` or `image`).

### Available Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sandbox/screenshot` | POST | Take screenshot (returns base64) |
| `/api/sandbox/screenshot/store` | POST | Take & store in Convex (returns URL) |
| `/api/sandbox/screenshot/latest` | POST | Get latest stored screenshot URL |
| `/api/sandbox/screenshots` | POST | List all stored screenshots |
| `/api/sandbox/screenshots/cleanup` | POST | Delete old screenshots (keep last N) |
| `/api/sandbox/execute` | POST | Run shell command |
| `/api/sandbox/mouse/click` | POST | Click at x,y coordinates |
| `/api/sandbox/mouse/move` | POST | Move cursor |
| `/api/sandbox/mouse/scroll` | POST | Scroll up/down |
| `/api/sandbox/keyboard/type` | POST | Type text |
| `/api/sandbox/keyboard/hotkey` | POST | Press hotkey (e.g., "ctrl+s") |
| `/api/sandbox/display` | POST | Get screen dimensions |
| `/api/sandbox/fs/read` | POST | Read file from sandbox |
| `/api/sandbox/fs/write` | POST | Write file to sandbox |
| `/api/sandbox/git/clone` | POST | Clone git repository |

### Screenshot Storage (Recommended)

✅ BEST PRACTICE: Use `/api/sandbox/screenshot/store` instead of `/api/sandbox/screenshot` to save disk space on sandbox.

```bash
# Take and store screenshot in Convex
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot/store" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "ID", "quality": 70}'
# Returns: {"url": "https://...", "storageId": "...", "format": "jpeg"}

# Get latest screenshot URL
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot/latest" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "ID"}'

# Cleanup old screenshots (keep last 10)
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshots/cleanup" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "ID", "keepLast": 10}'
```

## Daytona Sandbox Resource Limits

⚠️ CONSTRAINT: Default sandbox has only 1GB RAM - large npm/bun installs will be killed (OOM).

| Tier | vCPU | RAM | Disk |
|------|------|-----|------|
| Default | 1 | 1GB | 3GiB |
| Organization Max | 4 | 8GB | 10GB |

✅ BEST PRACTICE: For monorepo projects with bun/npm install, request at least 2-4GB RAM.

## Network Access Tiers

⚠️ CONSTRAINT: Tier 1-2 sandboxes have restricted network access (GitHub, npm, pip, Anthropic only).

| Tier | Network Access |
|------|----------------|
| Tier 1-2 | Essential services only (GitHub, npm, pip, Anthropic API) |
| Tier 3-4 | Full internet access |

✅ BEST PRACTICE: For browser automation needing full web access, upgrade to Tier 3+.

## Skills Available

| Skill | Location | Purpose |
|-------|----------|---------|
| **project-init** | `.claude/skills/project-init/SKILL.md` | **Run FIRST** - Calculate resources & costs |
| sandbox-control | `.claude/skills/sandbox-control/SKILL.md` | Control sandbox via HTTP API |
| github-clone | `.claude/skills/github-clone/SKILL.md` | Clone repos and set up dev environments |

## Session Workflow

1. **Project Init** - Run `project-init` skill to calculate CPU/RAM/disk needs
2. **Create Sandbox** - Use calculated resources
3. **Clone & Setup** - Use `github-clone` skill
4. **Control & Iterate** - Use `sandbox-control` skill

---

## Gemini Live Sub-Agent (Browser Automation)

You have access to a **Gemini Live vision agent** that can autonomously control the browser/desktop. Use this when you need to:
- Fill out web forms
- Click through UI flows for testing
- Navigate websites and interact with elements
- Perform repetitive browser tasks

### When to Use the Gemini Sub-Agent

✅ **USE IT FOR:**
- Browser interactions (clicking, typing, scrolling)
- UI testing (click through flows, verify elements)
- Form filling with test data
- Web scraping that requires interaction
- Any visual task requiring screen analysis

❌ **DON'T USE IT FOR:**
- File operations (use shell commands instead)
- API calls (use curl/fetch instead)
- Code editing (do it yourself)
- Tasks that don't need a browser

### How to Delegate to Gemini Sub-Agent

**Start an automation task:**
```bash
curl -X POST "$CONVEX_SITE_URL/api/automation/start" \
  -H "Content-Type: application/json" \
  -d '{
    "sandboxId": "YOUR_SANDBOX_ID",
    "task": "Click the login button, enter test@example.com in email field, enter password123 in password field, then click Submit"
  }'
```

Response:
```json
{"taskId": "abc123", "status": "started"}
```

**Check task status:**
```bash
curl -X POST "$CONVEX_SITE_URL/api/automation/status" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "abc123"}'
```

Response:
```json
{"task": {"status": "completed", "result": "Successfully logged in"}}
```

**Stop a running task:**
```bash
curl -X POST "$CONVEX_SITE_URL/api/automation/stop" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "abc123"}'
```

### Writing Good Task Descriptions

The Gemini agent sees screenshots and uses tools (click, type, scroll). Write clear, specific tasks:

✅ **Good task descriptions:**
```
"Click the blue 'Sign Up' button in the top right corner"
"Type 'hello world' into the search box and press Enter"
"Scroll down until you see the 'Pricing' section, then click 'Free Trial'"
"Fill the form: name='John Doe', email='john@test.com', then click Submit"
```

❌ **Bad task descriptions:**
```
"Log in" (too vague - where? what credentials?)
"Test the app" (no specific actions)
"Make it work" (not actionable)
```

### Automation API Reference

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/automation/start` | POST | `{sandboxId, task, maxIterations?}` | Start automation |
| `/api/automation/status` | POST | `{taskId}` | Check task status |
| `/api/automation/stop` | POST | `{taskId}` | Stop running task |
| `/api/automation/list` | POST | `{sandboxId}` | List tasks for sandbox |

### Task Statuses

| Status | Meaning |
|--------|---------|
| `running` | Gemini is actively working |
| `completed` | Task finished successfully |
| `failed` | Task failed (check `result` for reason) |

### Example: Full Automation Flow

```bash
# 1. Start the task
TASK_RESPONSE=$(curl -s -X POST "$CONVEX_SITE_URL/api/automation/start" \
  -H "Content-Type: application/json" \
  -d '{
    "sandboxId": "'$SANDBOX_ID'",
    "task": "Open Firefox, go to github.com, click Sign In, enter username test@example.com and password test123, click the green Sign In button"
  }')

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.taskId')
echo "Started task: $TASK_ID"

# 2. Poll for completion (or do other work while waiting)
while true; do
  STATUS=$(curl -s -X POST "$CONVEX_SITE_URL/api/automation/status" \
    -H "Content-Type: application/json" \
    -d '{"taskId": "'$TASK_ID'"}' | jq -r '.task.status')

  if [ "$STATUS" != "running" ]; then
    echo "Task finished with status: $STATUS"
    break
  fi

  sleep 5
done

# 3. Get final result
curl -s -X POST "$CONVEX_SITE_URL/api/automation/status" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "'$TASK_ID'"}' | jq '.task.result'
```

### Tools Available to Gemini

The Gemini sub-agent has these tools:

| Tool | Description |
|------|-------------|
| `click(x, y)` | Click at screen coordinates |
| `type_text(text)` | Type text at cursor |
| `press_key(key)` | Press key (Return, Tab, Escape, ctrl+c, etc.) |
| `scroll(direction, amount)` | Scroll up/down |
| `wait(seconds)` | Wait for page loads |
| `screenshot()` | Take fresh screenshot |
| `task_complete(success, summary)` | Signal done |

### Tips for Claude Code

1. **Delegate visual tasks** - If you need to interact with a browser UI, delegate to Gemini
2. **Be specific** - Give Gemini exact instructions with element descriptions
3. **Check status** - Poll the status endpoint or do other work while Gemini runs
4. **Handle failures** - If Gemini fails, try rephrasing the task or break it into smaller steps
5. **Combine with your work** - You handle code/files, Gemini handles browser UI
