import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import {
  parentIdFromNullable,
  requireProjectId,
  runToolMutation,
  toolSuccess,
} from "./tool-context";

export function createCreateFileTool() {
  return createTool({
    name: "create_file",
    description:
      "Create or update one file. On FILE_ALREADY_EXISTS (recoverable), use read_files + update_file or retry with overwriteExisting: true.",
    parameters: z.object({
      parentId: z
        .string()
        .nullable()
        .describe("Parent folder id, or null for project root"),
      name: z.string().min(1).describe("File name including extension"),
      content: z.string().describe("Full file content"),
      overwriteExisting: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, update when same name exists"),
    }),
    handler: async (
      { parentId, name, content, overwriteExisting },
      { network },
    ) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      return runToolMutation<{
        id: string;
        name: string;
        action: "created" | "updated";
      }>(
        () =>
          convexFetch("/internal/files/create", {
            projectId,
            parentId: parentIdFromNullable(parentId) ?? null,
            name,
            content,
            onConflict: overwriteExisting ? "update" : "fail",
          }),
        (data) =>
          toolSuccess(
            data.action === "updated"
              ? `Updated file "${data.name}"`
              : `Created file "${data.name}"`,
            { id: data.id, name: data.name, action: data.action },
          ),
        { tool: "create_file", projectId, name, parentId },
      );
    },
  });
}
