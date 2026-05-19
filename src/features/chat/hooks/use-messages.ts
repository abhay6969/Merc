import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useMessages(conversationId: Id<"conversations"> | null) {
  return useQuery(
    api.messages.listByConversation,
    conversationId ? { conversationId } : "skip",
  );
}

export function useSubmitUserPrompt() {
  return useMutation(api.messages.submitUserPrompt);
}
