import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sandboxes: defineTable({
    sandboxId: v.string(),
    vncUrl: v.string(),
    vncToken: v.optional(v.string()),
    status: v.string(), // "creating" | "running" | "stopped"
    role: v.string(), // "orchestrator" | "worker"
    repoUrl: v.optional(v.string()),
    repoPath: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_role", ["role"]),

  results: defineTable({
    sandboxId: v.string(),
    taskName: v.string(),
    output: v.string(),
    completedAt: v.number(),
  }).index("by_sandbox", ["sandboxId"]),
});
