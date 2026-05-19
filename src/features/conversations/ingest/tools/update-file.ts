import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import { requireProjectId, runToolMutation, toolSuccess } from "./tool-context";

export function createUpdateFileTool() {
  return createTool({
    name: "update_file",
    description:
      "Replace file content by id. Preferred recovery path when FILE_ALREADY_EXISTS on create.",
    parameters: z.object({
      fileId: z.string().min(1).describe("Id of the file to update"),
      content: z.string().describe("New full file content"),
    }),
    handler: async ({ fileId, content }, { network }) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      return runToolMutation<{ ok: true; fileId: string }>(
        () =>
          convexFetch("/internal/files/update", {
            projectId,
            fileId,
            content,
          }),
        () =>
          toolSuccess(`Updated file (id: ${fileId})`, {
            fileId,
            action: "updated",
          }),
        { tool: "update_file", projectId, fileId },
      );
    },
  });
}
