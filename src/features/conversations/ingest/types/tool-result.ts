export type ToolErrorCode =
  | "FILE_ALREADY_EXISTS"
  | "FOLDER_ALREADY_EXISTS"
  | "NOT_FOUND"
  | "INVALID_PARENT"
  | "INVALID_PATH"
  | "MISSING_PROJECT_CONTEXT"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "PERMISSION_DENIED"
  | "REQUEST_FAILED"
  | "UNKNOWN";

export type ToolSuggestedAction =
  | "list_files"
  | "read_files"
  | "update_file"
  | "create_file"
  | "create_files"
  | "create_folder"
  | "rename_file"
  | "delete_file"
  | "retry_with_overwrite"
  | "skip"
  | "inspect_and_adapt"
  | "none";

export type StructuredToolError = {
  code: ToolErrorCode;
  message: string;
  recoverable: boolean;
  suggestedAction: ToolSuggestedAction;
  context?: Record<string, unknown>;
};

export type ToolResult =
  | {
      success: true;
      message: string;
      data?: Record<string, unknown>;
    }
  | {
      success: false;
      error: StructuredToolError;
    };

export function isToolFailure(
  result: ToolResult | { error: string },
): result is Extract<ToolResult, { success: false }> {
  return (
    typeof result === "object" &&
    result !== null &&
    "success" in result &&
    result.success === false
  );
}

export function isLegacyToolError(
  result: unknown,
): result is { error: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as { error: unknown }).error === "string" &&
    !("success" in result)
  );
}
