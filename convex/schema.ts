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

  // Screenshots stored in Convex (not on sandbox disk)
  screenshots: defineTable({
    sandboxId: v.string(),
    storageId: v.id("_storage"), // Convex file storage
    format: v.string(), // "jpeg" | "png"
    sizeBytes: v.optional(v.number()),
    takenAt: v.number(),
  })
    .index("by_sandbox", ["sandboxId"])
    .index("by_time", ["takenAt"]),
});
