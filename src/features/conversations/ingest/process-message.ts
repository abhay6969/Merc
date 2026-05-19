import type { ProcessMessageResult } from "./types/pipeline";
import { runProcessMessageWorkflow } from "./workflow/process-message-workflow";

export type { ProcessMessageResult } from "./types/pipeline";
export { parseMessageSentPayload } from "./types/message-sent";
export type { MessageSentEventPayload } from "./types/message-sent";

/**
 * Inline AI pipeline (no Inngest steps). Used when INNGEST_INLINE=1 or fallback.
 */
export async function executeProcessMessage(
  rawPayload: unknown,
): Promise<ProcessMessageResult> {
  return runProcessMessageWorkflow(rawPayload);
}
