import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import {
  parentIdFromNullable,
  requireProjectId,
  runToolMutation,
  toolSuccess,
} from "./tool-context";

const fileEntrySchema = z.object({
  name: z.string().min(1).describe("File name including extension"),
  content: z.string().describe("Full file content"),
});

export function createCreateFilesTool() {
  return createTool({
    name: "create_files",
    description:
      "Batch create/update files. Default overwriteExisting=true for scaffolding. On partial conflicts, inspect list_files and adapt.",
    parameters: z.object({
      parentId: z
        .string()
        .nullable()
        .describe("Parent folder id, or null for project root"),
      files: z
        .array(fileEntrySchema)
        .min(1)
        .max(20)
        .describe("Files to create"),
      overwriteExisting: z
        .boolean()
        .optional()
        .default(true)
        .describe("Update existing same-named files instead of failing"),
    }),
    handler: async ({ parentId, files, overwriteExisting }, { network }) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      return runToolMutation<{
        ids: string[];
        names: string[];
        created: string[];
        updated: string[];
      }>(
        () =>
          convexFetch("/internal/files/create-many", {
            projectId,
            parentId: parentIdFromNullable(parentId) ?? null,
            files,
            onConflict: overwriteExisting ? "update" : "fail",
          }),
        (data) => {
          const parts: string[] = [];
          if (data.created.length > 0) {
            parts.push(`Created: ${data.created.join(", ")}`);
          }
          if (data.updated.length > 0) {
            parts.push(`Updated: ${data.updated.join(", ")}`);
          }
          return toolSuccess(
            parts.length > 0 ? parts.join(". ") : "No files changed",
            {
              ids: data.ids,
              names: data.names,
              created: data.created,
              updated: data.updated,
            },
          );
        },
        {
          tool: "create_files",
          projectId,
          fileNames: files.map((f) => f.name),
        },
      );
    },
  });
}
