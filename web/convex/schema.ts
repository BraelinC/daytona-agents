import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sandboxes: defineTable({
    sandboxId: v.string(),
    vncUrl: v.string(),
    vncToken: v.optional(v.string()),
    status: v.string(), // "creating" | "running" | "stopped"
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  results: defineTable({
    sandboxId: v.string(),
    taskName: v.string(),
    output: v.string(),
    completedAt: v.number(),
  }).index("by_sandbox", ["sandboxId"]),
});
