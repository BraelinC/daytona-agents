import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new automation task
 */
export const create = mutation({
  args: {
    sandboxId: v.string(),
    task: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("automationTasks", {
      sandboxId: args.sandboxId,
      task: args.task,
      status: "running",
      startedAt: Date.now(),
    });
  },
});

/**
 * Get a task by ID
 */
export const get = query({
  args: {
    taskId: v.id("automationTasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

/**
 * List tasks for a sandbox
 */
export const listBySandbox = query({
  args: {
    sandboxId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("automationTasks")
      .withIndex("by_sandbox", (q) => q.eq("sandboxId", args.sandboxId))
      .order("desc")
      .collect();
  },
});

/**
 * List tasks by status
 */
export const listByStatus = query({
  args: {
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("automationTasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

/**
 * Update task status (internal - called from actions)
 */
export const updateStatus = internalMutation({
  args: {
    taskId: v.id("automationTasks"),
    status: v.string(),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: Record<string, any> = {
      status: args.status,
    };

    if (args.result !== undefined) {
      update.result = args.result;
    }

    if (args.status === "completed" || args.status === "failed") {
      update.completedAt = Date.now();
    }

    await ctx.db.patch(args.taskId, update);
  },
});

/**
 * Delete a task
 */
export const remove = mutation({
  args: {
    taskId: v.id("automationTasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});
