import { inngest } from "@/inngest/client";
import { convexFetch } from "@/features/conversations/ingest/convex-http";
import { exportToGitHub } from "@/features/projects/inngest/export-to-github";
import { importGitHubRepository } from "@/features/projects/inngest/import-github-repository";
import { parseMessageSentPayload } from "@/features/conversations/ingest/types/message-sent";
import { runProcessMessageWorkflow } from "@/features/conversations/ingest/workflow/process-message-workflow";

export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    retries: 2,
    cancelOn: [{ event: "message.cancel", match: "data.messageId" }],
    onFailure: async ({ event, step }) => {
      const originalEvent = (event.data as { event?: { data?: unknown } })
        .event;
      let messageId = "";
      let nonce = "";
      try {
        const payload = parseMessageSentPayload(originalEvent?.data ?? {});
        messageId = payload.messageId;
        nonce = payload.nonce;
      } catch {
        console.error(
          "[processMessage.onFailure] Invalid message.sent payload",
          originalEvent?.data,
        );
        return;
      }

      const errorMsg =
        (event.data as { error?: { message?: string } }).error?.message ??
        "Unknown error after retries";

      if (!messageId || !nonce) {
        console.error(
          "[processMessage.onFailure] Missing messageId/nonce in event",
        );
        return;
      }

      await step.run("report-failure-to-convex", async () => {
        try {
          await convexFetch("/internal/chat/fail", {
            messageId,
            nonce,
            errorDetail: errorMsg,
          });
        } catch {
          console.error(
            "[processMessage.onFailure] Could not report failure to Convex",
          );
        }
      });
    },
  },
  { event: "message.sent" },
  async ({ event, step }) => {
    return runProcessMessageWorkflow(event.data, {
      runStep: (stepId, fn) => step.run(stepId, fn),
    });
  },
);

// ---------------------------------------------------------------------------
// Demo function (kept for testing Inngest connectivity)
// ---------------------------------------------------------------------------

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g;
const googleDemo = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export const importGitHubRepositoryFn = importGitHubRepository;
export const exportToGitHubFn = exportToGitHub;

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
