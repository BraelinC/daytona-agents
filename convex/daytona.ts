"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Daytona } from "@daytonaio/sdk";

// Model configuration for OpenRouter
const MODEL_CONFIG = {
  orchestrator: "glm-4.7", // GLM 4.7 - cheap/fast for code generation
  vision: "google/gemini-3-flash-preview", // Gemini 3.0 Flash - vision tasks
} as const;

// Create a new Daytona sandbox with VNC desktop and CLI tool
export const createSandbox = action({
  args: {
    role: v.optional(v.string()), // "orchestrator" | "worker", defaults to "worker"
    cliTool: v.optional(v.string()), // "opencode" | "claude-code", defaults to "opencode"
  },
  handler: async (ctx, args): Promise<{
    sandboxId: string;
    vncUrl: string;
    vncToken: string | null;
    convexId: string;
  }> => {
    const role = args.role || "worker";

    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable not set");
    }

    // Initialize Daytona client with config object
    const daytona = new Daytona({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });

    // Create sandbox with API keys for OpenCode
    // networkAllowList: "0.0.0.0/0" enables full internet access (all addresses)
    const sandbox = await daytona.create({
      envVars: {
        // OpenRouter API key for OpenCode (OpenCode Zen is blocked by Daytona network)
        OPENCODE_OPENROUTER_API_KEY: process.env.OPENCODE_OPENROUTER_API_KEY || "",
      },
      // Full internet access - allows browser to reach any website
      networkBlockAll: false,
      networkAllowList: "0.0.0.0/0",
      // Disable auto-stop (default is 15 min). Set to 0 to keep running until manually stopped.
      autoStopInterval: 0,
    });

    // Start VNC desktop
    await sandbox.computerUse.start();

    // Wait for VNC to initialize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const cliTool = args.cliTool || "opencode";

    // Install the selected CLI tool
    if (cliTool === "claude-code") {
      await sandbox.process.executeCommand("npm install -g @anthropic-ai/claude-code@latest");
      // User will authenticate via browser when claude prompts
    } else {
      await sandbox.process.executeCommand("npm install -g opencode-ai@latest");
      // Create OpenCode auth.json with OpenRouter API key
      const openRouterApiKey = process.env.OPENCODE_OPENROUTER_API_KEY || "";
      if (openRouterApiKey) {
        await sandbox.process.executeCommand("mkdir -p ~/.local/share/opencode");
        const authJson = JSON.stringify({ openrouter: { type: "api", key: openRouterApiKey } });
        await sandbox.process.executeCommand(`echo '${authJson}' > ~/.local/share/opencode/auth.json`);
      }
    }

    // Open terminal with Ctrl+Alt+T
    await sandbox.computerUse.keyboard.hotkey("ctrl+alt+t");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Click to focus terminal
    await sandbox.computerUse.mouse.click(500, 350, "left");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Type the CLI command and press Enter to start it
    // Claude Code will prompt for browser login, OpenCode uses auth.json
    const cliCommand = cliTool === "claude-code" ? "claude" : "opencode";
    await sandbox.computerUse.keyboard.type(cliCommand);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await sandbox.computerUse.keyboard.press("Return");

    // Wait for CLI to fully load
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Get VNC URL first (model config can happen after user sees the sandbox)
    const preview = await sandbox.getPreviewLink(6080);
    const vncUrl = preview.url || String(preview);
    const vncToken = preview.token || null;

    // Debug logging
    console.log("=== VNC URL DEBUG ===");
    console.log("preview object:", JSON.stringify(preview));
    console.log("vncUrl (raw):", vncUrl);
    console.log("vncToken:", vncToken);

    // Store base URL without vnc.html (the page will construct the proper URLs)
    const baseUrl = vncUrl.endsWith("/") ? vncUrl.slice(0, -1) : vncUrl;
    console.log("baseUrl (stored):", baseUrl);
    console.log("=====================");

    // Store in Convex database
    const convexId = await ctx.runMutation(api.sandboxes.create, {
      sandboxId: sandbox.id,
      vncUrl: baseUrl,
      vncToken: vncToken ?? undefined,
      role,
    });

    return {
      sandboxId: sandbox.id,
      vncUrl,
      vncToken,
      convexId: convexId as string,
    };
  },
});

// Create sandbox with custom resources (for init agent)
export const createWithResources = action({
  args: {
    vcpu: v.optional(v.number()),
    memory: v.optional(v.number()), // GB
    disk: v.optional(v.number()), // GB
    repoUrl: v.optional(v.string()),
    projectName: v.optional(v.string()),
    autoSetup: v.optional(v.boolean()),
    modelType: v.optional(v.string()), // "orchestrator" | "vision", defaults to "orchestrator"
  },
  handler: async (ctx, args): Promise<{
    sandboxId: string;
    vncUrl: string;
    vncToken: string | null;
    convexId: string;
    repoPath?: string;
  }> => {
    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable not set");
    }

    const daytona = new Daytona({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });

    // Create sandbox with custom resources and full internet access
    // Note: resources requires an image to be specified
    const sandbox = await daytona.create({
      image: "daytonaio/ai:latest",
      resources: {
        cpu: args.vcpu || 1,
        memory: args.memory || 4,
        disk: args.disk || 5,
      },
      envVars: {
        OPENCODE_OPENROUTER_API_KEY: process.env.OPENCODE_OPENROUTER_API_KEY || "",
        PROJECT_NAME: args.projectName || "",
      },
      // Full internet access - allows browser to reach any website
      networkBlockAll: false,
      networkAllowList: "0.0.0.0/0",
      // Disable auto-stop (default is 15 min)
      autoStopInterval: 0,
    });

    // Start VNC desktop
    await sandbox.computerUse.start();
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Install OpenCode
    await sandbox.process.executeCommand("npm install -g opencode-ai@latest");

    // Create OpenCode auth.json with OpenRouter
    const openRouterApiKey = process.env.OPENCODE_OPENROUTER_API_KEY || "";
    if (openRouterApiKey) {
      await sandbox.process.executeCommand("mkdir -p ~/.local/share/opencode");
      const authJson = JSON.stringify({ openrouter: { type: "api", key: openRouterApiKey } });
      await sandbox.process.executeCommand(`echo '${authJson}' > ~/.local/share/opencode/auth.json`);
    }

    let repoPath: string | undefined;

    // Auto-setup: Clone repo if provided
    if (args.autoSetup && args.repoUrl) {
      const repoName = args.repoUrl.split("/").pop()?.replace(".git", "") || "repo";
      repoPath = `/home/daytona/projects/${repoName}`;

      await sandbox.process.executeCommand("mkdir -p /home/daytona/projects");
      await sandbox.process.executeCommand(`git clone ${args.repoUrl} ${repoPath}`);

      // Detect package manager and install
      const hasBunLock = await sandbox.process.executeCommand(`test -f ${repoPath}/bun.lock && echo yes || echo no`);
      const hasPackageJson = await sandbox.process.executeCommand(`test -f ${repoPath}/package.json && echo yes || echo no`);

      if (hasBunLock.result?.includes("yes")) {
        await sandbox.process.executeCommand("npm install -g bun");
        // Don't wait for install - let it run in background
        sandbox.process.executeCommand(`cd ${repoPath} && bun install`);
      } else if (hasPackageJson.result?.includes("yes")) {
        sandbox.process.executeCommand(`cd ${repoPath} && npm install`);
      }
    }

    // Open terminal
    await sandbox.computerUse.keyboard.hotkey("ctrl+alt+t");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await sandbox.computerUse.mouse.click(500, 350, "left");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // If repo was cloned, cd to it and start opencode there
    if (repoPath) {
      await sandbox.computerUse.keyboard.type(`cd ${repoPath} && opencode`);
    } else {
      await sandbox.computerUse.keyboard.type("opencode");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await sandbox.computerUse.keyboard.press("Return");

    // Wait for OpenCode to start loading
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Get VNC URL
    const preview = await sandbox.getPreviewLink(6080);
    const vncUrl = preview.url || String(preview);
    const vncToken = preview.token || null;
    const baseUrl = vncUrl.endsWith("/") ? vncUrl.slice(0, -1) : vncUrl;

    // Store in database
    const convexId = await ctx.runMutation(api.sandboxes.create, {
      sandboxId: sandbox.id,
      vncUrl: baseUrl,
      vncToken: vncToken ?? undefined,
      role: "worker",
      repoUrl: args.repoUrl,
      repoPath,
    });

    return {
      sandboxId: sandbox.id,
      vncUrl,
      vncToken,
      convexId: convexId as string,
      repoPath,
    };
  },
});

// Create sandbox with dual OpenCode agents (orchestrator + vision)
export const createDualAgentSandbox = action({
  args: {
    repoUrl: v.optional(v.string()),
    projectName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    sandboxId: string;
    vncUrl: string;
    vncToken: string | null;
    convexId: string;
  }> => {
    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable not set");
    }

    const daytona = new Daytona({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });

    // Create sandbox with OpenRouter API key
    const sandbox = await daytona.create({
      envVars: {
        OPENCODE_OPENROUTER_API_KEY: process.env.OPENCODE_OPENROUTER_API_KEY || "",
        PROJECT_NAME: args.projectName || "",
      },
      networkBlockAll: false,
      networkAllowList: "0.0.0.0/0",
      // Disable auto-stop (default is 15 min)
      autoStopInterval: 0,
    });

    // Start VNC desktop
    await sandbox.computerUse.start();
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Install OpenCode
    await sandbox.process.executeCommand("npm install -g opencode-ai@latest");

    // Create OpenCode auth.json with OpenRouter
    const openRouterApiKey = process.env.OPENCODE_OPENROUTER_API_KEY || "";
    if (openRouterApiKey) {
      await sandbox.process.executeCommand("mkdir -p ~/.local/share/opencode");
      const authJson = JSON.stringify({ openrouter: { type: "api", key: openRouterApiKey } });
      await sandbox.process.executeCommand(`echo '${authJson}' > ~/.local/share/opencode/auth.json`);
    }

    // Create IPC directory for communication between agents
    await sandbox.process.executeCommand("mkdir -p /tmp/opencode-ipc");

    // Clone repo if provided
    let repoPath: string | undefined;
    if (args.repoUrl) {
      const repoName = args.repoUrl.split("/").pop()?.replace(".git", "") || "repo";
      repoPath = `/home/daytona/projects/${repoName}`;
      await sandbox.process.executeCommand("mkdir -p /home/daytona/projects");
      await sandbox.process.executeCommand(`git clone ${args.repoUrl} ${repoPath}`);
    }

    // === TERMINAL 1: Orchestrator Agent ===
    await sandbox.computerUse.keyboard.hotkey("ctrl+alt+t");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await sandbox.computerUse.mouse.click(500, 350, "left");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start opencode in repo directory if available
    if (repoPath) {
      await sandbox.computerUse.keyboard.type(`cd ${repoPath} && opencode`);
    } else {
      await sandbox.computerUse.keyboard.type("opencode");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await sandbox.computerUse.keyboard.press("Return");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // === TERMINAL 2: Vision Agent ===
    await sandbox.computerUse.keyboard.hotkey("ctrl+alt+t");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await sandbox.computerUse.mouse.click(700, 400, "left");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start opencode
    if (repoPath) {
      await sandbox.computerUse.keyboard.type(`cd ${repoPath} && opencode`);
    } else {
      await sandbox.computerUse.keyboard.type("opencode");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await sandbox.computerUse.keyboard.press("Return");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Get VNC URL
    const preview = await sandbox.getPreviewLink(6080);
    const vncUrl = preview.url || String(preview);
    const vncToken = preview.token || null;
    const baseUrl = vncUrl.endsWith("/") ? vncUrl.slice(0, -1) : vncUrl;

    // Store in database
    const convexId = await ctx.runMutation(api.sandboxes.create, {
      sandboxId: sandbox.id,
      vncUrl: baseUrl,
      vncToken: vncToken ?? undefined,
      role: "orchestrator", // Dual-agent sandbox is an orchestrator
      repoUrl: args.repoUrl,
      repoPath,
    });

    return {
      sandboxId: sandbox.id,
      vncUrl,
      vncToken,
      convexId: convexId as string,
    };
  },
});

// Stop a Daytona sandbox
export const stopSandbox = action({
  args: {
    sandboxId: v.string(),
    convexId: v.id("sandboxes"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable not set");
    }

    const daytona = new Daytona({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });

    // Get and delete sandbox
    const sandbox = await daytona.get(args.sandboxId);
    await sandbox.delete();

    // Update status in Convex
    await ctx.runMutation(api.sandboxes.stop, { id: args.convexId });

    return { success: true };
  },
});
