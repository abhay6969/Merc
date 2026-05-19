import { formatConversationHistory } from "../lib/format-history";
import { formatProjectFileTree } from "../lib/format-project-tree";
import type { AgentRunContext } from "../types/pipeline";
import type { PipelineSnapshot } from "../types/pipeline";

export function buildAgentRunContext(
  snapshot: PipelineSnapshot,
): AgentRunContext {
  const historyBlock = formatConversationHistory(snapshot.messages);
  const projectTreeBlock = formatProjectFileTree(snapshot.projectFiles);

  return {
    projectId: snapshot.projectId,
    conversationId: snapshot.conversationId,
    messageId: snapshot.messageId,
    historyBlock,
    projectTreeBlock,
  };
}
