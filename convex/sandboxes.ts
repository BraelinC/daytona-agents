import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all running sandboxes
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sandboxes")
      .filter((q) => q.neq(q.field("status"), "stopped"))
      .order("desc")
      .collect();
  },
});

// Get orchestrator sandbox
export const getOrchestrator = query({
  args: {},
  handler: async (ctx) => {
    const orchestrators = await ctx.db
      .query("sandboxes")
      .withIndex("by_role", (q) => q.eq("role", "orchestrator"))
      .filter((q) => q.neq(q.field("status"), "stopped"))
      .collect();
    return orchestrators[0] || null;
  },
});

// Get all worker sandboxes
export const listWorkers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_role", (q) => q.eq("role", "worker"))
      .filter((q) => q.neq(q.field("status"), "stopped"))
      .order("desc")
      .collect();
  },
});

// Get a single sandbox by ID
export const get = query({
  args: { id: v.id("sandboxes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new sandbox record (called after Daytona creates it)
export const create = mutation({
  args: {
    sandboxId: v.string(),
    vncUrl: v.string(),
    vncToken: v.optional(v.string()),
    role: v.string(),
    repoUrl: v.optional(v.string()),
    repoPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sandboxes", {
      sandboxId: args.sandboxId,
      vncUrl: args.vncUrl,
      vncToken: args.vncToken,
      status: "running",
      role: args.role,
      repoUrl: args.repoUrl,
      repoPath: args.repoPath,
      createdAt: Date.now(),
    });
  },
});

// Update sandbox status
export const updateStatus = mutation({
  args: {
    id: v.id("sandboxes"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// Mark sandbox as stopped
export const stop = mutation({
  args: { id: v.id("sandboxes") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "stopped" });
  },
});

// Update sandbox repo info
export const updateRepo = mutation({
  args: {
    id: v.id("sandboxes"),
    repoUrl: v.string(),
    repoPath: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      repoUrl: args.repoUrl,
      repoPath: args.repoPath,
    });
  },
});
