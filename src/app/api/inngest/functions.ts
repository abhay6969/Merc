import { inngest } from "@/inngest/client";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const DEFAULT_PROMPT =
  "Write a vegetarian Lasagna recipe in 5 steps for 4 people";

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate-text" },
  { event: "demo/generate-text" },
  async ({ event, step }) => {
    const prompt =
      (event.data.prompt as string)?.trim() || DEFAULT_PROMPT;

    await step.run("generate-text", async () => {
      const apiKey =
        process.env.GOOGLE_API_KEY ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Google API key missing. Set GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in .env.local"
        );
      }
      const google = createGoogleGenerativeAI({ apiKey });
      return await generateText({
        model: google("gemini-2.5-flash"),
        prompt,
      });
    });
  },
);
