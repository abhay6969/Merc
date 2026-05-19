import { classifyToolError } from "../lib/classify-tool-error";
import type { ToolResult } from "../types/tool-result";

type NetworkLike = {
  state: { data: Record<string, unknown> };
};

export type ToolHandlerContext = {
  network?: NetworkLike;
};

export function toolSuccess(
  message: string,
  data?: Record<string, unknown>,
): ToolResult {
  return {
    success: true,
    message,
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
  };
}

export function toolFailure(
  message: string,
  context?: Record<string, unknown>,
): ToolResult {
  return {
    success: false,
    error: classifyToolError(message, context),
  };
}

export function requireProjectId(
  network: ToolHandlerContext["network"],
): string | ToolResult {
  const projectId = network?.state.data.projectId;
  if (typeof projectId !== "string" || projectId.length === 0) {
    return toolFailure("Missing project context", { tool: "requireProjectId" });
  }
  return projectId;
}

/** AgentKit optional fields use null; Convex uses undefined for project root. */
export function parentIdFromNullable(
  parentId: string | null,
): string | undefined {
  if (parentId === null || parentId === "") {
    return undefined;
  }
  return parentId;
}

export async function runToolMutation<T extends Record<string, unknown>>(
  fn: () => Promise<Response>,
  onSuccess: (data: T) => ToolResult,
  errorContext?: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    const res = await fn();
    if (!res.ok) {
      const { readConvexError } = await import("../convex-http");
      const message = await readConvexError(res);
      return toolFailure(message, errorContext);
    }
    const data = (await res.json()) as T;
    return onSuccess(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tool request failed";
    return toolFailure(message, errorContext);
  }
}
