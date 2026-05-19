import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import { requireProjectId, runToolMutation, toolSuccess } from "./tool-context";

export function createRenameFileTool() {
  return createTool({
    name: "rename_file",
    description: "Rename a file or folder by id (from list_files).",
    parameters: z.object({
      fileId: z.string().min(1).describe("Id of the file or folder to rename"),
      newName: z.string().min(1).describe("New name"),
    }),
    handler: async ({ fileId, newName }, { network }) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      return runToolMutation<{ ok: true }>(
        () =>
          convexFetch("/internal/files/rename", {
            projectId,
            fileId,
            newName,
          }),
        () =>
          toolSuccess(`Renamed to "${newName}"`, {
            fileId,
            newName,
            action: "renamed",
          }),
        { tool: "rename_file", projectId, fileId, newName },
      );
    },
  });
}
