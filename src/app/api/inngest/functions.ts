import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { inngest } from "@/inngest/client";
import type { MessageSentData } from "@/inngest/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CHARS_PER_MESSAGE = 48_000;

const SYSTEM_PROMPT =
  "You are a helpful assistant inside a code project workspace. " +
  "Answer clearly and concisely; use markdown when it helps.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clipContent(text: string): string {
  if (text.length <= MAX_CHARS_PER_MESSAGE) return text;
  return `${text.slice(0, MAX_CHARS_PER_MESSAGE)}\n\n…(truncated)`;
}

/**
 * Resolves the Convex HTTP base URL.
 * Convex HTTP actions are served at <deployment>.convex.site while the
 * WebSocket client URL uses <deployment>.convex.cloud.
 * Set CONVEX_HTTP_URL explicitly, or derive from NEXT_PUBLIC_CONVEX_URL.
 */
function convexHttpUrl(): string {
  const explicit = process.env.CONVEX_HTTP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const clientUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (clientUrl) {
    return clientUrl
      .replace(".convex.cloud", ".convex.site")
      .replace(/\/$/, "");
  }

  throw new Error(
    "Set CONVEX_HTTP_URL (or NEXT_PUBLIC_CONVEX_URL) so Inngest can reach Convex HTTP actions.",
  );
}

function internalHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY?.trim() ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: key ? `Bearer ${key}` : "",
    "x-internal-key": key,
  };
}

async function convexFetch(
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const base = convexHttpUrl();
  const payload = JSON.stringify(body);
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: internalHeaders(),
    body: payload,
  });
}

async function readConvexError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return text.slice(0, 500) || res.statusText;
}

function googleApiKey(): string {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "No Google API key found. Set GOOGLE_GENERATIVE_AI_API_KEY.",
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Context response shape from /internal/chat/context
// ---------------------------------------------------------------------------

type ContextMessage = {
  role: "user" | "assistant";
  content: string;
  status: string;
};

type ConvexContext = {
  status: "processing" | "completed" | "cancelled";
  nonce: string;
  modelId: string;
  /** Google Generative AI model id (resolved from picker slug). */
  googleApiModelId: string;
  /** Pre-computed by Convex so we don't duplicate model-compat logic here. */
  isCompatibleModel: boolean;
  conversationId: string;
  messages: ContextMessage[];
};

// ---------------------------------------------------------------------------
// Inngest function: processMessage
// ---------------------------------------------------------------------------

/**
 * Background AI generation worker triggered by the "message.sent" event.
 *
 * Steps:
 *   1. fetch-context   — validates message is still processing + loads history
 *   2. generate        — calls Gemini (or compatible model) via AI SDK
 *   3. save-result     — writes content back to Convex via HTTP
 *
 * Cancellation:
 *   Inngest automatically cancels this job when a "message.cancel" event
 *   arrives with a matching assistantMessageId (set by requestCancelGeneration
 *   mutation → inngestDispatch.sendMessageCancel).
 *
 * Failure handling:
 *   onFailure fires after all retries are exhausted and marks the Convex
 *   message as failed so the UI doesn't stay permanently in "processing".
 */
export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    retries: 2,
    cancelOn: [
      // Cancel if a "message.cancel" event arrives with the same
      // assistantMessageId as this run's trigger event.
      { event: "message.cancel", match: "data.assistantMessageId" },
    ],
    onFailure: async ({ event, step }) => {
      // event.data.event is the original "message.sent" trigger event.
      const originalData = (
        event.data as { event: { data: MessageSentData } }
      ).event.data;
      const errorMsg = (
        event.data as { error?: { message?: string } }
      ).error?.message ?? "Unknown error after retries";

      await step.run("report-failure-to-convex", async () => {
        try {
          await convexFetch("/internal/chat/fail", {
            messageId: originalData.assistantMessageId,
            nonce: originalData.nonce,
            errorDetail: errorMsg,
          });
        } catch {
          // Non-fatal — Convex may be temporarily unavailable.
          console.error("[processMessage.onFailure] Could not report failure to Convex");
        }
      });
    },
  },
  { event: "message.sent" },
  async ({ event, step }) => {
    const data = event.data as MessageSentData;
    const assistantMessageId =
      typeof data.assistantMessageId === "string"
        ? data.assistantMessageId
        : "";
    const nonce = typeof data.nonce === "string" ? data.nonce : "";
    const modelId = typeof data.modelId === "string" ? data.modelId : "";

    if (!assistantMessageId || !nonce || !modelId) {
      throw new Error(
        `Invalid message.sent payload: ${JSON.stringify(event.data)}`,
      );
    }

    // -------------------------------------------------------------------------
    // Step 1: Fetch context
    // -------------------------------------------------------------------------
    const context = await step.run("fetch-context", async (): Promise<ConvexContext> => {
      const res = await convexFetch("/internal/chat/context", {
        assistantMessageId,
      });
      if (!res.ok) {
        const detail = await readConvexError(res);
        throw new Error(`Context fetch failed [${res.status}]: ${detail}`);
      }
      return res.json() as Promise<ConvexContext>;
    });

    // Guard: already cancelled or nonce mismatch (duplicate dispatch, etc.)
    if (context.status !== "processing" || context.nonce !== nonce) {
      return { skipped: true, reason: "message_not_processing_or_nonce_mismatch" };
    }

    // Guard: model not suitable for text chat (embedding / TTS / live)
    if (!context.isCompatibleModel) {
      await step.run("fail-incompatible-model", async () => {
        await convexFetch("/internal/chat/fail", {
          messageId: assistantMessageId,
          nonce,
          errorDetail: `Model "${modelId}" is not a text chat model. Choose a Gemini Flash or Pro model.`,
        });
      });
      return { skipped: true, reason: "incompatible_model" };
    }

    // Build message history for the model
    const messagesForModel = context.messages
      .filter(
        (m): m is ContextMessage & { role: "user" | "assistant" } =>
          m.status === "completed" &&
          (m.role === "user" || m.role === "assistant") &&
          m.content.trim().length > 0,
      )
      .map((m) => ({
        role: m.role,
        content: clipContent(m.content),
      }));

    if (messagesForModel.length === 0) {
      await step.run("fail-empty-prompt", async () => {
        await convexFetch("/internal/chat/fail", {
          messageId: assistantMessageId,
          nonce,
          errorDetail: "No completed messages found to send to the model.",
        });
      });
      return { skipped: true, reason: "empty_messages" };
    }

    // -------------------------------------------------------------------------
    // Step 2: Call the AI model
    // Inngest checkpoints here — retries start from this step on failure.
    // -------------------------------------------------------------------------
    const googleApiModelId = context.googleApiModelId;

    const content = await step.run("generate-response", async (): Promise<string> => {
      const apiKey = googleApiKey();
      const google = createGoogleGenerativeAI({ apiKey });

      const { text } = await generateText({
        model: google(googleApiModelId),
        system: SYSTEM_PROMPT,
        messages: messagesForModel,
        maxOutputTokens: 8192,
      });

      const trimmed = text.trim();
      return trimmed.length > 0
        ? trimmed
        : "_(The model returned no text. Try again or pick a different model.)_";
    });

    // -------------------------------------------------------------------------
    // Step 3: Persist result to Convex
    // Convex's nonce check prevents double-writes if step 3 is retried.
    // -------------------------------------------------------------------------
    await step.run("save-result", async () => {
      const res = await convexFetch("/internal/chat/complete", {
        messageId: assistantMessageId,
        nonce,
        content,
        status: "completed",
      });
      if (!res.ok) {
        const detail = await readConvexError(res);
        throw new Error(`Save result failed [${res.status}]: ${detail}`);
      }
    });

    return { ok: true, modelId };
  },
);

// ---------------------------------------------------------------------------
// Demo function (kept for testing Inngest connectivity)
// ---------------------------------------------------------------------------

import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g;
const googleDemo = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate-text" },
  { event: "demo/generate-text" },
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string };

    const urls = await step.run("extract-urls", async () => {
      return prompt.match(URL_REGEX) ?? [];
    });

    const scrapedContext = await step.run("scrape-urls", async () => {
      const validUrls = Array.isArray(urls)
        ? urls.filter((u): u is string => typeof u === "string" && u.length > 0)
        : [];
      if (validUrls.length === 0) return "";
      const results = await Promise.all(
        validUrls.map(async (url) => {
          const result = await firecrawl.scrape(url, { formats: ["markdown"] });
          return result.markdown?.trim() ?? "";
        }),
      );
      return results.filter(Boolean).join("\n\n---\n\n");
    });

    const finalPrompt = scrapedContext
      ? `Context from the following pages:\n\n${scrapedContext}\n\n---\n\nUser request: ${prompt}`
      : prompt;

    return await step.run("generate-text", async () => {
      const out = await generateText({
        model: googleDemo("gemini-2.0-flash"),
        prompt: finalPrompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      });
      return { text: out.text, usage: out.usage };
    });
  },
);
