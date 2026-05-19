import { parseMessageSentPayload } from "../types/message-sent";
import type { ProcessMessageResult } from "../types/pipeline";
import { isCancelledSnapshot } from "./cancellation";
import { buildAgentRunContext } from "./build-agent-context";
import { executeCodingNetwork } from "./execute-network";
import { fetchPipelineSnapshot, refreshAssistantStatus } from "./fetch-phase";
import { failAssistantMessage, saveCompletedAssistantMessage } from "./save-result";
import { generateTitleIfNeeded } from "./title-generation";

/** Inngest step.run JSON-serializes results; use explicit casts at call sites. */
export type ProcessMessageStepRunner = (
  stepId: string,
  fn: () => Promise<unknown>,
) => Promise<unknown>;

/**
 * Central AI orchestration pipeline for process-message.
 * Used by inline dispatch and by the Inngest worker (with optional steps).
 */
export async function runProcessMessageWorkflow(
  rawPayload: unknown,
  options?: {
    runStep?: ProcessMessageStepRunner;
  },
): Promise<ProcessMessageResult> {
  const payload = parseMessageSentPayload(rawPayload);
  const runStep = options?.runStep ?? (async (_id, fn) => fn());

  const snapshot = (await runStep("fetch-pipeline", () =>
    fetchPipelineSnapshot(payload),
  )) as Awaited<ReturnType<typeof fetchPipelineSnapshot>>;

  if (isCancelledSnapshot(snapshot, payload)) {
    return { skipped: true, reason: "message_not_processing_or_nonce_mismatch" };
  }

  if (!snapshot.isCompatibleModel) {
    await runStep("fail-incompatible-model", () =>
      failAssistantMessage({
        messageId: payload.messageId,
        nonce: payload.nonce,
        errorDetail: `Model "${payload.modelId}" is not a text chat model. Choose a Gemini Flash or Pro model.`,
      }),
    );
    return { skipped: true, reason: "incompatible_model" };
  }

  const userPrompt = payload.content.trim();
  if (!userPrompt) {
    await runStep("fail-empty-prompt", () =>
      failAssistantMessage({
        messageId: payload.messageId,
        nonce: payload.nonce,
        errorDetail: "No user message found to process.",
      }),
    );
    return { skipped: true, reason: "empty_prompt" };
  }

  await runStep("generate-title", () =>
    generateTitleIfNeeded(snapshot, userPrompt),
  );

  const postTitleStatus = (await runStep(
    "check-cancellation-after-title",
    () => refreshAssistantStatus(payload.messageId),
  )) as Awaited<ReturnType<typeof refreshAssistantStatus>>;
  if (
    postTitleStatus.status !== "processing" ||
    postTitleStatus.nonce !== payload.nonce
  ) {
    return { skipped: true, reason: "cancelled_before_agent" };
  }

  const agentContext = buildAgentRunContext(snapshot);

  // AgentKit registers Inngest steps — must not run inside step.run().
  const content = await executeCodingNetwork(
    snapshot,
    agentContext,
    userPrompt,
  );

  const postNetwork = (await runStep("verify-still-processing", () =>
    refreshAssistantStatus(payload.messageId),
  )) as Awaited<ReturnType<typeof refreshAssistantStatus>>;

  if (
    postNetwork.status !== "processing" ||
    postNetwork.nonce !== payload.nonce
  ) {
    return { skipped: true, reason: "cancelled_before_save" };
  }

  await runStep("save-result", () =>
    saveCompletedAssistantMessage({
      messageId: payload.messageId,
      nonce: payload.nonce,
      content,
    }),
  );

  return { ok: true, modelId: payload.modelId };
}
