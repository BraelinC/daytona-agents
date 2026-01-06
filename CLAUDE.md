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
