"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Daytona } from "@daytonaio/sdk";
import { Id } from "./_generated/dataModel";

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

// Return type for takeAndStore action
type TakeAndStoreResult = {
  screenshotId: Id<"screenshots">;
  storageId: Id<"_storage">;
  url: string | null;
  format: string;
  sizeBytes: number | undefined;
};

// Take screenshot and save to Convex storage (not sandbox disk)
export const takeAndStore = action({
  args: {
    sandboxId: v.string(),
    compressed: v.optional(v.boolean()),
    quality: v.optional(v.number()),
  },
  // Explicit return type fixes the circular reference TypeScript error
  handler: async (ctx, args): Promise<TakeAndStoreResult> => {
    const daytona = getDaytonaClient();
    const sandbox = await daytona.get(args.sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox not found: ${args.sandboxId}`);
    }

    // Take screenshot
    let imageData: string;
    let format: string;
    let sizeBytes: number | undefined;

    if (args.compressed !== false) {
      const result = await sandbox.computerUse.screenshot.takeCompressed({
        format: "jpeg",
        quality: args.quality ?? 70,
        scale: 1.0,
        showCursor: true,
      });
      imageData = (result as { screenshot?: string }).screenshot || "";
      format = "jpeg";
      sizeBytes = (result as { sizeBytes?: number }).sizeBytes;
    } else {
      const result = await sandbox.computerUse.screenshot.takeFullScreen(true);
      imageData = (result as { screenshot?: string }).screenshot || "";
      format = "png";
      sizeBytes = (result as { sizeBytes?: number }).sizeBytes;
    }

    if (!imageData) {
      throw new Error("Screenshot returned empty image data");
    }

    // Convert base64 to blob and store in Convex
    const binaryData = Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: `image/${format}` });

    const storageId = await ctx.storage.store(blob);

    // Save metadata to database
    const screenshotId = await ctx.runMutation(api.screenshots.saveMetadata, {
      sandboxId: args.sandboxId,
      storageId,
      format,
      sizeBytes,
    });

    // Get URL for the stored image
    const url = await ctx.storage.getUrl(storageId);

    return {
      screenshotId,
      storageId,
      url,
      format,
      sizeBytes,
    };
  },
});
