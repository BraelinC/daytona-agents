# Init Agent - Project Initialization Assistant

## Goal

A conversational AI agent that helps users set up development sandboxes by:
1. Analyzing GitHub repositories to understand project requirements
2. Chatting to clarify additional needs (testing, browser, multiple agents)
3. Calculating optimal resources (vCPU, RAM, disk) and showing cost
4. Creating the sandbox when user confirms

## API Endpoint

`POST /api/chat`

### Request
```json
{
  "messages": [
    { "role": "user", "content": "I want to work on https://github.com/BraelinC/planner" }
  ]
}
```

### Response
Streams text with tool calls as needed.

## Tools Available

| Tool | Purpose | Parameters |
|------|---------|------------|
| `getRepoInfo` | Get repo metadata (size, language) | owner, repo |
| `listDirectory` | List files in a directory | owner, repo, path |
| `readFile` | Read file contents | owner, repo, path |
| `searchCode` | Search code in repo | owner, repo, query |
| `calculateResources` | Get recommended resources & cost | projectType, deps, features |
| `createSandbox` | Create sandbox (final action) | vcpu, memory, disk, repoUrl |
| `parseGitHubUrl` | Extract owner/repo from URL | url |

## Resource Calculation

### Base Resources by Project Type

| Type | vCPU | RAM | When to Use |
|------|------|-----|-------------|
| script | 1 | 1GB | Simple Python/Node scripts |
| single-app | 1 | 2GB | Single React/Vue/Node app |
| monorepo | 1 | 2-4GB | Based on dependency count |
| enterprise | 2 | 6GB | Large codebases, parallel builds |

### Additional Features

| Feature | +RAM | When Needed |
|---------|------|-------------|
| browser | +0.5GB | Viewing UI in Firefox |
| multi-agent | +1GB | Running multiple OpenCode instances |
| testing | +0.5GB | Running test suites |
| build | +0.5GB | Production builds |

### Dependency Count Thresholds (Monorepo)

| Dependencies | RAM |
|--------------|-----|
| < 500 | 2GB |
| 500-1000 | 3GB |
| > 1000 | 4GB |

## Pricing

```
vCPU:    $0.0504/hr per core
RAM:     $0.0162/hr per GB
Storage: ~$0.0001/hr per GB (first 5GB free)
```

### Common Configurations

| Config | Cost/hr | Cost/day |
|--------|---------|----------|
| 1 vCPU, 2GB | $0.083 | $0.66 |
| 1 vCPU, 4GB | $0.115 | $0.92 |
| 2 vCPU, 6GB | $0.198 | $1.58 |

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API access |
| `GITHUB_TOKEN` | GitHub API access (optional for public repos) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP endpoint |

## Example Conversation Flow

```
User: I want to work on https://github.com/BraelinC/planner

AI: [calls parseGitHubUrl] → {owner: "BraelinC", repo: "planner"}
AI: [calls getRepoInfo] → {language: "TypeScript", size: 1234}
AI: [calls listDirectory] → sees package.json, bun.lock
AI: [calls readFile("package.json")] → sees workspaces, 1254 deps

AI: "I analyzed your repo:
- **Type:** Monorepo (Bun + Turbo)
- **Dependencies:** ~1,254 packages
- **Language:** TypeScript

I recommend **1 vCPU, 4GB RAM** at **$0.115/hr**.

Do you need any of these?
- [ ] Browser for viewing UI
- [ ] Multiple OpenCode agents
- [ ] Run tests"

User: Yes, I need the browser

AI: [calls calculateResources] → 1 vCPU, 4.5GB → rounds to 5GB

AI: "Updated recommendation:
- **1 vCPU, 5GB RAM, 5GB disk**
- **Cost:** $0.131/hr (~$1.05/day)

Ready to create the sandbox?"

User: Yes, let's go

AI: [calls createSandbox] → sandbox created

AI: "✅ Sandbox created!
- **ID:** abc-123
- **VNC URL:** https://...

The sandbox is now:
1. Cloning the repository
2. Installing dependencies (bun install)
3. Starting the dev server

You can view it at [VNC link] in about 2 minutes."
```

## Constraints & Best Practices

✅ BEST PRACTICE: Always read package.json/requirements.txt to count dependencies accurately.

✅ BEST PRACTICE: Ask about browser needs - many users forget they need it.

⚠️ CONSTRAINT: GitHub search API has rate limits - use sparingly.

⚠️ CONSTRAINT: 1GB RAM will fail on most real projects - minimum 2GB recommended.

⚠️ CONSTRAINT: Maximum resources: 4 vCPU, 8GB RAM, 10GB disk.

## Error Handling

| Error | Response |
|-------|----------|
| Invalid GitHub URL | Ask user to provide valid URL |
| Private repo, no token | Explain they need to provide GitHub token |
| Repo not found | Check spelling, ask user to verify URL |
| Rate limited | Wait and retry, or ask user to provide token |
