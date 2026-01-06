"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a new Daytona sandbox with VNC desktop and OpenCode
export const createSandbox = action({
  args: {},
  handler: async (ctx): Promise<{
    sandboxId: string;
    vncUrl: string;
    vncToken: string | null;
    convexId: string;
  }> => {
    // Dynamic import of daytona-sdk (runs in Node.js)
    const { Daytona, DaytonaConfig, CreateSandboxBaseParams } = await import(
      "daytona-sdk"
    );

    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable not set");
    }

    // Initialize Daytona client
    const config = new DaytonaConfig({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });
    const daytona = new Daytona(config);

    // Create sandbox
    const params = new CreateSandboxBaseParams({ public: true });
    const sandbox = await daytona.create(params);

    // Start VNC desktop
    await sandbox.computerUse.start();

    // Wait for VNC to initialize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Install OpenCode
    await sandbox.process.exec("npm install -g opencode-ai@latest", {
      timeout: 180,
    });

    // Open terminal with Ctrl+Alt+T
    await sandbox.computerUse.keyboard.hotkey("ctrl+alt+t");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Click to focus terminal
    await sandbox.computerUse.mouse.click({ x: 500, y: 350, button: "left" });
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

    // Store in Convex database
    const convexId = await ctx.runMutation(api.sandboxes.create, {
      sandboxId: sandbox.id,
      vncUrl: vncUrl.endsWith("/")
        ? `${vncUrl}vnc.html`
        : `${vncUrl}/vnc.html`,
      vncToken: vncToken ?? undefined,
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
    const { Daytona, DaytonaConfig } = await import("daytona-sdk");

    const apiKey = process.env.DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error("DAYTONA_API_KEY environment variable not set");
    }

    const config = new DaytonaConfig({
      apiKey,
      apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
      target: process.env.DAYTONA_TARGET || "us",
    });
    const daytona = new Daytona(config);

    // Delete sandbox
    await daytona.delete(args.sandboxId);

    // Update status in Convex
    await ctx.runMutation(api.sandboxes.stop, { id: args.convexId });

    return { success: true };
  },
});
