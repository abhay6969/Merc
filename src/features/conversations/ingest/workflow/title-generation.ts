import { maybeGenerateConversationTitle } from "../generate-title";
import type { PipelineSnapshot } from "../types/pipeline";

/** Run lightweight title generation before the coding agent (placeholder titles only). */
export async function generateTitleIfNeeded(
  snapshot: PipelineSnapshot,
  userContent: string,
): Promise<void> {
  const historyForTitle = [
    snapshot.messages.length > 0
      ? snapshot.messages
          .filter((m) => m.status === "completed" && m.content.trim())
          .map(
            (m) =>
              `${m.role === "user" ? "USER" : "ASSISTANT"}:\n${m.content.trim()}`,
          )
          .join("\n\n")
      : "",
    userContent.trim() ? `USER:\n${userContent.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  await maybeGenerateConversationTitle({
    conversationId: snapshot.conversationId,
    conversationTitle: snapshot.conversationTitle,
    historyBlock: historyForTitle,
  });
}
