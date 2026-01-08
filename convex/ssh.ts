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

// Create SSH access token for a sandbox
export const createSshAccess = action({
  args: {
    sandboxId: v.string(),
    expiresInMinutes: v.optional(v.number()), // Default 24 hours (1440 minutes)
  },
  handler: async (ctx, args): Promise<{
    host: string;
    port: number;
    username: string;
    token: string;
    expiresAt: string;
  }> => {
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(args.sandboxId);

    // Create SSH access token (default 24 hours)
    const expiresIn = args.expiresInMinutes || 1440;
    const sshAccess = await sandbox.createSshAccess(expiresIn);

    return {
      host: sshAccess.host || "",
      port: sshAccess.port || 22,
      username: sshAccess.username || "daytona",
      token: sshAccess.token || "",
      expiresAt: sshAccess.expiresAt || new Date(Date.now() + expiresIn * 60000).toISOString(),
    };
  },
});

// Validate an SSH access token
export const validateSshAccess = action({
  args: {
    sandboxId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{ valid: boolean }> => {
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(args.sandboxId);

    try {
      const result = await sandbox.validateSshAccess(args.token);
      return { valid: result?.valid ?? false };
    } catch {
      return { valid: false };
    }
  },
});

// Revoke an SSH access token
export const revokeSshAccess = action({
  args: {
    sandboxId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(args.sandboxId);

    try {
      await sandbox.revokeSshAccess(args.token);
      return { success: true };
    } catch {
      return { success: false };
    }
  },
});
