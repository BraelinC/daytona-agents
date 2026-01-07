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
