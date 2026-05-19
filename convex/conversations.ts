import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireConversationForUser, requireProjectForUser } from "./lib/projectAccess";

export const DEFAULT_PLACEHOLDER_TITLES = ["New chat", "New Conversation"] as const;

export function isPlaceholderConversationTitle(title: string): boolean {
  const trimmed = title.trim();
  return (DEFAULT_PLACEHOLDER_TITLES as readonly string[]).includes(trimmed);
}

export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get("conversations", args.conversationId);
  },
});

export const updateConversationTitleInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get("conversations", args.conversationId);
    if (!conversation) return { updated: false as const };

    const title = args.title.trim().slice(0, 120);
    if (!title) return { updated: false as const };

    await ctx.db.patch("conversations", args.conversationId, {
      title,
      updatedAt: Date.now(),
    });
    return { updated: true as const };
  },
});

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
