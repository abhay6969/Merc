import type { HistoryMessage } from "../lib/format-history";

export type ProjectFileMeta = {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
};

export type PipelineSnapshot = {
  messageId: string;
  conversationId: string;
  projectId: string;
  nonce: string;
  modelId: string;
  googleApiModelId: string;
  isCompatibleModel: boolean;
  status: "processing" | "completed" | "cancelled";
  conversationTitle: string;
  /** Prior turns only — excludes the processing assistant placeholder. */
  messages: HistoryMessage[];
  projectFiles: ProjectFileMeta[];
  userContent: string;
};

export type ProcessMessageResult =
  | { ok: true; modelId: string }
  | { skipped: true; reason: string };

export type AgentRunContext = {
  projectId: string;
  conversationId: string;
  messageId: string;
  historyBlock: string;
  projectTreeBlock: string;
};
