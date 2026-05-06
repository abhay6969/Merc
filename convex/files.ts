import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";
import { Id } from "./_generated/dataModel";

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