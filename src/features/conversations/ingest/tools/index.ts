import { createCreateFileTool } from "./create-file";
import { createCreateFilesTool } from "./create-files";
import { createCreateFolderTool } from "./create-folder";
import { createDeleteFileTool } from "./delete-file";
import { createListFilesTool } from "./list-files";
import { createReadFilesTool } from "./read-files";
import { createRenameFileTool } from "./rename-file";
import { createUpdateFileTool } from "./update-file";

/** All filesystem tools for the coding agent (factory-assembled). */
export function createCodingAgentTools() {
  return [
    createListFilesTool(),
    createReadFilesTool(),
    createCreateFileTool(),
    createCreateFilesTool(),
    createUpdateFileTool(),
    createCreateFolderTool(),
    createRenameFileTool(),
    createDeleteFileTool(),
  ];
}

export { createListFilesTool } from "./list-files";
export { createReadFilesTool } from "./read-files";
export { createCreateFileTool } from "./create-file";
export { createUpdateFileTool } from "./update-file";
export { createCreateFilesTool } from "./create-files";
export { createCreateFolderTool } from "./create-folder";
export { createRenameFileTool } from "./rename-file";
export { createDeleteFileTool } from "./delete-file";
export type { ToolResult, StructuredToolError, ToolErrorCode } from "../types/tool-result";
export { toolSuccess, toolFailure } from "./tool-context";
