# OpenCode Runner on Daytona

Run [OpenCode](https://opencode.ai) coding agent in the cloud via [Daytona](https://daytona.io), accessible from any browser.

## Framework: ii (Information/Implementation)

This project uses the **ii framework** for building agentic automation systems:

```
opencode-runner/
├── instruction/          # Information layer (SOPs, API docs, constraints)
│   └── [workflow].md     # One file per workflow
├── implementation/       # Implementation layer (executable scripts)
│   └── [workflow].py     # One file per workflow
├── tools/                # Shell scripts for computer control
├── core/                 # Shared utilities
├── downloads/            # Output files
├── .env                  # API keys and secrets
├── CLAUDE.md             # Framework rules for AI assistants
└── README.md
```

See `CLAUDE.md` for detailed framework rules.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up API key:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Daytona API key from https://app.daytona.io
   ```

3. **Run the web UI:**
   ```bash
   python app.py
   ```

4. **Open http://localhost:8000** and click "+ New Instance"

## Available Workflows

### Computer Use Agent

Creates a VNC desktop with OpenCode running in a terminal, ready for computer control tasks.

**Files:**
- `instruction/computer_use_agent.md` - Documentation & constraints
- `implementation/computer_use_agent.py` - Standalone script

**Run standalone:**
```bash
python implementation/computer_use_agent.py [--url URL] [--keep-alive]
```

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                   Daytona Sandbox                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │  VNC Desktop (xfce4)                            │    │
│  │  ┌─────────────┐  ┌──────────────────────────┐ │    │
│  │  │  Browser    │  │  Terminal                │ │    │
│  │  │  (Firefox)  │  │  └─ OpenCode running     │ │    │
│  │  └─────────────┘  └──────────────────────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  Tools in /home/daytona/tools/:                          │
│  - screenshot.sh  → capture screen                       │
│  - click.sh X Y   → click at coordinates                 │
│  - type_text.sh   → type text                            │
│  - scroll.sh      → scroll up/down                       │
│  - key.sh         → press keys                           │
└─────────────────────────────────────────────────────────┘
```

## Scripts

| Script | Purpose |
|--------|---------|
| `app.py` | Web UI for managing sandboxes |
| `implementation/computer_use_agent.py` | Computer use agent (standalone) |
| `run_opencode.py` | Create sandbox and start OpenCode (basic) |
| `stop_sandbox.py` | Stop and delete the sandbox |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DAYTONA_API_KEY` | Yes | API key from Daytona dashboard |
| `DAYTONA_API_URL` | No | Default: https://app.daytona.io/api |
| `DAYTONA_TARGET` | No | Default: "us" |
| `ANTHROPIC_API_KEY` | No | For OpenCode to use Claude |

## Key Learnings

These constraints are documented in `instruction/computer_use_agent.md`:

- `keyboard.press("Return")` does NOT work in Daytona's Xvfb environment
- Use `keyboard.press("m", ["ctrl"])` (Ctrl+M) for Enter key in terminals
- Use `keyboard.hotkey("ctrl+alt+t")` to open terminal in xfce4
- Use `npm install -g opencode-ai` instead of apt-get (permission issues)

## Costs

- **Daytona**: $200 free compute included, then per-second billing
- **OpenCode**: Free (open source)
- **LLM Provider**: Your own API costs (Claude, GPT, etc.)
