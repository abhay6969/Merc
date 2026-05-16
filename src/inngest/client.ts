import { Inngest } from "inngest";
import { sentryMiddleware } from "@inngest/middleware-sentry";

// ---------------------------------------------------------------------------
// Event payload types
// ---------------------------------------------------------------------------

export type MessageSentData = {
  assistantMessageId: string;
  conversationId: string;
  projectId: string;
  nonce: string;
  modelId: string;
};

export type MessageCancelData = {
  assistantMessageId: string;
  nonce: string;
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
