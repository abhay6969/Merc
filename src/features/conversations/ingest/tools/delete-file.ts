import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import { requireProjectId, runToolMutation, toolSuccess } from "./tool-context";

export function createDeleteFileTool() {
  return createTool({
    name: "delete_file",
    description:
      "Delete a file or folder by id. Folders delete descendants recursively.",
    parameters: z.object({
      fileId: z.string().min(1).describe("Id of the file or folder to delete"),
    }),
    handler: async ({ fileId }, { network }) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      return runToolMutation<{ ok: true }>(
        () =>
          convexFetch("/internal/files/delete", {
            projectId,
            fileId,
          }),
        () =>
          toolSuccess(`Deleted item (id: ${fileId})`, {
            fileId,
            action: "deleted",
          }),
        { tool: "delete_file", projectId, fileId },
      );
    },
  });
}
