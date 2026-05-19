import { useMutation, useQuery } from "convex/react";
import type { OptimisticLocalStore } from "convex/browser";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

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
  return useMutation(api.conversations.create).withOptimisticUpdate(
    (localStore: OptimisticLocalStore, args) => {
      const existing = localStore.getQuery(api.conversations.listByProject, {
        projectId: args.projectId,
      });
      if (existing === undefined) return;

      const now = Date.now();
      const optimistic: Doc<"conversations"> = {
        _id: crypto.randomUUID() as Id<"conversations">,
        _creationTime: now,
        projectId: args.projectId,
        title: args.title.trim() || "New chat",
        updatedAt: now,
      };

      localStore.setQuery(
        api.conversations.listByProject,
        { projectId: args.projectId },
        [optimistic, ...existing],
      );
    },
  );
}
