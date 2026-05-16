import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useConversations(projectId: Id<"project"> | null) {
  return useQuery(
    api.conversations.listByProject,
    projectId ? { projectId } : "skip",
  );
}

export function useConversation(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.conversations.getById,
    conversationId ? { id: conversationId } : "skip",
  );
}

export function useCreateConversation() {
  return useMutation(api.conversations.create);
}
