import { createState } from "@inngest/agent-kit";
import { titleAgent } from "./agents/title-agent";
import { convexFetch, readConvexError } from "./convex-http";
import { extractAssistantResponse } from "./lib/extract-assistant-response";
import { normalizeConversationTitle } from "./lib/normalize-title";

const PLACEHOLDER_TITLES = ["New chat", "New Conversation"] as const;

function isPlaceholderTitle(title: string): boolean {
  return (PLACEHOLDER_TITLES as readonly string[]).includes(title.trim());
}

/** Derive a title from the first user line when the AI call is unavailable. */
function heuristicTitleFromHistory(historyBlock: string): string {
  const match = historyBlock.match(/^USER:\n([\s\S]*?)(?:\n\n|$)/m);
  const firstUser = match?.[1]?.trim() ?? "";
  if (!firstUser) return "";
  const oneLine = firstUser.split("\n")[0]?.trim() ?? "";
  return normalizeConversationTitle(oneLine);
}

async function generateTitleWithAgent(historyBlock: string): Promise<string> {
  const state = createState({});
  const result = await titleAgent.run(
    `Generate a title for this coding conversation:\n\n${historyBlock.slice(0, 2000)}`,
    { state },
  );
  return normalizeConversationTitle(extractAssistantResponse([result]));
}

export async function maybeGenerateConversationTitle(args: {
  conversationId: string;
  conversationTitle: string;
  historyBlock: string;
}): Promise<void> {
  const { conversationId, conversationTitle, historyBlock } = args;

  if (!isPlaceholderTitle(conversationTitle)) {
    return;
  }
  if (!historyBlock.trim()) {
    return;
  }

  let title = "";
  try {
    title = await generateTitleWithAgent(historyBlock);
  } catch {
    // Quota, unknown model, etc. — fall back without spamming the console.
    title = heuristicTitleFromHistory(historyBlock);
  }

  if (!title || isPlaceholderTitle(title)) {
    title = heuristicTitleFromHistory(historyBlock);
  }
  if (!title || isPlaceholderTitle(title)) {
    return;
  }

  const res = await convexFetch("/internal/conversations/title", {
    conversationId,
    title,
  });
  if (!res.ok) {
    console.warn(
      "[generate-title] Convex update failed:",
      await readConvexError(res),
    );
  }
}
