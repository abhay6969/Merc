import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { verifyAuth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;
type MutationDbCtx = Pick<MutationCtx, "db" | "storage">;

function sortFileEntries<T extends { type: "file" | "folder"; name: string }>(
  files: T[],
): T[] {
  return files.sort((a, b) => {
    if (a.type === "folder" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });
}

async function findSibling(
  ctx: DbCtx,
  projectId: Id<"project">,
  parentId: Id<"files"> | undefined,
  name: string,
  type: "file" | "folder",
): Promise<Doc<"files"> | null> {
  const siblings = await ctx.db
    .query("files")
    .withIndex("by_project_parent", (q) =>
      q.eq("projectId", projectId).eq("parentId", parentId),
    )
    .collect();
  return siblings.find((s) => s.name === name && s.type === type) ?? null;
}

async function assertUniqueSiblingName(
  ctx: DbCtx,
  projectId: Id<"project">,
  parentId: Id<"files"> | undefined,
  name: string,
  type: "file" | "folder",
  excludeId?: Id<"files">,
): Promise<void> {
  const siblings = await ctx.db
    .query("files")
    .withIndex("by_project_parent", (q) =>
      q.eq("projectId", projectId).eq("parentId", parentId),
    )
    .collect();
  const duplicate = siblings.find(
    (s) =>
      s.name === name &&
      s.type === type &&
      (excludeId === undefined || s._id !== excludeId),
  );
  if (duplicate) {
    throw new Error(`A ${type} named "${name}" already exists in this folder`);
  }
}

async function assertParentFolder(
  ctx: DbCtx,
  projectId: Id<"project">,
  parentId: Id<"files"> | undefined,
): Promise<void> {
  if (!parentId) return;
  const parent = await ctx.db.get("files", parentId);
  if (!parent || parent.projectId !== projectId) {
    throw new Error("Parent folder not found");
  }
  if (parent.type !== "folder") {
    throw new Error("Parent must be a folder");
  }
}

async function deleteFileRecursive(
  ctx: MutationDbCtx,
  fileId: Id<"files">,
): Promise<void> {
  const item = await ctx.db.get("files", fileId);
  if (!item) return;
  if (item.type === "folder") {
    const children = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", item.projectId).eq("parentId", fileId),
      )
      .collect();
    for (const child of children) {
      await deleteFileRecursive(ctx, child._id);
    }
  }
  if (item.storageId) {
    await ctx.storage.delete(item.storageId);
  }
  await ctx.db.delete("files", fileId);
}

// ---------------------------------------------------------------------------
// Internal queries / mutations (Inngest agent tools via HTTP)
// ---------------------------------------------------------------------------

export const getProjectFilesInternal = internalQuery({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return sortFileEntries(files).map((f) => ({
      id: f._id,
      name: f.name,
      type: f.type,
      parentId: f.parentId ?? null,
      updatedAt: f.updatedAt,
    }));
  },
});

export const getFileByIdInternal = internalQuery({
  args: { fileId: v.id("files"), projectId: v.id("project") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get("files", args.fileId);
    if (!file || file.projectId !== args.projectId) return null;
    return file;
  },
});

export const getFilesByIdsInternal = internalQuery({
  args: {
    projectId: v.id("project"),
    fileIds: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const out: Array<{
      id: Id<"files">;
      name: string;
      content: string;
    }> = [];
    for (const fileId of args.fileIds) {
      const file = await ctx.db.get("files", fileId);
      if (!file || file.projectId !== args.projectId || file.type !== "file") {
        continue;
      }
      out.push({
        id: file._id,
        name: file.name,
        content: file.content ?? "",
      });
    }
    return out;
  },
});

export const updateFileInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    fileId: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get("files", args.fileId);
    if (!file || file.projectId !== args.projectId || file.type !== "file") {
      throw new Error("File not found");
    }
    await ctx.db.patch("files", args.fileId, {
      content: args.content,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
    return { ok: true as const };
  },
});

const fileConflictMode = v.optional(
  v.union(v.literal("fail"), v.literal("update")),
);

export const createFileInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    content: v.string(),
    onConflict: fileConflictMode,
  },
  handler: async (ctx, args) => {
    await assertParentFolder(ctx, args.projectId, args.parentId);
    const onConflict = args.onConflict ?? "fail";
    const existing = await findSibling(
      ctx,
      args.projectId,
      args.parentId,
      args.name,
      "file",
    );

    if (existing) {
      if (onConflict === "fail") {
        throw new Error(
          `A file named "${args.name}" already exists in this folder`,
        );
      }
      await ctx.db.patch("files", existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
      await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
      return { id: existing._id, name: args.name, action: "updated" as const };
    }

    const id = await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "file",
      content: args.content,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
    return { id, name: args.name, action: "created" as const };
  },
});

export const createFilesInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    parentId: v.optional(v.id("files")),
    files: v.array(
      v.object({
        name: v.string(),
        content: v.string(),
      }),
    ),
    onConflict: fileConflictMode,
  },
  handler: async (ctx, args) => {
    await assertParentFolder(ctx, args.projectId, args.parentId);
    const onConflict = args.onConflict ?? "fail";
    const ids: Id<"files">[] = [];
    const names: string[] = [];
    const created: string[] = [];
    const updated: string[] = [];

    for (const file of args.files) {
      const existing = await findSibling(
        ctx,
        args.projectId,
        args.parentId,
        file.name,
        "file",
      );

      if (existing) {
        if (onConflict === "fail") {
          throw new Error(
            `A file named "${file.name}" already exists in this folder`,
          );
        }
        await ctx.db.patch("files", existing._id, {
          content: file.content,
          updatedAt: Date.now(),
        });
        ids.push(existing._id);
        names.push(file.name);
        updated.push(file.name);
        continue;
      }

      const id = await ctx.db.insert("files", {
        projectId: args.projectId,
        parentId: args.parentId,
        name: file.name,
        type: "file",
        content: file.content,
        updatedAt: Date.now(),
      });
      ids.push(id);
      names.push(file.name);
      created.push(file.name);
    }

    await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
    return { ids, names, created, updated };
  },
});

export const createFolderInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    onConflict: v.optional(v.union(v.literal("fail"), v.literal("skip"))),
  },
  handler: async (ctx, args) => {
    await assertParentFolder(ctx, args.projectId, args.parentId);
    const onConflict = args.onConflict ?? "fail";
    const existing = await findSibling(
      ctx,
      args.projectId,
      args.parentId,
      args.name,
      "folder",
    );

    if (existing) {
      if (onConflict === "skip") {
        return { id: existing._id, name: args.name, action: "skipped" as const };
      }
      throw new Error(
        `A folder named "${args.name}" already exists in this folder`,
      );
    }

    const id = await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "folder",
      updatedAt: Date.now(),
    });
    await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
    return { id, name: args.name, action: "created" as const };
  },
});

export const renameFileInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    fileId: v.id("files"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get("files", args.fileId);
    if (!file || file.projectId !== args.projectId) {
      throw new Error("File not found");
    }
    await assertUniqueSiblingName(
      ctx,
      args.projectId,
      file.parentId,
      args.newName,
      file.type,
      args.fileId,
    );
    await ctx.db.patch("files", args.fileId, {
      name: args.newName,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
    return { ok: true as const };
  },
});

export const deleteFileInternal = internalMutation({
  args: {
    projectId: v.id("project"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get("files", args.fileId);
    if (!file || file.projectId !== args.projectId) {
      throw new Error("File not found");
    }
    await deleteFileRecursive(ctx, args.fileId);
    await ctx.db.patch("project", args.projectId, { updatedAt: Date.now() });
    return { ok: true as const };
  },
});

export const getFiles = query({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("project", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    return await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});
export const getFile = query({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", args.id);
    if (!file) {
      throw new Error("File not found");
    }
    const project = await ctx.db.get("project", file.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    return file;
  },
});

export const getFilePath = query({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get("files", args.id);

    if(!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get("project", file.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    const path:{ _id:string; name:string }[] = [];
    let currentId:Id<"files"> | undefined = args.id;
    while(currentId){
      const file = await ctx.db.get("files", currentId) as Doc<"files"> | undefined;
      if(!file) break;
      path.unshift({ _id:file._id, name:file.name });
      currentId = file.parentId;
    }
    return path;
  },
});

export const getFolderContents = query({
  args: { projectId: v.id("project"), parentId: v.optional(v.id("files")) },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("project", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .collect();

    return files.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const createFile = mutation({
  args: {
    projectId: v.id("project"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("project", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized to access this project");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .collect();
    const existing = files.find(
      (file) => file.name === args.name && file.type === "file",
    );
    if (existing) {
      throw new Error("File with this name already exists");
    }

    await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "file",
      content: args.content,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("project", args.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const createFolder = mutation({
  args: {
    projectId: v.id("project"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("project", args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized to access this project");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .collect();
    const existing = files.find(
      (file) => file.name === args.name && file.type === "folder",
    );
    if (existing) {
      throw new Error("File with this name already exists");
    }

    await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "folder",
      updatedAt: Date.now(),
    });
     await ctx.db.patch("project", args.projectId, {
       updatedAt: Date.now(),
     });
  },
});

export const renameFile = mutation({
  args: {
    id: v.id("files"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", args.id);
    if (!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get("project", file.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized to access this project");
    }

    const siblings = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", file.projectId).eq("parentId", file.parentId),
      )
      .collect();
    const existing = siblings.find(
      (sibling) =>
        sibling.name === args.newName &&
        sibling.type === file.type &&
        sibling._id !== args.id,
    );
    if (existing) {
      throw new Error("File with this name already exists");
    }
    await ctx.db.patch("files", args.id, {
      name: args.newName,
      updatedAt: Date.now(),
    });
     await ctx.db.patch("project", file.projectId, {
       updatedAt: Date.now(),
     });
  },
});

export const deleteFile = mutation({
  args: {
    id: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", args.id);
    if (!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get("project", file.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized to access this project");
    }

    const deleteRecursive = async (fileId: Id<"files">) => {
      const item = await ctx.db.get("files", fileId);
      if(!item) return;
      if(item.type === "folder"){
        const children = await ctx.db.query("files").withIndex("by_project_parent", (q) => q.eq("projectId", item.projectId).eq("parentId", fileId)).collect();
        for(const child of children){
          await deleteRecursive(child._id);
        }
      }
      if(item.storageId){
        await ctx.storage.delete(item.storageId);
      }
      await ctx.db.delete("files", fileId);
    };
    await deleteRecursive(args.id);

     await ctx.db.patch("project", file.projectId, {
       updatedAt: Date.now(),
     });
  },
});

export const updateFile = mutation({
  args:{
    id: v.id("files"),
    content: v.string(),
  },
  handler:async(ctx,args)=>{
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", args.id);
    if(!file){
      throw new Error("File not found");
    }
    const project = await ctx.db.get("project", file.projectId);
    if(!project){
      throw new Error("Project not found");
    }
    if(project.ownerId !== identity.subject){
      throw new Error("Unauthorized to access this project");
    }
    await ctx.db.patch("files", args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });

    await ctx.db.patch("project",file.projectId,{ 
      updatedAt: Date.now(),
  })
  }
})