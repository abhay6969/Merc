import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireConversationForUser, requireProjectForUser } from "./lib/projectAccess";

export const create = mutation({
  args: {
    projectId: v.id("project"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectForUser(ctx, args.projectId);
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      projectId: args.projectId,
      title: args.title.trim() || "New chat",
      updatedAt: now,
    });
  },
});

export const getById = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const { conversation } = await requireConversationForUser(ctx, args.id);
    return conversation;
  },
});

export const listByProject = query({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    await requireProjectForUser(ctx, args.projectId);
    return await ctx.db
      .query("conversations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});
