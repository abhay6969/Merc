import { createAgent, gemini, type AgentResult } from "@inngest/agent-kit";
import { codingAgentSystemPrompt } from "../constants";
import { googleApiKey } from "../lib/google-api-key";
import { createCodingAgentTools } from "../tools";

/** Inngest step IDs must be unique per inference; AgentKit uses agent.name as the step id. */
function sanitizeStepKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
}

/**
 * @param runKey Stable id for this generation (assistant message id).
 * @param iteration Network loop index — must differ each router pass to avoid duplicate Inngest steps.
 */
export function createCodingAgent(
  googleApiModelId: string,
  runKey: string,
  iteration: number,
  hooks?: { onInferenceResult?: (result: AgentResult) => void },
) {
  const name = `coding_agent_${sanitizeStepKey(runKey)}_${iteration}`;

  return createAgent({
    name,
    description:
      "Project-aware coding assistant with filesystem read/write tools.",
    system: ({ network }) => {
      const projectId =
        (network?.state.data.projectId as string | undefined) ?? "";
      const historyBlock =
        (network?.state.data.historyBlock as string | undefined) ?? "";
      const projectTreeBlock =
        (network?.state.data.projectTreeBlock as string | undefined) ?? "";

      const projectLine = projectId
        ? `\n\n## Active project\nprojectId: ${projectId}`
        : "";
      const treeSection = projectTreeBlock
        ? `\n\n## Project file tree (metadata only)\n${projectTreeBlock}`
        : "";
      const historySection = historyBlock
        ? `\n\n## Conversation history\n${historyBlock}`
        : "";

      return `${codingAgentSystemPrompt}${projectLine}${treeSection}${historySection}`;
    },
    tool_choice: "auto",
    // AgentKit gemini adapter patched (patches/@inngest+agent-kit) to preserve
    // thoughtSignature on tool calls — required for Gemini 2.5/3.
    model: gemini({
      model: googleApiModelId,
      apiKey: googleApiKey(),
      defaultParameters: {
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      },
    }),
    tools: createCodingAgentTools(),
    ...(hooks?.onInferenceResult
      ? {
          lifecycle: {
            onResponse: ({ result }) => {
              hooks.onInferenceResult?.(result);
              return result;
            },
          },
        }
      : {}),
  });
}
