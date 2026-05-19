import type {
  StructuredToolError,
  ToolErrorCode,
  ToolSuggestedAction,
} from "../types/tool-result";

export function classifyToolError(
  message: string,
  context?: Record<string, unknown>,
): StructuredToolError {
  const lower = message.toLowerCase();

  if (lower.includes("unauthorized") || lower.includes("internal_api_key")) {
    return build("UNAUTHORIZED", message, false, "none", context);
  }

  if (lower.includes("permission denied")) {
    return build("PERMISSION_DENIED", message, false, "none", context);
  }

  if (
    lower.includes("file named") &&
    lower.includes("already exists")
  ) {
    return build(
      "FILE_ALREADY_EXISTS",
      message,
      true,
      "update_file",
      context,
    );
  }

  if (
    lower.includes("folder named") &&
    lower.includes("already exists")
  ) {
    return build(
      "FOLDER_ALREADY_EXISTS",
      message,
      true,
      "skip",
      context,
    );
  }

  if (lower.includes("parent folder not found") || lower.includes("parent must be a folder")) {
    return build("INVALID_PARENT", message, true, "list_files", context);
  }

  if (lower.includes("file not found") || lower.includes("not found")) {
    return build("NOT_FOUND", message, true, "list_files", context);
  }

  if (lower.includes("missing project context")) {
    return build("MISSING_PROJECT_CONTEXT", message, false, "none", context);
  }

  if (lower.includes("invalid") && lower.includes("path")) {
    return build("INVALID_PATH", message, true, "list_files", context);
  }

  if (lower.includes("empty") || lower.includes("cannot be empty")) {
    return build("VALIDATION_ERROR", message, true, "inspect_and_adapt", context);
  }

  return build("UNKNOWN", message, true, "inspect_and_adapt", context);
}

function build(
  code: ToolErrorCode,
  message: string,
  recoverable: boolean,
  suggestedAction: ToolSuggestedAction,
  context?: Record<string, unknown>,
): StructuredToolError {
  return {
    code,
    message,
    recoverable,
    suggestedAction,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };
}
