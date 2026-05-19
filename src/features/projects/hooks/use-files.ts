import { useMutation, useQuery } from "convex/react";
import type { OptimisticLocalStore } from "convex/browser";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { sortFiles } from "../lib/sort-files";

type FolderScope = {
  projectId: Id<"project">;
  parentId?: Id<"files">;
};

function patchFolderContents(
  localStore: OptimisticLocalStore,
  scope: FolderScope,
  updater: (files: Doc<"files">[]) => Doc<"files">[],
) {
  const existing = localStore.getQuery(api.files.getFolderContents, {
    projectId: scope.projectId,
    parentId: scope.parentId,
  });
  if (existing === undefined) return;
  localStore.setQuery(
    api.files.getFolderContents,
    { projectId: scope.projectId, parentId: scope.parentId },
    sortFiles(updater(existing)),
  );
}

function patchAllFiles(
  localStore: OptimisticLocalStore,
  projectId: Id<"project">,
  updater: (files: Doc<"files">[]) => Doc<"files">[],
) {
  const all = localStore.getQuery(api.files.getFiles, { projectId });
  if (all === undefined) return;
  localStore.setQuery(api.files.getFiles, { projectId }, updater(all));
}

export function useFiles(
  projectId: Id<"project"> | null,
  options?: { skip?: boolean },
) {
  const skip = options?.skip === true || projectId === null;

  return useQuery(
    api.files.getFiles,
    skip ? "skip" : { projectId },
  );
}

export function useCreateFile(scope: FolderScope) {
  return useMutation(api.files.createFile).withOptimisticUpdate(
    (localStore, args) => {
      const now = Date.now();
      const optimistic: Doc<"files"> = {
        _id: crypto.randomUUID() as Id<"files">,
        _creationTime: now,
        projectId: args.projectId,
        parentId: args.parentId,
        name: args.name,
        type: "file",
        content: args.content,
        updatedAt: now,
      };

      patchFolderContents(
        localStore,
        { projectId: args.projectId, parentId: args.parentId },
        (files) => [...files, optimistic],
      );
      patchAllFiles(localStore, args.projectId, (files) => [...files, optimistic]);
    },
  );
}

export function useCreateFolder(scope: FolderScope) {
  return useMutation(api.files.createFolder).withOptimisticUpdate(
    (localStore, args) => {
      const now = Date.now();
      const optimistic: Doc<"files"> = {
        _id: crypto.randomUUID() as Id<"files">,
        _creationTime: now,
        projectId: args.projectId,
        parentId: args.parentId,
        name: args.name,
        type: "folder",
        updatedAt: now,
      };

      patchFolderContents(
        localStore,
        { projectId: args.projectId, parentId: args.parentId },
        (files) => [...files, optimistic],
      );
      patchAllFiles(localStore, args.projectId, (files) => [...files, optimistic]);
    },
  );
}

export function useRenameFile(scope: FolderScope) {
  return useMutation(api.files.renameFile).withOptimisticUpdate(
    (localStore, args) => {
      const touch = (f: Doc<"files">) =>
        f._id === args.id
          ? { ...f, name: args.newName, updatedAt: Date.now() }
          : f;

      patchFolderContents(localStore, scope, (files) => files.map(touch));
      patchAllFiles(localStore, scope.projectId, (files) => files.map(touch));
    },
  );
}

export function useDeleteFile(scope: FolderScope) {
  return useMutation(api.files.deleteFile).withOptimisticUpdate(
    (localStore, args) => {
      const remove = (f: Doc<"files">) => f._id !== args.id;

      patchFolderContents(localStore, scope, (files) => files.filter(remove));
      patchAllFiles(localStore, scope.projectId, (files) => files.filter(remove));
    },
  );
}

export const useUpdateFile = () => {
  return useMutation(api.files.updateFile);
};

export const useFile = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFile, fileId ? { id: fileId } : "skip");
};

export const useFilePath = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFilePath, fileId ? { id: fileId } : "skip");
};

export const useFolderContents = ({
  projectId,
  parentId,
  enabled = true,
}: {
  projectId: Id<"project">;
  parentId?: Id<"files">;
  enabled?: boolean;
}) => {
  return useQuery(
    api.files.getFolderContents,
    enabled ? { projectId, parentId } : "skip",
  );
};
