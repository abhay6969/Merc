import ky from "ky";
import { Octokit } from "octokit";

import { inngest } from "@/inngest/client";

import { buildFilePaths } from "../lib/build-file-paths";
import {
  getProjectFilesWithUrls,
  updateExportStatus,
} from "../lib/github-convex";

export type ExportToGitHubEvent = {
  projectId: string;
  repositoryName: string;
  visibility: "public" | "private";
  description?: string;
  githubToken: string;
};

export const exportToGitHub = inngest.createFunction(
  {
    id: "export-to-github",
    retries: 2,
    cancelOn: [{ event: "github/export.cancel", match: "data.projectId" }],
    onFailure: async ({ event, step }) => {
      const original = (event.data as { event?: { data?: ExportToGitHubEvent } })
        .event?.data;
      if (!original?.projectId) return;

      await step.run("mark-export-failed", async () => {
        await updateExportStatus(original.projectId, "failed");
      });
    },
  },
  { event: "github/export.repository" },
  async ({ event, step }) => {
    const { projectId, repositoryName, visibility, description, githubToken } =
      event.data as ExportToGitHubEvent;

    const octokit = new Octokit({ auth: githubToken });

    const repository = await step.run("create-github-repository", async () => {
      const response = await octokit.rest.repos.createForAuthenticatedUser({
        name: repositoryName,
        description: description?.trim() || undefined,
        private: visibility === "private",
        auto_init: true,
      });
      return {
        name: response.data.name,
        htmlUrl: response.data.html_url,
        owner: response.data.owner?.login ?? "",
      };
    });

    await step.sleep("wait-for-repo-init", "3s");

    const initialCommitSha = await step.run("fetch-initial-commit", async () => {
      const ref = await octokit.rest.git.getRef({
        owner: repository.owner,
        repo: repository.name,
        ref: "heads/main",
      });
      return ref.data.object.sha;
    });

    const blobEntries = await step.run("create-github-blobs", async () => {
      const files = await getProjectFilesWithUrls(projectId);
      const paths = buildFilePaths(files);
      const entries: { path: string; sha: string }[] = [];

      for (const { file, path } of paths) {
        if (file.storageUrl) {
          const buffer = Buffer.from(await ky.get(file.storageUrl).arrayBuffer());
          const blob = await octokit.rest.git.createBlob({
            owner: repository.owner,
            repo: repository.name,
            content: buffer.toString("base64"),
            encoding: "base64",
          });
          if (!blob.data.sha) {
            throw new Error(`Failed to create blob for ${path}`);
          }
          entries.push({ path, sha: blob.data.sha });
          continue;
        }

        const blob = await octokit.rest.git.createBlob({
          owner: repository.owner,
          repo: repository.name,
          content: file.content ?? "",
          encoding: "utf-8",
        });
        if (!blob.data.sha) {
          throw new Error(`Failed to create blob for ${path}`);
        }
        entries.push({ path, sha: blob.data.sha });
      }

      return entries;
    });

    const newCommitSha = await step.run("commit-tree-and-update-ref", async () => {
      const tree = await octokit.rest.git.createTree({
        owner: repository.owner,
        repo: repository.name,
        tree: blobEntries.map((entry) => ({
          path: entry.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: entry.sha,
        })),
      });

      const commit = await octokit.rest.git.createCommit({
        owner: repository.owner,
        repo: repository.name,
        message: "Export from Merc",
        tree: tree.data.sha!,
        parents: [initialCommitSha],
      });

      await octokit.rest.git.updateRef({
        owner: repository.owner,
        repo: repository.name,
        ref: "heads/main",
        sha: commit.data.sha!,
        force: true,
      });

      return commit.data.sha;
    });

    await step.run("mark-export-completed", async () => {
      await updateExportStatus(projectId, "completed", repository.htmlUrl);
    });

    return {
      projectId,
      repositoryName: repository.name,
      htmlUrl: repository.htmlUrl,
      commitSha: newCommitSha,
    };
  },
);
