import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import {
  parentIdFromNullable,
  requireProjectId,
  runToolMutation,
  toolSuccess,
} from "./tool-context";

export function createCreateFolderTool() {
  return createTool({
    name: "create_folder",
    description:
      "Create a folder. Default skipIfExists=true reuses existing folders (recoverable FOLDER_ALREADY_EXISTS).",
    parameters: z.object({
      parentId: z
        .string()
        .nullable()
        .describe("Parent folder id, or null for project root"),
      name: z.string().min(1).describe("Folder name"),
      skipIfExists: z
        .boolean()
        .optional()
        .default(true)
        .describe("Reuse existing folder instead of failing"),
    }),
    handler: async ({ parentId, name, skipIfExists }, { network }) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      return runToolMutation<{
        id: string;
        name: string;
        action: "created" | "skipped";
      }>(
        () =>
          convexFetch("/internal/files/create-folder", {
            projectId,
            parentId: parentIdFromNullable(parentId) ?? null,
            name,
            skipIfExists,
          }),
        (data) =>
          toolSuccess(
            data.action === "skipped"
              ? `Folder "${data.name}" already exists — reusing it`
              : `Created folder "${data.name}"`,
            { id: data.id, name: data.name, action: data.action },
          ),
        { tool: "create_folder", projectId, name },
      );
    },
  });
}
