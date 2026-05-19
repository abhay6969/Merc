import type { StateData } from "@inngest/agent-kit";

export type CodingAgentState = StateData & {
  projectId: string;
  conversationId: string;
  messageId: string;
  historyBlock?: string;
  projectTreeBlock?: string;
};
