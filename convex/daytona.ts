"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Daytona } from "@daytonaio/sdk";

// Create a new Daytona sandbox with VNC desktop and OpenCode
export const createSandbox = action({
  args: {
    role: v.optional(v.string()), // "orchestrator" | "worker", defaults to "worker"
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
    // Note: Full internet access requires Tier 3 or 4 subscription
    // networkBlockAll: false is the default (most permissive for your tier)
    const sandbox = await daytona.create({
      envVars: {
        // Zen API key for OpenCode (stored in env, will also be written to auth.json)
        OPENCODE_ZEN_API_KEY: process.env.OPENCODE_ZEN_API_KEY || "",
      },
      // Don't restrict network - use maximum access available for your tier
      networkBlockAll: false,
    });

    // Start VNC desktop
    await sandbox.computerUse.start();

    // Wait for VNC to initialize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Install OpenCode
    await sandbox.process.executeCommand("npm install -g opencode-ai@latest");

    // Create OpenCode auth.json with Zen API key
    const zenApiKey = process.env.OPENCODE_ZEN_API_KEY || "";
    if (zenApiKey) {
      await sandbox.process.executeCommand("mkdir -p ~/.local/share/opencode");
      const authJson = JSON.stringify({ opencode: { apiKey: zenApiKey } });
      await sandbox.process.executeCommand(`echo '${authJson}' > ~/.local/share/opencode/auth.json`);
    }

    // Open terminal with Ctrl+Alt+T
    await sandbox.computerUse.keyboard.hotkey("ctrl+alt+t");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Click to focus terminal
    await sandbox.computerUse.mouse.click(500, 350, "left");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Type opencode
    await sandbox.computerUse.keyboard.type("opencode");
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Press Enter (Ctrl+M works in terminals)
    await sandbox.computerUse.keyboard.press("m", ["ctrl"]);

    // Get VNC URL
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
