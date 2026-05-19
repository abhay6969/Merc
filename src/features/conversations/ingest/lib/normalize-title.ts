export function normalizeConversationTitle(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ");
  if (!stripped) return "";
  return stripped.slice(0, 120);
}
