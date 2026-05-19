import type { MessageSentEventPayload } from "../types/message-sent";
import type { PipelineSnapshot } from "../types/pipeline";

export function isCancelledSnapshot(
  snapshot: PipelineSnapshot,
  payload: MessageSentEventPayload,
): boolean {
  if (snapshot.status === "cancelled") return true;
  if (snapshot.status !== "processing") return true;
  if (snapshot.nonce !== payload.nonce) return true;
  return false;
}
