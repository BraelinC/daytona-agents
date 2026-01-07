---
name: github-clone
description: Clone GitHub repositories into Daytona sandbox environments and set up development environments. Use when Claude needs to: (1) Clone a repository into a sandbox, (2) Set up a development environment from a Git repo, (3) Pull code for analysis or modification in sandbox, (4) Install dependencies and start dev servers. Requires CONVEX_SITE_URL environment variable and a valid sandbox ID.
---

# GitHub Clone & Dev Environment Setup

Clone repositories and set up development environments in Daytona sandboxes.

## Configuration

```bash
export CONVEX_SITE_URL="https://calculating-hummingbird-542.convex.site"
```

## Clone Repository

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/git/clone" \
  -H "Content-Type: application/json" \
  -d '{
    "sandboxId": "SANDBOX_ID",
    "repoUrl": "https://github.com/owner/repo.git",
    "branch": "main",
    "targetPath": "/home/user/projects/repo"
  }'
```

**Parameters:**
- `sandboxId` (required): The Daytona sandbox ID
- `repoUrl` (required): Full Git URL (HTTPS)
- `branch` (optional): Branch to checkout (default: default branch)
- `targetPath` (optional): Clone destination (default: `/home/user/projects/{repo-name}`)

**Returns:** `{"success": true, "path": "/home/user/projects/repo", "output": "..."}`

## Complete Development Setup Workflow

### 1. Clone the Repository

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/git/clone" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "repoUrl": "https://github.com/BraelinC/planner"}'
```

### 2. Check Repository Structure

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "command": "ls -la /home/user/projects/planner"}'
```

### 3. Install Dependencies

**For Node.js projects:**
```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "command": "cd /home/user/projects/planner && npm install", "timeout": 120}'
```

**For Python projects:**
```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "command": "cd /home/user/projects/planner && pip install -r requirements.txt", "timeout": 120}'
```

### 4. Start Development Server

**Run in background:**
```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "command": "cd /home/user/projects/planner && npm run dev &"}'
```

### 5. Open Browser to View App

**Option A: Use terminal to open browser**
```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/execute" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "command": "firefox http://localhost:3000 &"}'
```

**Option B: Click on browser icon in taskbar**
First take screenshot to see the desktop, then click on browser icon.

### 6. Take Screenshot to Verify

```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "compressed": true, "quality": 80}'
```

## Common Project Types

### Next.js / React
```bash
# Install
npm install
# Dev server
npm run dev
# Default port: 3000
```

### Vite
```bash
# Install
npm install
# Dev server
npm run dev
# Default port: 5173
```

### Python Flask/Django
```bash
# Install
pip install -r requirements.txt
# Flask
flask run
# Django
python manage.py runserver
# Default port: 5000 (Flask) or 8000 (Django)
```

## Editing Code

### Read a file
```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/read" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "path": "/home/user/projects/planner/src/App.tsx"}'
```

### Write changes
```bash
curl -X POST "$CONVEX_SITE_URL/api/sandbox/fs/write" \
  -H "Content-Type: application/json" \
  -d '{"sandboxId": "abc123", "path": "/home/user/projects/planner/src/App.tsx", "content": "..."}'
```

### Hot reload
Most dev servers auto-reload on file changes. Take a screenshot to verify.

## Tips

- Clone timeout is 120 seconds by default for large repos
- Public repos work without authentication
- Check `package.json` or `requirements.txt` to understand the project
- Use `cat package.json` to see available npm scripts
- Start dev servers with `&` to run in background
- Take screenshots after starting server to verify it's running
