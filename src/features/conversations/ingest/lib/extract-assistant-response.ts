import type { AgentResult, Message } from "@inngest/agent-kit";

function textFromMessage(msg: Message): string {
  if (msg.type !== "text") return "";
  const { content } = msg;
  if (typeof content === "string") return content;
  return content.map((part) => part.text).join("");
}

/** Extract the latest non-empty assistant text from AgentKit network results. */
export function extractAssistantResponse(results: AgentResult[]): string {
  for (let i = results.length - 1; i >= 0; i -= 1) {
    const result = results[i];
    for (let j = result.output.length - 1; j >= 0; j -= 1) {
      const msg = result.output[j];
      if (msg.type === "text" && msg.role === "assistant") {
        const text = textFromMessage(msg).trim();
        if (text.length > 0) return text;
      }
    }
  }
  return "_(No response generated. Try again.)_";
}
