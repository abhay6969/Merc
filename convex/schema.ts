import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** v1: single `content` blob; future: parts / toolCalls / streaming cursor. */
const messageStatus = v.union(
  v.literal("processing"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export default defineSchema({
  project: defineTable({
    name: v.string(),
    ownerId: v.string(),
    updatedAt: v.optional(v.number()),
    importStatus: v.optional(
      v.union(
        v.literal("importing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    exportStatus: v.optional(
      v.union(
        v.literal("exporting"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
    ),
    exportRepoUrl: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),
  files: defineTable({
    projectId: v.id("project"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("folder")),
    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_parent", ["parentId"])
    .index("by_project_parent", ["projectId", "parentId"]),
  conversations: defineTable({
    projectId: v.id("project"),
    title: v.string(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId", "updatedAt"]),
  messages: defineTable({
    conversationId: v.id("conversations"),
    projectId: v.id("project"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    status: messageStatus,
    /** Model used for this assistant reply (set when generation is scheduled). */
    modelId: v.optional(v.string()),
    error: v.optional(v.string()),
    generationNonce: v.optional(v.string()),
    cancelRequestedAt: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_project_status", ["projectId", "status"]),
});
