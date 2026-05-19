import { convexFetch, readConvexError } from "../convex-http";

export async function saveCompletedAssistantMessage(args: {
  messageId: string;
  nonce: string;
  content: string;
}): Promise<void> {
  const res = await convexFetch("/internal/chat/complete", {
    messageId: args.messageId,
    nonce: args.nonce,
    content: args.content,
    status: "completed",
  });
  if (!res.ok) {
    throw new Error(
      `Save result failed [${res.status}]: ${await readConvexError(res)}`,
    );
  }
}

export async function failAssistantMessage(args: {
  messageId: string;
  nonce: string;
  errorDetail: string;
}): Promise<void> {
  const res = await convexFetch("/internal/chat/fail", {
    messageId: args.messageId,
    nonce: args.nonce,
    errorDetail: args.errorDetail,
  });
  if (!res.ok) {
    throw new Error(
      `Fail assistant failed [${res.status}]: ${await readConvexError(res)}`,
    );
  }
}
