import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
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

/** Lightweight status check for the process-message pipeline. */
export const getAssistantStatusInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get("messages", args.messageId);
    if (!msg) return null;
    return {
      status: msg.status,
      nonce: msg.generationNonce ?? "",
    };
  },
});

/** Processing assistant messages for a project (Inngest cancellation). */
export const listProcessingAssistantInternal = internalQuery({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "processing"),
      )
      .collect();
    return rows
      .filter((m) => m.role === "assistant")
      .map((m) => ({
        messageId: m._id,
        nonce: m.generationNonce ?? "",
        conversationId: m.conversationId,
      }));
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
    const historyLimit = 24;
    const priorForContext = prior.slice(-historyLimit);

    const modelId = assistantMsg.modelId ?? DEFAULT_CHAT_MODEL_ID;
    const conversation = await ctx.db.get(
      "conversations",
      assistantMsg.conversationId,
    );

    return {
      status: assistantMsg.status,
      nonce: assistantMsg.generationNonce ?? "",
      modelId,
      googleApiModelId: resolveGoogleApiModelId(modelId),
      /** Pre-computed so Inngest doesn't duplicate model-compat logic. */
      isCompatibleModel: isChatCompletionModelId(modelId),
      conversationId: assistantMsg.conversationId,
      projectId: assistantMsg.projectId,
      conversationTitle: conversation?.title ?? "New chat",
      messages: priorForContext.map((m) => ({
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

    const cancelledJobs: Array<{
      assistantMessageId: Id<"messages">;
      nonce: string;
    }> = [];

    const processing = await ctx.db
      .query("messages")
      .withIndex("by_project_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "processing"),
      )
      .collect();

    for (const msg of processing) {
      if (msg.role !== "assistant") continue;
      const nonce = msg.generationNonce ?? "";
      await ctx.db.patch("messages", msg._id, {
        status: "cancelled",
        content: "Request cancelled",
        cancelRequestedAt: now,
      });
      if (nonce) {
        cancelledJobs.push({ assistantMessageId: msg._id, nonce });
      }
    }

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
      cancelledJobs,
    };
  },
});

/** Bootstrap first user + assistant messages for a new AI project (no Clerk auth). */
export const bootstrapAssistantTurnInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    conversationId: v.id("conversations"),
    content: v.string(),
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw new Error("Message cannot be empty");
    }

    const parsedModel = parseSidebarChatModelId(args.modelId);
    const modelIdForGeneration = parsedModel ?? DEFAULT_CHAT_MODEL_ID;
    const now = Date.now();

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      projectId: args.projectId,
      role: "user",
      content: trimmed,
      status: "completed",
    });

    const nonce = `${now}-${Math.random().toString(36).slice(2, 12)}`;
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      projectId: args.projectId,
      role: "assistant",
      content: "",
      status: "processing",
      generationNonce: nonce,
      modelId: modelIdForGeneration,
    });

    await ctx.db.patch("conversations", args.conversationId, { updatedAt: now });
    await ctx.db.patch("project", args.projectId, { updatedAt: now });

    return {
      assistantMessageId,
      nonce,
      modelId: modelIdForGeneration,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal mutations (callable only from trusted backend workers)
// ---------------------------------------------------------------------------

export const updateMessageStatusInternal = internalMutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    content: v.optional(v.string()),
    nonce: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get("messages", args.messageId);
    if (!msg || msg.role !== "assistant") {
      return { updated: false as const };
    }
    if (args.nonce !== undefined && msg.generationNonce !== args.nonce) {
      return { updated: false as const };
    }
    if (msg.status !== "processing" && args.status === "processing") {
      return { updated: false as const };
    }

    await ctx.db.patch("messages", args.messageId, {
      status: args.status,
      ...(args.content !== undefined ? { content: args.content } : {}),
      ...(args.error !== undefined ? { error: args.error } : {}),
    });

    await ctx.db.patch("conversations", msg.conversationId, {
      updatedAt: Date.now(),
    });

    return { updated: true as const };
  },
});

async function cancelProcessingAssistantsForProject(
  ctx: MutationCtx,
  projectId: Id<"project">,
): Promise<
  Array<{
    assistantMessageId: Id<"messages">;
    nonce: string;
  }>
> {
  const now = Date.now();
  const processing = await ctx.db
    .query("messages")
    .withIndex("by_project_status", (q) =>
      q.eq("projectId", projectId).eq("status", "processing"),
    )
    .collect();

  const cancelled: Array<{
    assistantMessageId: Id<"messages">;
    nonce: string;
  }> = [];

  for (const msg of processing) {
    if (msg.role !== "assistant") continue;
    const nonce = msg.generationNonce ?? "";
    await ctx.db.patch("messages", msg._id, {
      status: "cancelled",
      content: "Request cancelled",
      cancelRequestedAt: now,
    });
    if (nonce) {
      cancelled.push({ assistantMessageId: msg._id, nonce });
    }
  }

  if (cancelled.length > 0) {
    const conversationIds = new Set(processing.map((m) => m.conversationId));
    for (const conversationId of conversationIds) {
      await ctx.db.patch("conversations", conversationId, { updatedAt: now });
    }
  }

  return cancelled;
}

export const cancelProcessingForProjectInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get("project", args.projectId);
    if (!project || project.ownerId !== args.ownerId) {
      throw new Error("Unauthorized");
    }
    const cancelled = await cancelProcessingAssistantsForProject(
      ctx,
      args.projectId,
    );
    return { cancelled };
  },
});

export const cancelProcessingForProject = mutation({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    await requireProjectForUser(ctx, args.projectId);
    const cancelled = await cancelProcessingAssistantsForProject(
      ctx,
      args.projectId,
    );
    return { cancelled };
  },
});

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
