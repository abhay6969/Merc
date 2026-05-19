import { createState, type AgentResult } from "@inngest/agent-kit";
import { createCodingAgent } from "../agents/coding-agent";
import { CODING_AGENT_MAX_TOOL_ITER } from "../constants";
import { extractAssistantResponse } from "../lib/extract-assistant-response";
import {
  hasRecoverableToolFailures,
  synthesizeResponseFromToolResults,
} from "../lib/synthesize-tool-response";
import type { AgentRunContext } from "../types/pipeline";
import type { PipelineSnapshot } from "../types/pipeline";

/**
 * Run the coding agent with an internal tool loop (infer → tools → infer …).
 * Recoverable tool errors return structured JSON so the model can adapt and continue.
 */
export async function executeCodingNetwork(
  snapshot: PipelineSnapshot,
  agentContext: AgentRunContext,
  userPrompt: string,
): Promise<string> {
  const inferenceResults: AgentResult[] = [];
  const agent = createCodingAgent(
    snapshot.googleApiModelId,
    snapshot.messageId,
    0,
    {
      onInferenceResult: (result) => {
        inferenceResults.push(result);
      },
    },
  );

  const state = createState({
    projectId: agentContext.projectId,
    conversationId: agentContext.conversationId,
    messageId: agentContext.messageId,
    historyBlock: agentContext.historyBlock,
    projectTreeBlock: agentContext.projectTreeBlock,
  });

  try {
    const result = await agent.run(userPrompt, {
      state,
      maxIter: CODING_AGENT_MAX_TOOL_ITER,
    });

    const content = extractAssistantResponse([result]);
    if (content && !content.startsWith("_(")) {
      return content;
    }

    if (hasRecoverableToolFailures(inferenceResults)) {
      return (
        synthesizeResponseFromToolResults(inferenceResults) ??
        "Some steps need another pass — inspect the project with list_files and continue with update_file or overwriteExisting."
      );
    }
  } catch (error) {
    console.error(
      "[executeCodingNetwork] Agent run failed after tools may have run:",
      error,
    );
  }

  const toolSummary = synthesizeResponseFromToolResults(inferenceResults);
  if (toolSummary) {
    return toolSummary;
  }

  return "I could not produce a response. Please try again or rephrase your request.";
}
