import { isBinaryFile } from "isbinaryfile";
import ky from "ky";
import { Octokit } from "octokit";

import { inngest } from "@/inngest/client";

import {
  cleanupProject,
  createBinaryFile,
  createFolder,
  createTextFile,
  generateUploadUrl,
  updateImportStatus,
} from "../lib/github-convex";

export type ImportGitHubRepositoryEvent = {
  projectId: string;
  owner: string;
  repo: string;
  githubToken: string;
};

async function resolveDefaultBranchSha(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string> {
  const repoMeta = await octokit.rest.repos.get({ owner, repo });
  const candidates = [
    repoMeta.data.default_branch,
    "main",
    "master",
  ].filter((b, i, arr): b is string => Boolean(b) && arr.indexOf(b) === i);

  for (const branch of candidates) {
    try {
      const ref = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      return ref.data.object.sha;
    } catch {
      continue;
    }
  }

  throw new Error("Could not resolve default branch for repository");
}

export const importGitHubRepository = inngest.createFunction(
  {
    id: "import-github-repository",
    retries: 2,
    onFailure: async ({ event, step }) => {
      const original = (event.data as { event?: { data?: ImportGitHubRepositoryEvent } })
        .event?.data;
      if (!original?.projectId) return;

      await step.run("mark-import-failed", async () => {
        await updateImportStatus(original.projectId, "failed");
      });
    },
  },
  { event: "github/import.repository" },
  async ({ event, step }) => {
    const { projectId, owner, repo, githubToken } =
      event.data as ImportGitHubRepositoryEvent;

    const octokit = new Octokit({ auth: githubToken });

    await step.run("cleanup-project", async () => {
      await cleanupProject(projectId);
    });

    const treeItems = await step.run("fetch-repository-tree", async () => {
      const sha = await resolveDefaultBranchSha(octokit, owner, repo);
      const tree = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: sha,
        recursive: "true",
      });
      return tree.data.tree.filter(
        (item): item is typeof item & { path: string } =>
          Boolean(item.path) && (item.type === "blob" || item.type === "tree"),
      );
    });

    const folderPaths = treeItems
      .filter((item) => item.type === "tree")
      .map((item) => item.path)
      .sort((a, b) => a.split("/").length - b.split("/").length);

    const folderMap = await step.run("create-folders", async () => {
      const map: Record<string, string> = {};

      for (const folderPath of folderPaths) {
        const segments = folderPath.split("/");
        const name = segments[segments.length - 1] ?? folderPath;
        const parentPath = segments.slice(0, -1).join("/");
        const parentId = parentPath.length > 0 ? (map[parentPath] ?? null) : null;

        const created = await createFolder({
          projectId,
          parentId,
          name,
        });
        map[folderPath] = created.id;
      }

      return map;
    });

    await step.run("import-files", async () => {
      const blobs = treeItems.filter((item) => item.type === "blob");

      for (const blob of blobs) {
        if (!blob.sha || !blob.path) continue;

        const segments = blob.path.split("/");
        const name = segments[segments.length - 1] ?? blob.path;
        const parentPath = segments.slice(0, -1).join("/");
        const parentId =
          parentPath.length > 0 ? (folderMap[parentPath] ?? null) : null;

        const blobData = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: blob.sha,
        });

        const buffer = Buffer.from(
          blobData.data.content,
          blobData.data.encoding === "base64" ? "base64" : "utf8",
        );

        if (await isBinaryFile(buffer)) {
          const uploadUrl = await generateUploadUrl();
          const uploadResult = await ky
            .post(uploadUrl, {
              body: buffer,
              headers: { "Content-Type": "application/octet-stream" },
            })
            .json<{ storageId: string }>();

          await createBinaryFile({
            projectId,
            name,
            storageId: uploadResult.storageId,
            parentId,
          });
        } else {
          await createTextFile({
            projectId,
            parentId,
            name,
            content: buffer.toString("utf8"),
          });
        }
      }
    });

    await step.run("mark-import-completed", async () => {
      await updateImportStatus(projectId, "completed");
    });

    return { projectId, owner, repo };
  },
);
