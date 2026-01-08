// Pre-loaded files for Claude Code sandboxes

// CLAUDE.md - Instructions for Claude Code
export const CLAUDE_MD = `# Project Instructions

You are working in a Daytona sandbox with full internet access.

## Available Tools

Check \`/tools\` directory for available scripts:
- \`/tools/screenshot.sh\` - Take a screenshot of the desktop
- \`/tools/browser.sh <url>\` - Open URL in Firefox browser

## Working Directory

Your main working directory is \`/home/daytona/projects\`.
- Clone repos here
- Make changes here
- This persists until sandbox is stopped

## Reference Files

Read-only reference materials are in \`/reference\`:
- Framework documentation
- Code examples
- Style guides

## Tips

1. Use the browser for web research - you have full internet
2. Take screenshots to see GUI state
3. Files you create persist across sessions (until sandbox stops)
`;

// Tool scripts
export const TOOLS = {
  "screenshot.sh": `#!/bin/bash
# Take a screenshot and save to /tmp/screenshot.png
import -window root /tmp/screenshot.png
echo "Screenshot saved to /tmp/screenshot.png"
`,

  "browser.sh": `#!/bin/bash
# Open URL in Firefox
URL=\${1:-"https://google.com"}
firefox "\$URL" &
echo "Opened \$URL in Firefox"
`,

  "create-file.sh": `#!/bin/bash
# Create a file with content
FILE=\$1
shift
echo "\$@" > "\$FILE"
echo "Created \$FILE"
`,
};

// Skills for Claude Code (commands it can use)
export const SKILLS_MD = `# Available Skills

## /screenshot
Take a screenshot of the current desktop state.

## /browser <url>
Open a URL in the Firefox browser.

## /search <query>
Search the web using the browser.

## /code <path>
Open a file in the code editor.
`;

// Default reference content
export const DEFAULT_REFERENCE = {
  "coding-standards.md": `# Coding Standards

- Use TypeScript for all new code
- Follow ESLint rules
- Write tests for new features
- Use meaningful variable names
`,

  "git-workflow.md": `# Git Workflow

1. Create feature branch: \`git checkout -b feature/name\`
2. Make changes and commit often
3. Push and create PR
4. Squash merge to main
`,
};

// Claude Code Skills (uploaded to ~/.claude/skills/)
export const CLAUDE_SKILLS: Record<string, { name: string; description: string; content: string }> = {
  "sandbox-control": {
    name: "sandbox-control",
    description: "Control Daytona sandbox environments programmatically via HTTP API",
    content: `---
name: sandbox-control
description: Control Daytona sandbox environments programmatically via HTTP API. Use when Claude needs to: (1) Take screenshots of sandbox desktop, (2) Execute commands in sandbox, (3) Control mouse and keyboard, (4) Read/write files in sandbox, (5) Get display information, (6) Interact with GUI applications. Requires CONVEX_SITE_URL environment variable and a valid sandbox ID.
---

# Sandbox Control API

Control Daytona sandboxes through the Convex HTTP API. This allows programmatic interaction with remote desktop environments.

## Configuration

Set the API base URL (get this from your Convex dashboard):
\`\`\`bash
export CONVEX_SITE_URL="https://calculating-hummingbird-542.convex.site"
\`\`\`

## API Endpoints

All endpoints accept POST requests with JSON body containing \`sandboxId\` plus operation-specific parameters.

### Take Screenshot (Store in Convex - Recommended)

Capture screenshot and store in Convex (saves sandbox disk space).

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot/store" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "quality": 70}'
\`\`\`

**Parameters:**
- \`sandboxId\` (required): The Daytona sandbox ID
- \`compressed\` (optional): Use JPEG compression (default: true)
- \`quality\` (optional): JPEG quality 1-100 (default: 70)

**Returns:** \`{"url": "https://...", "storageId": "...", "format": "jpeg", "sizeBytes": 54257}\`

### Take Screenshot (Base64 - Legacy)

Returns base64 directly (uses more bandwidth, doesn't persist).

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "compressed": true, "quality": 80}'
\`\`\`

**Returns:** \`{"image": "base64...", "format": "jpeg|png"}\`

### Get Latest Stored Screenshot

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot/latest" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID"}'
\`\`\`

### Cleanup Old Screenshots

Delete old screenshots, keep last N (default 10).

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshots/cleanup" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "keepLast": 10}'
\`\`\`

### Execute Command

Run shell commands in the sandbox.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "command": "ls -la", "timeout": 30}'
\`\`\`

**Parameters:**
- \`sandboxId\` (required): The Daytona sandbox ID
- \`command\` (required): Shell command to execute
- \`cwd\` (optional): Working directory
- \`timeout\` (optional): Timeout in seconds (default: 30)

**Returns:** \`{"exitCode": 0, "stdout": "...", "artifacts": []}\`

### Mouse Click

Click at specific coordinates.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/mouse/click" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "x": 500, "y": 300, "button": "left"}'
\`\`\`

**Parameters:**
- \`sandboxId\` (required): The Daytona sandbox ID
- \`x\` (required): X coordinate
- \`y\` (required): Y coordinate
- \`button\` (optional): "left", "right", or "middle" (default: "left")
- \`double\` (optional): Double-click (default: false)

### Mouse Move

Move the cursor to coordinates.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/mouse/move" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "x": 500, "y": 300}'
\`\`\`

### Mouse Scroll

Scroll at a position.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/mouse/scroll" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "x": 500, "y": 300, "direction": "down", "amount": 3}'
\`\`\`

**Parameters:**
- \`direction\` (required): "up" or "down"
- \`amount\` (optional): Scroll increments (default: 3)

### Keyboard Type

Type text character by character.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/keyboard/type" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "text": "Hello World"}'
\`\`\`

**Parameters:**
- \`text\` (required): Text to type
- \`delay\` (optional): Milliseconds between characters

### Keyboard Hotkey

Press a keyboard shortcut.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/keyboard/hotkey" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "keys": "ctrl+s"}'
\`\`\`

**Common hotkeys:**
- \`ctrl+c\` - Copy / Cancel
- \`ctrl+v\` - Paste
- \`ctrl+s\` - Save
- \`ctrl+z\` - Undo
- \`ctrl+shift+t\` - New terminal tab
- \`ctrl+alt+t\` - Open terminal (Ubuntu)
- \`alt+tab\` - Switch windows
- \`alt+f4\` - Close window

### Get Display Info

Get screen dimensions and window list.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/display" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID"}'
\`\`\`

**Returns:** \`{"display": {...}, "windows": [{"id": "...", "title": "..."}]}\`

### Read File

Read file contents from sandbox.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/read" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "path": "/home/user/file.txt"}'
\`\`\`

### Write File

Write content to a file in sandbox.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/write" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "path": "/home/user/file.txt", "content": "file contents"}'
\`\`\`

### List Directory

List files in a directory.

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/list" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "SANDBOX_ID", "path": "/home/user"}'
\`\`\`

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
- Use \`execute\` for terminal operations rather than GUI when possible
- Allow time for UI to update between actions (take screenshot to verify)

## Known Constraints

⚠️ CONSTRAINT: Default sandbox has only 1GB RAM - large npm/bun installs will be killed (OOM).
- For monorepo projects, request 2-4GB RAM sandbox

⚠️ CONSTRAINT: Tier 1-2 have restricted network (GitHub, npm, pip, Anthropic only).
- For full web browsing, need Tier 3+

⚠️ CONSTRAINT: The Daytona SDK returns screenshot data in \`result.screenshot\` property.
- NOT \`result.base64\`, \`result.image\`, or \`result.data\`

✅ BEST PRACTICE: Use \`keyboard.press("m", ["ctrl"])\` for Enter in terminals (Return key doesn't work in Xvfb).
`,
  },
  "github-clone": {
    name: "github-clone",
    description: "Clone GitHub repositories into Daytona sandbox environments and set up development environments",
    content: `---
name: github-clone
description: Clone GitHub repositories into Daytona sandbox environments and set up development environments. Use when Claude needs to: (1) Clone a repository into a sandbox, (2) Set up a development environment from a Git repo, (3) Pull code for analysis or modification in sandbox, (4) Install dependencies and start dev servers. Requires CONVEX_SITE_URL environment variable and a valid sandbox ID.
---

# GitHub Clone & Dev Environment Setup

Clone repositories and set up development environments in Daytona sandboxes.

## Configuration

\`\`\`bash
export CONVEX_SITE_URL="https://calculating-hummingbird-542.convex.site"
\`\`\`

## Clone Repository

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/git/clone" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sandboxId": "SANDBOX_ID",
    "repoUrl": "https://github.com/owner/repo.git",
    "branch": "main",
    "targetPath": "/home/user/projects/repo"
  }'
\`\`\`

**Parameters:**
- \`sandboxId\` (required): The Daytona sandbox ID
- \`repoUrl\` (required): Full Git URL (HTTPS)
- \`branch\` (optional): Branch to checkout (default: default branch)
- \`targetPath\` (optional): Clone destination (default: \`/home/daytona/projects/{repo-name}\`)

**Returns:** \`{"success": true, "path": "/home/daytona/projects/repo", "output": "..."}\`

## Complete Development Setup Workflow

### 1. Clone the Repository

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/git/clone" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "repoUrl": "https://github.com/BraelinC/planner"}'
\`\`\`

### 2. Check Repository Structure

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "command": "ls -la /home/daytona/projects/planner"}'
\`\`\`

### 3. Install Dependencies

**For Node.js projects:**
\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "command": "cd /home/daytona/projects/planner && npm install", "timeout": 120}'
\`\`\`

**For Python projects:**
\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "command": "cd /home/daytona/projects/planner && pip install -r requirements.txt", "timeout": 120}'
\`\`\`

### 4. Start Development Server

**Run in background:**
\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "command": "cd /home/daytona/projects/planner && npm run dev &"}'
\`\`\`

### 5. Open Browser to View App

**Option A: Use terminal to open browser**
\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "command": "firefox http://localhost:3000 &"}'
\`\`\`

**Option B: Click on browser icon in taskbar**
First take screenshot to see the desktop, then click on browser icon.

### 6. Take Screenshot to Verify

\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "compressed": true, "quality": 80}'
\`\`\`

## Common Project Types

### Next.js / React
\`\`\`bash
# Install
npm install
# Dev server
npm run dev
# Default port: 3000
\`\`\`

### Vite
\`\`\`bash
# Install
npm install
# Dev server
npm run dev
# Default port: 5173
\`\`\`

### Python Flask/Django
\`\`\`bash
# Install
pip install -r requirements.txt
# Flask
flask run
# Django
python manage.py runserver
# Default port: 5000 (Flask) or 8000 (Django)
\`\`\`

## Editing Code

### Read a file
\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/read" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "path": "/home/daytona/projects/planner/src/App.tsx"}'
\`\`\`

### Write changes
\`\`\`bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/write" \\
  -H "Content-Type: application/json" \\
  -d '{"sandboxId": "abc123", "path": "/home/daytona/projects/planner/src/App.tsx", "content": "..."}'
\`\`\`

### Hot reload
Most dev servers auto-reload on file changes. Take a screenshot to verify.

## Tips

- Clone timeout is 120 seconds by default for large repos
- Public repos work without authentication
- Check \`package.json\` or \`requirements.txt\` to understand the project
- Use \`cat package.json\` to see available npm scripts
- Start dev servers with \`&\` to run in background
- Take screenshots after starting server to verify it's running

## Known Constraints

⚠️ CONSTRAINT: Default sandbox has only 1GB RAM - large npm/bun installs will be killed (OOM).
- Monorepos with many dependencies need 2-4GB RAM
- Install bun via npm: \`npm install -g bun\`

⚠️ CONSTRAINT: The sandbox user is \`daytona\`, not \`user\`.
- Clone to \`/home/daytona/projects/\` not \`/home/user/projects/\`

⚠️ CONSTRAINT: Tier 1-2 sandboxes cannot curl arbitrary URLs.
- Connection reset errors for non-whitelisted domains
- npm/pip registries work fine

✅ BEST PRACTICE: For workspace:* dependencies, use bun or pnpm (npm doesn't support workspace protocol).
`,
  },
};
