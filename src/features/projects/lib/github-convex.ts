import {
  convexFetch,
  parseConvexErrorMessage,
  readConvexError,
} from "@/features/conversations/ingest/convex-http";

import type { Id } from "../../../../convex/_generated/dataModel";

export type ProjectFileWithUrl = {
  _id: Id<"files">;
  projectId: Id<"project">;
  parentId?: Id<"files">;
  name: string;
  type: "file" | "folder";
  content?: string;
  storageId?: Id<"_storage">;
  updatedAt: number;
  storageUrl: string | null;
};

async function systemFetch<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await convexFetch(path, body);
  if (!res.ok) {
    throw new Error(await readConvexError(res));
  }
  return (await res.json()) as T;
}

export async function cleanupProject(projectId: string): Promise<void> {
  await systemFetch("/internal/system/cleanup", { projectId });
}

export async function generateUploadUrl(): Promise<string> {
  const data = await systemFetch<{ uploadUrl: string }>(
    "/internal/system/generate-upload-url",
    {},
  );
  return data.uploadUrl;
}

export async function createBinaryFile(args: {
  projectId: string;
  name: string;
  storageId: string;
  parentId: string | null;
}): Promise<{ id: string }> {
  return systemFetch("/internal/system/create-binary-file", args);
}

export async function updateImportStatus(
  projectId: string,
  importStatus: "importing" | "completed" | "failed",
): Promise<void> {
  await systemFetch("/internal/system/update-import-status", {
    projectId,
    importStatus,
  });
}

export async function updateExportStatus(
  projectId: string,
  exportStatus: "exporting" | "completed" | "failed" | "cancelled",
  exportRepoUrl?: string,
): Promise<void> {
  await systemFetch("/internal/system/update-export-status", {
    projectId,
    exportStatus,
    ...(exportRepoUrl !== undefined ? { exportRepoUrl } : {}),
  });
}

export async function getProjectFilesWithUrls(
  projectId: string,
): Promise<ProjectFileWithUrl[]> {
  const data = await systemFetch<{ files: ProjectFileWithUrl[] }>(
    "/internal/system/get-project-files-with-urls",
    { projectId },
  );
  return data.files;
}

export async function createTextFile(args: {
  projectId: string;
  parentId: string | null;
  name: string;
  content: string;
}): Promise<void> {
  const res = await convexFetch("/internal/files/create", {
    ...args,
    onConflict: "update",
  });
  if (!res.ok) {
    throw new Error(parseConvexErrorMessage(await res.text()));
  }
}

export async function createFolder(args: {
  projectId: string;
  parentId: string | null;
  name: string;
}): Promise<{ id: string }> {
  const res = await convexFetch("/internal/files/create-folder", {
    ...args,
    skipIfExists: true,
  });
  if (!res.ok) {
    throw new Error(parseConvexErrorMessage(await res.text()));
  }
  return (await res.json()) as { id: string };
}
