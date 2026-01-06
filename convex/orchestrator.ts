"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// System prompt for the orchestrator OpenCode instance
const ORCHESTRATOR_SYSTEM_PROMPT = `You are an orchestrator agent that manages worker sandboxes for code tasks.

You have access to these tools in /home/daytona/tools/:

1. ./create_worker.sh
   Creates a new worker sandbox and returns the worker ID.
   Usage: ./create_worker.sh

2. ./list_workers.sh
   Lists all active worker sandboxes.
   Usage: ./list_workers.sh

3. ./github_clone.sh <worker_id> <repo_url>
   Clones a GitHub repo to a worker sandbox.
   Usage: ./github_clone.sh worker123 https://github.com/user/repo

4. ./send_prompt.sh <worker_id> "<prompt>"
   Sends a prompt to a worker's OpenCode instance.
   Usage: ./send_prompt.sh worker123 "Add a README file"

When you receive a task like "Clone BraelinC/myrepo and fix the bug":
1. Create or find an available worker
2. Clone the repo to the worker
3. Send the task prompt to the worker

Always use the appropriate tool for each step.`;

// Initialize the orchestrator sandbox
export const setup = action({
  args: {},
  handler: async (ctx): Promise<{
    status: string;
    sandboxId: string;
    vncUrl: string;
    vncToken: string | null | undefined;
    convexId?: string;
  }> => {
    // Check if orchestrator already exists
    const existing = await ctx.runQuery(api.sandboxes.getOrchestrator, {});
    if (existing) {
      return {
        status: "exists",
        sandboxId: existing.sandboxId,
        vncUrl: existing.vncUrl,
        vncToken: existing.vncToken,
      };
    }

    // Create new orchestrator sandbox
    const result = await ctx.runAction(api.daytona.createSandbox, {
      role: "orchestrator",
    });

    // Upload orchestrator tools
    // Note: In production, you'd upload actual tool scripts here
    // For now, we'll create placeholder scripts

    return {
      status: "created",
      sandboxId: result.sandboxId,
      vncUrl: result.vncUrl,
      vncToken: result.vncToken,
      convexId: result.convexId,
    };
  },
});

// Send a prompt to the orchestrator's OpenCode
export const sendPrompt = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sandboxId: string }> => {
    // Get the orchestrator sandbox
    const orchestrator = await ctx.runQuery(api.sandboxes.getOrchestrator, {});
    if (!orchestrator) {
      throw new Error("Orchestrator not initialized. Call setup first.");
    }

    // Import Daytona SDK
    const { Daytona } = await import("@daytonaio/sdk");

    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY not set");
    }

    const daytona = new Daytona({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });

    // Get the sandbox
    const sandbox = await daytona.get(orchestrator.sandboxId);

    // Click to focus OpenCode terminal
    await sandbox.computerUse.mouse.click({ x: 500, y: 350, button: "left" });
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Type the prompt
    await sandbox.computerUse.keyboard.type(args.prompt);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Press Enter (Ctrl+M)
    await sandbox.computerUse.keyboard.press("m", ["ctrl"]);

    return {
      success: true,
      sandboxId: orchestrator.sandboxId,
    };
  },
});
