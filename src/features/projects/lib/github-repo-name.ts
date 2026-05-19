import { z } from "zod";

const GITHUB_REPO_NAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

export const githubExportSchema = z.object({
  projectId: z.string().min(1),
  repositoryName: z
    .string()
    .min(1)
    .max(100)
    .regex(
      GITHUB_REPO_NAME_REGEX,
      "Repository name must be GitHub-compatible (letters, numbers, ., _, -)",
    ),
  visibility: z.enum(["public", "private"]),
  description: z.string().max(350).optional(),
});

export type GithubExportInput = z.infer<typeof githubExportSchema>;
