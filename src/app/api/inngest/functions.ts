import { inngest } from "@/inngest/client";
import { firecrawl } from "@/lib/firecrawl";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const URL_REGEX = /https?:\/\/[^\s]+/g;

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
          const result = await firecrawl.scrape(url, {
            formats: ["markdown"],
          });
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
        model: google("gemini-2.5-flash"),
        prompt: finalPrompt,
        experimental_telemetry:{
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        }
      });

      return { text: out.text, usage: out.usage };
    });
  },
);
