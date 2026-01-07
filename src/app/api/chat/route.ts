import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || 'https://calculating-hummingbird-542.convex.site';

// OpenRouter configuration (using OpenAI-compatible API)
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Parse GitHub URL to owner/repo
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openrouter('openai/gpt-5'),
    system: `You are a project initialization assistant that helps users set up development sandboxes.

Your job is to:
1. When given a GitHub repo URL, analyze it to understand the project structure
2. Read key files (package.json, requirements.txt, etc.) to understand dependencies
3. Chat with the user to clarify any additional needs (testing, multiple agents, browser)
4. Calculate the optimal sandbox resources (vCPU, RAM, disk) and show the cost
5. When the user confirms, create the sandbox and it will auto-setup

## Pricing Reference
- vCPU: $0.0504/hr per core
- RAM: $0.0162/hr per GB
- Storage: ~free (first 5GB)

## Resource Guidelines
- Simple script: 1 vCPU, 1GB RAM
- Single app: 1 vCPU, 2GB RAM
- Monorepo (<1000 deps): 1 vCPU, 2-3GB RAM
- Monorepo (1000+ deps): 1 vCPU, 4GB RAM
- Add 500MB for browser, 256MB per extra OpenCode instance

Be concise and helpful. Use tools to gather information before making recommendations.`,
    messages,
    tools: {
      // Tool 1: Get repo metadata
      getRepoInfo: tool({
        description: 'Get GitHub repository metadata (size, language, description)',
        parameters: z.object({
          owner: z.string().describe('GitHub owner/org'),
          repo: z.string().describe('Repository name'),
        }),
        execute: async ({ owner, repo }) => {
          try {
            const response = await fetch(
              `https://api.github.com/repos/${owner}/${repo}`,
              {
                headers: {
                  ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
                  Accept: 'application/vnd.github.v3+json',
                },
              }
            );
            if (!response.ok) {
              return { error: `Failed to fetch repo: ${response.status}` };
            }
            const data = await response.json();
            return {
              name: data.name,
              fullName: data.full_name,
              description: data.description,
              language: data.language,
              size: data.size, // KB
              defaultBranch: data.default_branch,
              private: data.private,
              topics: data.topics,
            };
          } catch (error) {
            return { error: String(error) };
          }
        },
      }),

      // Tool 2: List directory contents
      listDirectory: tool({
        description: 'List files and folders in a GitHub repository directory',
        parameters: z.object({
          owner: z.string(),
          repo: z.string(),
          path: z.string().default('').describe('Path within repo (empty for root)'),
        }),
        execute: async ({ owner, repo, path }) => {
          try {
            const response = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
              {
                headers: {
                  ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
                  Accept: 'application/vnd.github.v3+json',
                },
              }
            );
            if (!response.ok) {
              return { error: `Failed to list directory: ${response.status}` };
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
              return { error: 'Path is a file, not a directory' };
            }
            return {
              path,
              contents: data.map((item: { name: string; type: string; size: number; path: string }) => ({
                name: item.name,
                type: item.type, // 'file' or 'dir'
                size: item.size,
                path: item.path,
              })),
            };
          } catch (error) {
            return { error: String(error) };
          }
        },
      }),

      // Tool 3: Read a file
      readFile: tool({
        description: 'Read the contents of a file from a GitHub repository',
        parameters: z.object({
          owner: z.string(),
          repo: z.string(),
          path: z.string().describe('File path within repo'),
        }),
        execute: async ({ owner, repo, path }) => {
          try {
            const response = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
              {
                headers: {
                  ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
                  Accept: 'application/vnd.github.v3.raw',
                },
              }
            );
            if (!response.ok) {
              return { error: `Failed to read file: ${response.status}` };
            }
            const content = await response.text();
            // Truncate large files
            if (content.length > 10000) {
              return {
                path,
                content: content.slice(0, 10000),
                truncated: true,
                totalSize: content.length,
              };
            }
            return { path, content, truncated: false };
          } catch (error) {
            return { error: String(error) };
          }
        },
      }),

      // Tool 4: Search code in repo
      searchCode: tool({
        description: 'Search for code patterns in a GitHub repository',
        parameters: z.object({
          owner: z.string(),
          repo: z.string(),
          query: z.string().describe('Search query'),
        }),
        execute: async ({ owner, repo, query }) => {
          try {
            const response = await fetch(
              `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${owner}/${repo}`,
              {
                headers: {
                  ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
                  Accept: 'application/vnd.github.v3+json',
                },
              }
            );
            if (!response.ok) {
              return { error: `Search failed: ${response.status}` };
            }
            const data = await response.json();
            return {
              totalCount: data.total_count,
              results: data.items?.slice(0, 10).map((item: { name: string; path: string }) => ({
                name: item.name,
                path: item.path,
              })) || [],
            };
          } catch (error) {
            return { error: String(error) };
          }
        },
      }),

      // Tool 5: Calculate resources
      calculateResources: tool({
        description: 'Calculate recommended sandbox resources and cost based on project analysis',
        parameters: z.object({
          projectType: z.enum(['script', 'single-app', 'monorepo', 'enterprise']),
          dependencyCount: z.number().describe('Number of dependencies'),
          features: z.array(z.enum(['browser', 'multi-agent', 'testing', 'typescript', 'build']))
            .describe('Additional features needed'),
        }),
        execute: async ({ projectType, dependencyCount, features }) => {
          let memory = 1; // GB
          let vcpu = 1;
          let disk = 5; // GB

          // Base by project type
          switch (projectType) {
            case 'script':
              memory = 1;
              break;
            case 'single-app':
              memory = 2;
              break;
            case 'monorepo':
              memory = dependencyCount > 1000 ? 4 : dependencyCount > 500 ? 3 : 2;
              break;
            case 'enterprise':
              memory = 6;
              vcpu = 2;
              disk = 10;
              break;
          }

          // Add for features
          if (features.includes('browser')) memory += 0.5;
          if (features.includes('multi-agent')) memory += 1;
          if (features.includes('testing')) memory += 0.5;
          if (features.includes('build')) memory += 0.5;

          // Round up memory
          memory = Math.ceil(memory);

          const costPerHour = (vcpu * 0.0504) + (memory * 0.0162);
          const costPerDay = costPerHour * 8;
          const costPerMonth = costPerHour * 160;

          return {
            recommended: {
              vcpu,
              memory,
              disk,
            },
            cost: {
              perHour: `$${costPerHour.toFixed(3)}`,
              perDay: `$${costPerDay.toFixed(2)}`,
              perMonth: `$${costPerMonth.toFixed(2)}`,
            },
            breakdown: {
              vcpuCost: `$${(vcpu * 0.0504).toFixed(3)}/hr`,
              memoryCost: `$${(memory * 0.0162).toFixed(3)}/hr`,
            },
          };
        },
      }),

      // Tool 6: Create sandbox (final action)
      createSandbox: tool({
        description: 'Create a Daytona sandbox with the specified configuration. This is the final action after user confirms.',
        parameters: z.object({
          vcpu: z.number().min(1).max(4),
          memory: z.number().min(1).max(8).describe('RAM in GB'),
          disk: z.number().min(3).max(10).describe('Disk in GB'),
          repoUrl: z.string().describe('GitHub repo URL to clone'),
          projectName: z.string().describe('Name for this project'),
        }),
        execute: async ({ vcpu, memory, disk, repoUrl, projectName }) => {
          try {
            // Call Convex to create sandbox with resources
            const response = await fetch(`${CONVEX_SITE_URL}/api/sandbox/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vcpu,
                memory,
                disk,
                repoUrl,
                projectName,
                autoSetup: true, // Clone repo, install deps, start dev server
              }),
            });

            if (!response.ok) {
              const error = await response.text();
              return { success: false, error };
            }

            const data = await response.json();
            return {
              success: true,
              sandboxId: data.sandboxId,
              vncUrl: data.vncUrl,
              message: `Sandbox created! It will automatically clone ${repoUrl} and set up the environment.`,
            };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        },
      }),

      // Helper tool: Parse GitHub URL
      parseGitHubUrl: tool({
        description: 'Parse a GitHub URL to extract owner and repo name',
        parameters: z.object({
          url: z.string().describe('GitHub URL'),
        }),
        execute: async ({ url }) => {
          const parsed = parseGitHubUrl(url);
          if (!parsed) {
            return { error: 'Invalid GitHub URL' };
          }
          return parsed;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
