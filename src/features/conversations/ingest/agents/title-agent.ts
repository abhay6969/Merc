import { createAgent, gemini } from "@inngest/agent-kit";
import { titleGeneratorSystemPrompt, TITLE_MODEL_API_ID } from "../constants";
import { googleApiKey } from "../lib/google-api-key";

export const titleAgent = createAgent({
  name: "title_generator",
  description: "Generates concise conversation titles.",
  system: titleGeneratorSystemPrompt,
  model: gemini({
    model: TITLE_MODEL_API_ID,
    apiKey: googleApiKey(),
    defaultParameters: {
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 32,
      },
    },
  }),
});
