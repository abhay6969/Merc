import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { verifyAuth } from "../auth";

export async function requireProjectForUser(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"project">,
): Promise<Doc<"project">> {
  const identity = await verifyAuth(ctx);
  const project = await ctx.db.get("project", projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  if (project.ownerId !== identity.subject) {
    throw new Error("Unauthorized");
  }
  return project;
}

export async function requireConversationForUser(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
): Promise<{ conversation: Doc<"conversations">; project: Doc<"project"> }> {
  const conversation = await ctx.db.get("conversations", conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const project = await requireProjectForUser(ctx, conversation.projectId);
  return { conversation, project };
}
