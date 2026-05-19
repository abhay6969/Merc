import { convexFetch, readConvexError } from "../convex-http";
import type { MessageSentEventPayload } from "../types/message-sent";
import type { PipelineSnapshot } from "../types/pipeline";
import type { HistoryMessage } from "../lib/format-history";

type AssistantContextResponse = {
  status: "processing" | "completed" | "cancelled";
  nonce: string;
  modelId: string;
  googleApiModelId: string;
  isCompatibleModel: boolean;
  conversationId: string;
  projectId: string;
  conversationTitle: string;
  messages: HistoryMessage[];
};

type AssistantStatusResponse = {
  status: "processing" | "completed" | "cancelled";
  nonce: string;
};

async function fetchAssistantContext(
  messageId: string,
): Promise<AssistantContextResponse> {
  const res = await convexFetch("/internal/chat/context", { messageId });
  if (!res.ok) {
    throw new Error(
      `Assistant context fetch failed [${res.status}]: ${await readConvexError(res)}`,
    );
  }
  return res.json() as Promise<AssistantContextResponse>;
}

async function fetchAssistantStatus(
  messageId: string,
): Promise<AssistantStatusResponse> {
  const res = await convexFetch("/internal/chat/status", { messageId });
  if (!res.ok) {
    throw new Error(
      `Assistant status fetch failed [${res.status}]: ${await readConvexError(res)}`,
    );
  }
  return res.json() as Promise<AssistantStatusResponse>;
}

async function fetchProjectFileMetadata(
  projectId: string,
): Promise<PipelineSnapshot["projectFiles"]> {
  const res = await convexFetch("/internal/files/list", { projectId });
  if (!res.ok) {
    throw new Error(
      `Project files fetch failed [${res.status}]: ${await readConvexError(res)}`,
    );
  }
  const body = (await res.json()) as {
    files: PipelineSnapshot["projectFiles"];
  };
  return body.files;
}

/**
 * Modular fetch phase: assistant message, conversation metadata, history, file tree.
 */
export async function fetchPipelineSnapshot(
  payload: MessageSentEventPayload,
): Promise<PipelineSnapshot> {
  const [assistantContext, projectFiles] = await Promise.all([
    fetchAssistantContext(payload.messageId),
    fetchProjectFileMetadata(payload.projectId),
  ]);

  return {
    messageId: payload.messageId,
    conversationId: payload.conversationId,
    projectId: payload.projectId,
    nonce: payload.nonce,
    modelId: payload.modelId,
    googleApiModelId: assistantContext.googleApiModelId,
    isCompatibleModel: assistantContext.isCompatibleModel,
    status: assistantContext.status,
    conversationTitle: assistantContext.conversationTitle,
    messages: assistantContext.messages,
    projectFiles,
    userContent: payload.content,
  };
}

export async function refreshAssistantStatus(
  messageId: string,
): Promise<Pick<PipelineSnapshot, "status" | "nonce">> {
  return fetchAssistantStatus(messageId);
}
