import { Inngest } from "inngest";
import { sentryMiddleware } from "@inngest/middleware-sentry";

// ---------------------------------------------------------------------------
// Event payload types
// ---------------------------------------------------------------------------

/** Canonical `message.sent` payload (aliases accepted at parse time). */
export type MessageSentData = {
  messageId: string;
  conversationId: string;
  projectId: string;
  content: string;
  nonce: string;
  modelId: string;
};

export type MessageCancelData = {
  messageId: string;
  nonce: string;
};

export type ImportGitHubRepositoryData = {
  projectId: string;
  owner: string;
  repo: string;
  githubToken: string;
};

export type ExportToGitHubData = {
  projectId: string;
  repositoryName: string;
  visibility: "public" | "private";
  description?: string;
  githubToken: string;
};

export type ExportCancelData = {
  projectId: string;
};

const isDev = process.env.INNGEST_DEV === "1";

/**
 * Explicit `isDev` so `inngest.send()` from /api/chat/* hits the local dev
 * server — INNGEST_DEV in .env alone is not always picked up before send().
 */
export const inngest = new Inngest({
  id: "merc",
  middlewares: [sentryMiddleware()],
  isDev,
  eventKey:
    process.env.INNGEST_EVENT_KEY?.trim() ||
    (isDev ? "local" : undefined),
  baseUrl: process.env.INNGEST_BASE_URL,
});
