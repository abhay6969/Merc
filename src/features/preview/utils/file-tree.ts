import type { FileSystemTree } from "@webcontainer/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export type ProjectFile = Doc<"files">;

export function isTextProjectFile(file: ProjectFile): boolean {
  return (
    file.type === "file" &&
    file.storageId === undefined &&
    typeof file.content === "string"
  );
}

export function getFilePath(
  fileId: Id<"files">,
  filesById: Map<Id<"files">, ProjectFile>,
): string {
  const segments: string[] = [];
  let currentId: Id<"files"> | undefined = fileId;

  while (currentId !== undefined) {
    const file = filesById.get(currentId);
    if (file === undefined) {
      break;
    }
    segments.unshift(file.name);
    currentId = file.parentId;
  }

  return segments.join("/");
}

function ensureDirectory(tree: FileSystemTree, dirName: string): FileSystemTree {
  const existing = tree[dirName];
  if (existing !== undefined && "directory" in existing) {
    return existing.directory;
  }
  const directory: FileSystemTree = {};
  tree[dirName] = { directory };
  return directory;
}

function setFileAtPath(
  tree: FileSystemTree,
  pathParts: string[],
  contents: string,
): void {
  if (pathParts.length === 0) {
    return;
  }

  if (pathParts.length === 1) {
    const fileName = pathParts[0];
    tree[fileName] = { file: { contents } };
    return;
  }

  const [dirName, ...rest] = pathParts;
  const directory = ensureDirectory(tree, dirName);
  setFileAtPath(directory, rest, contents);
}

export function buildFileTree(files: ProjectFile[]): FileSystemTree {
  const tree: FileSystemTree = {};
  const filesById = new Map(files.map((file) => [file._id, file]));

  for (const file of files) {
    if (!isTextProjectFile(file)) {
      continue;
    }

    const path = getFilePath(file._id, filesById);
    if (path.length === 0) {
      continue;
    }

    setFileAtPath(tree, path.split("/"), file.content as string);
  }

  return tree;
}

export function listSyncableTextFiles(
  files: ProjectFile[],
): { path: string; content: string; fileId: Id<"files"> }[] {
  const filesById = new Map(files.map((file) => [file._id, file]));
  const result: { path: string; content: string; fileId: Id<"files"> }[] = [];

  for (const file of files) {
    if (!isTextProjectFile(file)) {
      continue;
    }
    result.push({
      fileId: file._id,
      path: getFilePath(file._id, filesById),
      content: file.content as string,
    });
  }

  return result;
}
