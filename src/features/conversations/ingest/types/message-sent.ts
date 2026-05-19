import { z } from "zod";

/** Strongly typed `message.sent` event — single source of truth for the pipeline. */
export const messageSentEventSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  projectId: z.string().min(1),
  content: z.string().min(1),
  nonce: z.string().min(1),
  modelId: z.string().min(1),
});

export type MessageSentEventPayload = z.infer<typeof messageSentEventSchema>;

export function parseMessageSentPayload(
  raw: unknown,
): MessageSentEventPayload {
  const parsed = messageSentEventSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid message.sent payload: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }
  return {
    ...parsed.data,
    content: parsed.data.content.trim(),
  };
}
