import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  requireConversationForUser,
  requireProjectForUser,
} from "./lib/projectAccess";
import {
  DEFAULT_CHAT_MODEL_ID,
  isChatCompletionModelId,
  parseSidebarChatModelId,
  resolveGoogleApiModelId,
} from "./lib/chatModels";

// ---------------------------------------------------------------------------
// Internal queries (callable by Convex actions + HTTP actions, never by UI)
// ---------------------------------------------------------------------------

export const getAssistantMessageInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get("messages", args.messageId);
  },
});

/** Load all messages in a conversation ordered ascending (no user auth). */
export const listByConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

/**
 * Single-query context fetch used by the Inngest processMessage worker.
 * Returns the assistant message state + all prior conversation turns so the
 * Inngest function can validate + call the AI in one round-trip.
 */
export const getContextForGenerationInternal = internalQuery({
  args: { assistantMessageId: v.string() },
  handler: async (ctx, args) => {
    const assistantMsg = await ctx.db.get(
      "messages",
      args.assistantMessageId as Id<"messages">,
    );
    if (!assistantMsg) return null;

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", assistantMsg.conversationId),
      )
      .order("asc")
      .collect();

    const assistantIdx = allMessages.findIndex(
      (m) => m._id === args.assistantMessageId,
    );
    const prior = assistantIdx >= 0 ? allMessages.slice(0, assistantIdx) : [];

    const modelId = assistantMsg.modelId ?? DEFAULT_CHAT_MODEL_ID;

    return {
      status: assistantMsg.status,
      nonce: assistantMsg.generationNonce ?? "",
      modelId,
      googleApiModelId: resolveGoogleApiModelId(modelId),
      /** Pre-computed so Inngest doesn't duplicate model-compat logic. */
      isCompatibleModel: isChatCompletionModelId(modelId),
      conversationId: assistantMsg.conversationId,
      messages: prior.map((m) => ({
        role: m.role,
        content: m.content,
        status: m.status,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const listByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await requireConversationForUser(ctx, args.conversationId);
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Public mutations (called by the UI via Convex React hooks)
// ---------------------------------------------------------------------------

export const submitUserPrompt = mutation({
  args: {
    projectId: v.id("project"),
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
    newConversationTitle: v.optional(v.string()),
    /** Must be a known id from `convex/lib/chatModels.ts` when provided. */
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectForUser(ctx, args.projectId);
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw new Error("Message cannot be empty");
    }

    const parsedModel = parseSidebarChatModelId(args.modelId);
    if (args.modelId !== undefined && args.modelId !== "" && !parsedModel) {
      throw new Error("Unknown or unsupported chat model");
    }
    const modelIdForGeneration = parsedModel ?? DEFAULT_CHAT_MODEL_ID;

    let conversationId = args.conversationId;
    const now = Date.now();

    if (!conversationId) {
      conversationId = await ctx.db.insert("conversations", {
        projectId: args.projectId,
        title:
          args.newConversationTitle?.trim() ||
          trimmed.slice(0, 48) + (trimmed.length > 48 ? "…" : ""),
        updatedAt: now,
      });
    } else {
      const { conversation } = await requireConversationForUser(
        ctx,
        conversationId,
      );
      if (conversation.projectId !== args.projectId) {
        throw new Error("Conversation does not belong to this project");
      }
    }

    await ctx.db.insert("messages", {
      conversationId,
      projectId: args.projectId,
      role: "user",
      content: trimmed,
      status: "completed",
    });

    const nonce = `${now}-${Math.random().toString(36).slice(2, 12)}`;
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId,
      projectId: args.projectId,
      role: "assistant",
      content: "",
      status: "processing",
      generationNonce: nonce,
      modelId: modelIdForGeneration,
    });

    await ctx.db.patch("conversations", conversationId, { updatedAt: now });

    // Inngest events are sent from Next.js (/api/chat/dispatch) so local dev
    // works with INNGEST_DEV=1 — no INNGEST_EVENT_KEY on Convex required.

    return {
      conversationId,
      assistantMessageId,
      nonce,
      modelId: modelIdForGeneration,
    };
  },
});

export const requestCancelGeneration = mutation({
  args: { assistantMessageId: v.id("messages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get("messages", args.assistantMessageId);
    if (!msg) throw new Error("Message not found");
    if (msg.role !== "assistant") throw new Error("Not an assistant message");
    await requireProjectForUser(ctx, msg.projectId);

    if (msg.status !== "processing") {
      return { cancelled: false as const };
    }

    const nonce = msg.generationNonce ?? "";

    // 1. Mark cancelled in Convex immediately so the UI updates.
    await ctx.db.patch("messages", args.assistantMessageId, {
      status: "cancelled",
      content: msg.content || "Cancelled.",
      cancelRequestedAt: Date.now(),
    });

    await ctx.db.patch("conversations", msg.conversationId, {
      updatedAt: Date.now(),
    });

    // Inngest cancel event is sent from Next.js (/api/chat/cancel).

    return { cancelled: true as const, nonce };
  },
});

// ---------------------------------------------------------------------------
// Internal mutations (callable only from trusted backend workers)
// ---------------------------------------------------------------------------

export const finalizeAssistantInternal = internalMutation({
  args: {
    messageId: v.id("messages"),
    nonce: v.string(),
    content: v.string(),
    status: v.union(v.literal("completed"), v.literal("cancelled")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get("messages", args.messageId);
    if (!msg || msg.role !== "assistant") return;
    if (msg.generationNonce !== args.nonce) return;
    if (msg.status !== "processing") return;

    await ctx.db.patch("messages", args.messageId, {
      content: args.content,
      status: args.status,
      error: args.error,
    });

    await ctx.db.patch("conversations", msg.conversationId, {
      updatedAt: Date.now(),
    });
  },
});

export const failAssistantInternal = internalMutation({
  args: {
    messageId: v.id("messages"),
    nonce: v.string(),
    userVisibleMessage: v.string(),
    errorDetail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get("messages", args.messageId);
    if (!msg || msg.role !== "assistant") return;
    if (msg.generationNonce !== args.nonce) return;
    if (msg.status !== "processing") return;

    await ctx.db.patch("messages", args.messageId, {
      content: args.userVisibleMessage,
      status: "completed",
      error: args.errorDetail,
    });

    await ctx.db.patch("conversations", msg.conversationId, {
      updatedAt: Date.now(),
    });
  },
});
