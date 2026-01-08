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
