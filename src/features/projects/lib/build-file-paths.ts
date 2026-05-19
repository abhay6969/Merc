import type { ProjectFileWithUrl } from "./github-convex";

export type FileWithFullPath = {
  file: ProjectFileWithUrl;
  path: string;
};

export function buildFilePaths(files: ProjectFileWithUrl[]): FileWithFullPath[] {
  const byId = new Map(files.map((f) => [f._id, f]));

  function getFullPath(file: ProjectFileWithUrl): string {
    if (!file.parentId) {
      return file.name;
    }
    const parent = byId.get(file.parentId);
    if (!parent) {
      return file.name;
    }
    return `${getFullPath(parent)}/${file.name}`;
  }

  return files
    .filter((f) => f.type === "file")
    .map((file) => ({
      file,
      path: getFullPath(file),
    }));
}
