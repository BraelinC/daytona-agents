---
name: project-init
description: Initialize a new project session by calculating optimal Daytona sandbox resources (CPU, RAM, disk) and cost estimates. Run this ONCE at the start of each project session to configure the sandbox properly. Takes project type, dependencies, and requirements as input.
---

# Project Initialization & Resource Calculator

Run this skill at the START of each project session to determine optimal sandbox configuration.

## Quick Start

When user describes their project, calculate resources using this guide:

### Step 1: Identify Project Type

| Project Type | Base RAM | Base CPU | Notes |
|--------------|----------|----------|-------|
| Simple script | 1GB | 1 | No browser needed |
| Single React/Vue app | 2GB | 1 | Vite + browser |
| Monorepo (small, <500 deps) | 2GB | 1 | Shared node_modules |
| Monorepo (medium, 500-2000 deps) | 4GB | 1 | Your planner = ~1254 deps |
| Monorepo (large, 2000+ deps) | 6-8GB | 2 | Enterprise scale |
| Python ML project | 4GB+ | 2 | Depends on models |

### Step 2: Add for Additional Needs

| Additional Need | +RAM | +CPU | Notes |
|-----------------|------|------|-------|
| Browser (Firefox) | +500MB | - | Per instance |
| Multiple browsers | +500MB each | - | Each tab ~200MB |
| Dev server (Vite) | +512MB | - | HMR active |
| Multiple OpenCode instances | +256MB each | - | Sharing same project |
| TypeScript checking | +256MB | - | Large codebases |
| Running tests | +512MB | +1 | Parallel tests |

### Step 3: Calculate Cost

**Daytona Pricing (per hour):**
```
vCPU:    $0.0504/hr per core
RAM:     $0.0162/hr per GB
Storage: $0.0001/hr per GB (first 5GB free)
```

**Formula:**
```
Cost/hr = (vCPU × $0.0504) + (RAM_GB × $0.0162) + (Storage_GB × $0.0001)
```

**Common Configurations:**

| Config | vCPU | RAM | Disk | Cost/hr | Cost/8hr day |
|--------|------|-----|------|---------|--------------|
| Minimal | 1 | 1GB | 3GB | $0.067 | $0.53 |
| Light dev | 1 | 2GB | 5GB | $0.083 | $0.66 |
| **Standard** | 1 | 4GB | 5GB | **$0.115** | $0.92 |
| Heavy dev | 1 | 6GB | 10GB | $0.148 | $1.19 |
| Multi-task | 2 | 4GB | 10GB | $0.166 | $1.33 |
| Power user | 2 | 8GB | 10GB | $0.230 | $1.84 |

## Output Template

When initializing a project, output this summary:

```
## Project: [NAME]
## Type: [monorepo/single-app/script]
## Dependencies: [count if known]

### Recommended Configuration
- vCPU: [1-4]
- RAM: [X]GB
- Disk: [X]GB

### Cost Estimate
- Per hour: $[X.XX]
- Per 8-hour day: $[X.XX]
- Per month (160hrs): $[X.XX]

### Sandbox Create Command
Resources: { vcpu: X, memory: X, disk: X }

### Notes
- [Any specific requirements or warnings]
```

## Example Calculations

### Example 1: HealthyMama Planner (Monorepo)
```
Project: healthymama-planner
Type: Monorepo (Bun + Turbo)
Dependencies: ~1254 packages

Tasks:
- bun install: ~2GB RAM peak
- Vite dev server: ~512MB
- Firefox browser: ~500MB
- OpenCode: ~256MB

Total RAM: 2GB + 512MB + 500MB + 256MB = ~3.3GB
Recommended: 4GB (with headroom)

Configuration:
- vCPU: 1
- RAM: 4GB
- Disk: 5GB

Cost: $0.115/hr = $0.92/day = $18.40/month
```

### Example 2: Simple Python Script
```
Project: data-processor
Type: Python script
Dependencies: ~20 packages

Tasks:
- Python runtime: ~256MB
- Script execution: ~512MB

Total RAM: ~768MB
Recommended: 1GB

Configuration:
- vCPU: 1
- RAM: 1GB
- Disk: 3GB

Cost: $0.067/hr = $0.53/day = $10.70/month
```

### Example 3: Multi-Agent Development
```
Project: multi-agent-dev
Type: Monorepo with multiple OpenCode instances
Dependencies: ~1500 packages

Tasks:
- bun install: ~2GB RAM peak
- Vite dev server: ~512MB
- Firefox browser: ~500MB
- OpenCode instance 1: ~256MB
- OpenCode instance 2: ~256MB
- OpenCode instance 3: ~256MB

Total RAM: 2GB + 512MB + 500MB + (256MB × 3) = ~3.8GB
Recommended: 6GB (multiple agents need headroom)

Configuration:
- vCPU: 2 (parallel agent work)
- RAM: 6GB
- Disk: 10GB

Cost: $0.198/hr = $1.58/day = $31.70/month
```

## Project Templates

### Template: School Project
```json
{
  "name": "school-project",
  "type": "single-app",
  "config": { "vcpu": 1, "memory": 2, "disk": 5 },
  "cost_per_hour": 0.083,
  "features": ["vite", "browser"]
}
```

### Template: Production App
```json
{
  "name": "production-app",
  "type": "monorepo",
  "config": { "vcpu": 1, "memory": 4, "disk": 10 },
  "cost_per_hour": 0.115,
  "features": ["vite", "browser", "typescript", "testing"]
}
```

### Template: Heavy Development
```json
{
  "name": "heavy-dev",
  "type": "enterprise-monorepo",
  "config": { "vcpu": 2, "memory": 8, "disk": 10 },
  "cost_per_hour": 0.230,
  "features": ["multiple-agents", "parallel-builds", "large-deps"]
}
```

## Integration with Sandbox Creation

After calculating, create sandbox with resources:

```typescript
const sandbox = await daytona.create({
  resources: {
    vcpu: 1,      // Calculated vCPU
    memory: 4,    // Calculated RAM in GB
    disk: 5,      // Calculated disk in GB
  },
  envVars: {
    PROJECT_NAME: "planner",
    PROJECT_TYPE: "monorepo",
  },
});
```

## Warnings

- **1GB RAM**: Will fail on most npm/bun installs for real projects
- **Monorepos**: Always budget 2GB+ for package installation peak
- **Browsers**: Need 2GB shared memory (`/dev/shm`) - Daytona handles this
- **Long sessions**: Vite HMR can leak memory over time, may need restart
