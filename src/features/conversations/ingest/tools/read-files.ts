import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import {
  requireProjectId,
  runToolMutation,
  toolFailure,
  toolSuccess,
} from "./tool-context";

export function createReadFilesTool() {
  return createTool({
    name: "read_files",
    description:
      "Read file contents by id from list_files. Use after FILE_ALREADY_EXISTS or before update_file.",
    parameters: z.object({
      fileIds: z
        .array(z.string().min(1))
        .min(1)
        .max(16)
        .describe("File ids to read"),
    }),
    handler: async ({ fileIds }, { network }) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      const result = await runToolMutation<{
        files: Array<{ id: string; name: string; content: string }>;
        missing: string[];
      }>(
        () =>
          convexFetch("/internal/files/read", {
            projectId,
            fileIds,
          }),
        (data) => {
          if (data.files.length === 0 && data.missing.length > 0) {
            return toolFailure(
              `No files found for ids: ${data.missing.join(", ")}`,
              { tool: "read_files", missing: data.missing },
            );
          }
          return toolSuccess(
            `Read ${data.files.length} file(s)`,
            { files: data.files, missing: data.missing },
          );
        },
        { tool: "read_files", projectId, fileIds },
      );

      return result;
    },
  });
}
