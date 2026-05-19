export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
  status: string;
};

function sanitizeHistoryContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  // Cap runaway content from malformed rows.
  const maxLen = 12_000;
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}\n…(truncated)`;
}

export function formatConversationHistory(messages: HistoryMessage[]): string {
  return messages
    .filter(
      (m) =>
        m.status === "completed" &&
        (m.role === "user" || m.role === "assistant"),
    )
    .map((m) => {
      const body = sanitizeHistoryContent(m.content);
      if (!body) return "";
      return `${m.role === "user" ? "USER" : "ASSISTANT"}:\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
