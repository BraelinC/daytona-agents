"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Daytona } from "@daytonaio/sdk";

// Helper to get Daytona client
function getDaytonaClient() {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY environment variable not set");
  }
  return new Daytona({
    apiKey,
    apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
    target: process.env.DAYTONA_TARGET || "us",
  });
}

// Helper to get sandbox instance from ID
async function getSandboxInstance(sandboxId: string) {
  const daytona = getDaytonaClient();
  const sandbox = await daytona.get(sandboxId);
  if (!sandbox) {
    throw new Error(`Sandbox not found: ${sandboxId}`);
  }
  return sandbox;
}

// ============================================
// SCREENSHOT ACTIONS
// ============================================

export const takeScreenshot = action({
  args: {
    sandboxId: v.string(),
    compressed: v.optional(v.boolean()),
    quality: v.optional(v.number()),
    scale: v.optional(v.number()),
    showCursor: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);

    if (args.compressed) {
      const result = await sandbox.computerUse.screenshot.takeCompressed({
        format: "jpeg",
        quality: args.quality ?? 80,
        scale: args.scale ?? 1.0,
        showCursor: args.showCursor ?? true,
      });
      return {
        image: (result as any).screenshot || "",
        format: "jpeg",
        cursorPosition: (result as any).cursorPosition,
        sizeBytes: (result as any).sizeBytes,
      };
    }

    const result = await sandbox.computerUse.screenshot.takeFullScreen(
      args.showCursor ?? true
    );
    return {
      image: (result as any).screenshot || "",
      format: "png",
      cursorPosition: (result as any).cursorPosition,
      sizeBytes: (result as any).sizeBytes,
    };
  },
});

// ============================================
// COMMAND EXECUTION
// ============================================

export const executeCommand = action({
  args: {
    sandboxId: v.string(),
    command: v.string(),
    cwd: v.optional(v.string()),
    timeout: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);

    const result = await sandbox.process.executeCommand(
      args.command,
      args.cwd,
      undefined, // env vars
      args.timeout ?? 30
    );

    return {
      exitCode: result.exitCode,
      stdout: result.result,
      artifacts: result.artifacts,
    };
  },
});

// ============================================
// MOUSE CONTROL
// ============================================

export const mouseClick = action({
  args: {
    sandboxId: v.string(),
    x: v.number(),
    y: v.number(),
    button: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("middle"))),
    double: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    await sandbox.computerUse.mouse.click(
      args.x,
      args.y,
      args.button ?? "left",
      args.double ?? false
    );
    return { success: true, x: args.x, y: args.y };
  },
});

export const mouseMove = action({
  args: {
    sandboxId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    const result = await sandbox.computerUse.mouse.move(args.x, args.y);
    return { success: true, position: result };
  },
});

export const mouseDrag = action({
  args: {
    sandboxId: v.string(),
    startX: v.number(),
    startY: v.number(),
    endX: v.number(),
    endY: v.number(),
    button: v.optional(v.union(v.literal("left"), v.literal("right"), v.literal("middle"))),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    await sandbox.computerUse.mouse.drag(
      args.startX,
      args.startY,
      args.endX,
      args.endY,
      args.button ?? "left"
    );
    return { success: true };
  },
});

export const mouseScroll = action({
  args: {
    sandboxId: v.string(),
    x: v.number(),
    y: v.number(),
    direction: v.union(v.literal("up"), v.literal("down")),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    await sandbox.computerUse.mouse.scroll(
      args.x,
      args.y,
      args.direction,
      args.amount ?? 3
    );
    return { success: true };
  },
});

// ============================================
// KEYBOARD CONTROL
// ============================================

export const keyboardType = action({
  args: {
    sandboxId: v.string(),
    text: v.string(),
    delay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    await sandbox.computerUse.keyboard.type(args.text, args.delay);
    return { success: true };
  },
});

export const keyboardPress = action({
  args: {
    sandboxId: v.string(),
    key: v.string(),
    modifiers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    await sandbox.computerUse.keyboard.press(args.key, args.modifiers);
    return { success: true };
  },
});

export const keyboardHotkey = action({
  args: {
    sandboxId: v.string(),
    keys: v.string(), // e.g., "ctrl+c", "ctrl+shift+s"
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    await sandbox.computerUse.keyboard.hotkey(args.keys);
    return { success: true };
  },
});

// ============================================
// DISPLAY INFO
// ============================================

export const getDisplayInfo = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    const displayInfo = await sandbox.computerUse.display.getInfo();
    const windows = await sandbox.computerUse.display.getWindows();
    return {
      display: displayInfo,
      windows: windows,
    };
  },
});

// ============================================
// FILE SYSTEM
// ============================================

export const readFile = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    // Use executeCommand to read file since fs API may vary
    const result = await sandbox.process.executeCommand(`cat "${args.path}"`);
    return {
      content: result.result,
      exitCode: result.exitCode,
    };
  },
});

export const writeFile = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    // Escape content for shell and write using heredoc
    const escapedContent = args.content.replace(/'/g, "'\\''");
    const result = await sandbox.process.executeCommand(
      `cat > "${args.path}" << 'EOFCONTENT'\n${args.content}\nEOFCONTENT`
    );
    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
    };
  },
});

export const listDirectory = action({
  args: {
    sandboxId: v.string(),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);
    const result = await sandbox.process.executeCommand(`ls -la "${args.path}"`);
    return {
      output: result.result,
      exitCode: result.exitCode,
    };
  },
});

// ============================================
// GIT OPERATIONS
// ============================================

export const gitClone = action({
  args: {
    sandboxId: v.string(),
    repoUrl: v.string(),
    targetPath: v.optional(v.string()),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sandbox = await getSandboxInstance(args.sandboxId);

    // Extract repo name from URL for default path
    const repoName = args.repoUrl.split("/").pop()?.replace(".git", "") || "repo";
    const targetPath = args.targetPath || `/home/daytona/projects/${repoName}`;

    // Create projects directory if needed
    await sandbox.process.executeCommand("mkdir -p /home/daytona/projects");

    // Build clone command
    let cloneCmd = `git clone ${args.repoUrl}`;
    if (args.branch) {
      cloneCmd += ` -b ${args.branch}`;
    }
    cloneCmd += ` "${targetPath}"`;

    const result = await sandbox.process.executeCommand(cloneCmd, undefined, undefined, 120);

    return {
      success: result.exitCode === 0,
      path: targetPath,
      output: result.result,
      exitCode: result.exitCode,
    };
  },
});
