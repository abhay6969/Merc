import { createNetwork, gemini, type AgentResult } from "@inngest/agent-kit";
import { createCodingAgent } from "../agents/coding-agent";
import { CODING_NETWORK_MAX_ITER } from "../constants";
import { googleApiKey } from "../lib/google-api-key";
import { extractAssistantResponse } from "../lib/extract-assistant-response";

function lastResultHasToolWork(result: AgentResult | undefined): boolean {
  if (!result) return false;
  if (result.toolCalls.length > 0) return true;
  return result.output.some((m) => m.type === "tool_call");
}

function lastResultNeedsFollowUp(result: AgentResult | undefined): boolean {
  if (!result) return false;
  if (lastResultHasToolWork(result)) return true;
  const text = extractAssistantResponse([result]).toLowerCase();
  return (
    text.includes("missing project context") ||
    text.includes("lack access") ||
    text.includes("cannot read") ||
    text.includes("can't read") ||
    text.includes("don't have access")
  );
}

/**
 * Each router pass returns a fresh agent with a unique name so Inngest
 * `step.ai.infer` IDs do not collide across tool-loop iterations.
 */
export function createCodingNetwork(
  googleApiModelId: string,
  runKey: string,
) {
  const agentForIteration = (iteration: number) =>
    createCodingAgent(googleApiModelId, runKey, iteration);

  return createNetwork({
    name: "merc-coding-network",
    agents: [agentForIteration(0)],
    maxIter: CODING_NETWORK_MAX_ITER,
    defaultModel: gemini({
      model: googleApiModelId,
      apiKey: googleApiKey(),
      defaultParameters: {
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      },
    }),
    router: ({ lastResult, callCount }) => {
      if (callCount >= CODING_NETWORK_MAX_ITER) {
        return undefined;
      }
      if (!lastResult) {
        return agentForIteration(callCount);
      }
      if (lastResultNeedsFollowUp(lastResult)) {
        return agentForIteration(callCount);
      }
      const text = extractAssistantResponse([lastResult]);
      if (text && !text.startsWith("_(")) {
        return undefined;
      }
      return agentForIteration(callCount);
    },
  });
}
