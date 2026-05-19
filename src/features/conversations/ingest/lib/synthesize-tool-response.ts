import type { AgentResult } from "@inngest/agent-kit";
import type { ToolResult } from "../types/tool-result";
import { isLegacyToolError, isToolFailure } from "../types/tool-result";

function unwrapToolPayload(content: unknown): unknown {
  if (typeof content === "object" && content !== null && "data" in content) {
    return (content as { data: unknown }).data;
  }
  return content;
}

function describePayload(payload: unknown): string | null {
  if (payload === null || payload === undefined) return null;

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (isLegacyToolError(payload)) {
    return `Failed: ${payload.error}`;
  }

  const result = payload as ToolResult;
  if (typeof result === "object" && result !== null && "success" in result) {
    if (result.success) {
      return result.message;
    }
    const { error } = result;
    const recovery = error.recoverable
      ? ` (recoverable — try ${error.suggestedAction})`
      : "";
    return `[${error.code}] ${error.message}${recovery}`;
  }

  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string") {
      return record.message;
    }
  }

  try {
    const json = JSON.stringify(payload);
    return json.length > 320 ? `${json.slice(0, 320)}…` : json;
  } catch {
    return null;
  }
}

/** Build a user-visible reply when the model fails after tools already ran. */
export function synthesizeResponseFromToolResults(
  results: AgentResult[],
): string | null {
  const lines: string[] = [];

  for (const result of results) {
    for (const entry of result.toolCalls) {
      if (entry.type !== "tool_result") continue;
      const line = describePayload(unwrapToolPayload(entry.content));
      if (line) lines.push(line);
    }
  }

  if (lines.length === 0) return null;

  const fatal = lines.some((l) => l.includes("UNAUTHORIZED") || l.includes("PERMISSION_DENIED"));
  const header = fatal
    ? "Generation stopped due to a fatal error. Partial progress:\n"
    : "";

  return header + [...new Set(lines)].join("\n");
}

/** True if the latest tool results include recoverable failures the model should retry. */
export function hasRecoverableToolFailures(results: AgentResult[]): boolean {
  for (const result of results) {
    for (const entry of result.toolCalls) {
      if (entry.type !== "tool_result") continue;
      const payload = unwrapToolPayload(entry.content);
      if (
        typeof payload === "object" &&
        payload !== null &&
        "success" in payload &&
        (payload as ToolResult).success === false &&
        (payload as Extract<ToolResult, { success: false }>).error.recoverable
      ) {
        return true;
      }
    }
  }
  return false;
}
