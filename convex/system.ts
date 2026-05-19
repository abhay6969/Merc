import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const importStatusValidator = v.union(
  v.literal("importing"),
  v.literal("completed"),
  v.literal("failed"),
);

const exportStatusValidator = v.union(
  v.literal("exporting"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

async function findSiblingFile(
  ctx: MutationCtx,
  projectId: Id<"project">,
  parentId: Id<"files"> | undefined,
  name: string,
): Promise<Doc<"files"> | null> {
  const siblings = await ctx.db
    .query("files")
    .withIndex("by_project_parent", (q) =>
      q.eq("projectId", projectId).eq("parentId", parentId),
    )
    .collect();
  return siblings.find((s) => s.name === name && s.type === "file") ?? null;
}

/** Delete all project files and storage (flat iteration). */
export const cleanupInternal = internalMutation({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const file of files) {
      if (file.storageId) {
        await ctx.storage.delete(file.storageId);
      }
      await ctx.db.delete("files", file._id);
    }
  },
});

export const generateUploadUrlInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createBinaryFileInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    name: v.string(),
    storageId: v.id("_storage"),
    parentId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    const existing = await findSiblingFile(
      ctx,
      args.projectId,
      args.parentId,
      args.name,
    );
    if (existing) {
      throw new Error(`A file named "${args.name}" already exists in this folder`);
    }

    const id = await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "file",
      storageId: args.storageId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
    return { id };
  },
});

export const updateImportStatusInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    importStatus: importStatusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("project", args.projectId, {
      importStatus: args.importStatus,
      updatedAt: Date.now(),
    });
  },
});

export const updateExportStatusInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    exportStatus: exportStatusValidator,
    exportRepoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: {
      exportStatus: typeof args.exportStatus;
      updatedAt: number;
      exportRepoUrl?: string;
    } = {
      exportStatus: args.exportStatus,
      updatedAt: Date.now(),
    };
    if (args.exportRepoUrl !== undefined) {
      patch.exportRepoUrl = args.exportRepoUrl;
    }
    await ctx.db.patch("project", args.projectId, patch);
  },
});

export const getProjectFilesWithUrlsInternal = internalQuery({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return await Promise.all(
      files.map(async (file) => {
        const storageUrl =
          file.storageId != null
            ? await ctx.storage.getUrl(file.storageId)
            : null;
        return {
          ...file,
          storageUrl,
        };
      }),
    );
  },
});

/** Internal-only project creation for GitHub import jobs. */
export const createProjectInternal = internalMutation({
  args: {
    name: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("project", {
      name: args.name,
      ownerId: args.ownerId,
      updatedAt: Date.now(),
      importStatus: "importing",
    });
  },
});

export const getProjectOwnerInternal = internalQuery({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get("project", args.projectId);
    if (!project) return null;
    return { ownerId: project.ownerId };
  },
});

/** Atomically create project + initial conversation (AI project bootstrap). */
export const createProjectWithConversationInternal = internalMutation({
  args: {
    projectName: v.string(),
    conversationTitle: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert("project", {
      name: args.projectName.trim(),
      ownerId: args.ownerId,
      updatedAt: now,
    });
    const conversationId = await ctx.db.insert("conversations", {
      projectId,
      title: args.conversationTitle.trim() || "New chat",
      updatedAt: now,
    });
    return { projectId, conversationId };
  },
});

export const clearExportStateInternal = internalMutation({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    await ctx.db.patch("project", args.projectId, {
      exportStatus: undefined,
      exportRepoUrl: undefined,
      updatedAt: Date.now(),
    });
  },
});
