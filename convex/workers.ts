"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a new worker sandbox
export const create = action({
  args: {},
  handler: async (ctx): Promise<{
    workerId: string;
    sandboxId: string;
    vncUrl: string;
    vncToken: string | null;
  }> => {
    const result = await ctx.runAction(api.daytona.createSandbox, {
      role: "worker",
    });

    return {
      workerId: result.convexId,
      sandboxId: result.sandboxId,
      vncUrl: result.vncUrl,
      vncToken: result.vncToken,
    };
  },
});

// Clone a GitHub repo to a worker sandbox
export const cloneRepo = action({
  args: {
    workerId: v.id("sandboxes"),
    repoUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; repoPath: string }> => {
    // Get the worker sandbox
    const worker = await ctx.runQuery(api.sandboxes.get, { id: args.workerId });
    if (!worker) {
      throw new Error("Worker not found");
    }

    // Import Daytona SDK
    const { Daytona, DaytonaConfig } = await import("daytona-sdk");

    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY not set");
    }

    const config = new DaytonaConfig({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });
    const daytona = new Daytona(config);

    // Get the sandbox
    const sandbox = await daytona.get(worker.sandboxId);

    // Extract repo name from URL
    const repoName = args.repoUrl.split("/").pop()?.replace(".git", "") || "repo";
    const repoPath = `/home/daytona/repos/${repoName}`;

    // Create repos directory and clone
    await sandbox.process.exec("mkdir -p /home/daytona/repos", { timeout: 30 });
    await sandbox.process.exec(`git clone ${args.repoUrl} ${repoPath}`, {
      timeout: 120,
    });

    // Update the worker record with repo info
    await ctx.runMutation(api.sandboxes.updateRepo, {
      id: args.workerId,
      repoUrl: args.repoUrl,
      repoPath,
    });

    return {
      success: true,
      repoPath,
    };
  },
});

// Send a prompt to a worker's OpenCode
export const sendPrompt = action({
  args: {
    workerId: v.id("sandboxes"),
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sandboxId: string }> => {
    // Get the worker sandbox
    const worker = await ctx.runQuery(api.sandboxes.get, { id: args.workerId });
    if (!worker) {
      throw new Error("Worker not found");
    }

    // Import Daytona SDK
    const { Daytona, DaytonaConfig } = await import("daytona-sdk");

    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY not set");
    }

    const config = new DaytonaConfig({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });
    const daytona = new Daytona(config);

    // Get the sandbox
    const sandbox = await daytona.get(worker.sandboxId);

    // If there's a repo, cd into it first
    if (worker.repoPath) {
      // Click to focus terminal
      await sandbox.computerUse.mouse.click({ x: 500, y: 350, button: "left" });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Type cd command
      await sandbox.computerUse.keyboard.type(`cd ${worker.repoPath}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await sandbox.computerUse.keyboard.press("m", ["ctrl"]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

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
      sandboxId: worker.sandboxId,
    };
  },
});
