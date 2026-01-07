// Mutations and queries for screenshot storage (no "use node" - runs on Convex)
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save screenshot metadata (called by takeAndStore action)
export const saveMetadata = mutation({
  args: {
    sandboxId: v.string(),
    storageId: v.id("_storage"),
    format: v.string(),
    sizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("screenshots", {
      sandboxId: args.sandboxId,
      storageId: args.storageId,
      format: args.format,
      sizeBytes: args.sizeBytes,
      takenAt: Date.now(),
    });
  },
});

// List screenshots for a sandbox
export const listBySandbox = query({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const screenshots = await ctx.db
      .query("screenshots")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .collect();

    // Get URLs for each screenshot
    return Promise.all(
      screenshots.map(async (s) => ({
        ...s,
        url: await ctx.storage.getUrl(s.storageId),
      }))
    );
  },
});

// Get latest screenshot for a sandbox
export const getLatest = query({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const screenshot = await ctx.db
      .query("screenshots")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .first();

    if (!screenshot) return null;

    return {
      ...screenshot,
      url: await ctx.storage.getUrl(screenshot.storageId),
    };
  },
});

// Delete old screenshots (keep last N)
export const cleanup = mutation({
  args: {
    sandboxId: v.string(),
    keepLast: v.optional(v.number()), // default 10
  },
  handler: async (ctx, args) => {
    const keepLast = args.keepLast ?? 10;

    const screenshots = await ctx.db
      .query("screenshots")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .collect();

    // Delete all except the most recent N
    const toDelete = screenshots.slice(keepLast);
    let deleted = 0;

    for (const s of toDelete) {
      await ctx.storage.delete(s.storageId);
      await ctx.db.delete(s._id);
      deleted++;
    }

    return { deleted, kept: Math.min(screenshots.length, keepLast) };
  },
});

// Delete all screenshots for a sandbox
export const deleteAll = mutation({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const screenshots = await ctx.db
      .query("screenshots")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .collect();

    for (const s of screenshots) {
      await ctx.storage.delete(s.storageId);
      await ctx.db.delete(s._id);
    }

    return { deleted: screenshots.length };
  },
});
