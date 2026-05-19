import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { convexFetch } from "../convex-http";
import {
  requireProjectId,
  runToolMutation,
  toolSuccess,
} from "./tool-context";

export function createListFilesTool() {
  return createTool({
    name: "list_files",
    description:
      "List all files and folders. Returns structured success with files array. Always call before writes or after recoverable errors.",
    parameters: z.object({}),
    handler: async (_input, { network }) => {
      const projectId = requireProjectId(network);
      if (typeof projectId !== "string") {
        return projectId;
      }

      return runToolMutation<{
        files: Array<{
          id: string;
          name: string;
          type: "file" | "folder";
          parentId: string | null;
        }>;
      }>(
        () => convexFetch("/internal/files/list", { projectId }),
        (data) => {
          const fileCount = data.files.filter((f) => f.type === "file").length;
          const folderCount = data.files.filter(
            (f) => f.type === "folder",
          ).length;
          return toolSuccess(
            `Listed ${data.files.length} items (${fileCount} files, ${folderCount} folders)`,
            {
              files: data.files,
              count: fileCount,
              folderCount,
              hint: "parentId null = project root",
            },
          );
        },
        { tool: "list_files", projectId },
      );
    },
  });
}
