import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const projectId = await ctx.db.insert("project", {
      name: args.name,
      ownerId: identity.subject,
      updatedAt: Date.now(),
    });
    return projectId;
  },
});

export const createForGithubImport = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    return await ctx.db.insert("project", {
      name: args.name,
      ownerId: identity.subject,
      updatedAt: Date.now(),
      importStatus: "importing",
    });
  },
});

export const resetExport = mutation({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("project", args.projectId);
    if (project == null) throw new Error("Project not found");
    if (project.ownerId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch("project", args.projectId, {
      exportStatus: undefined,
      exportRepoUrl: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const startGithubExport = mutation({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("project", args.projectId);
    if (project == null) throw new Error("Project not found");
    if (project.ownerId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch("project", args.projectId, {
      exportStatus: "exporting",
      exportRepoUrl: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const getPartial = query({
  args: { limit: v.number() },
  handler: async (ctx,args) => {
    const identity = await verifyAuth(ctx);
    return await ctx.db
      .query("project")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(args.limit);
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    return await ctx.db
      .query("project")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("project") },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.id);
    if (project == null) return null;
    if (project.ownerId !== identity.subject) return null;
    return project;
  },
});

export const rename = mutation({
  args: {
    id: v.id("project"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.id);
    if(!project){
      throw new Error("Project not found");
    }
    if(project.ownerId !== identity.subject){
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

const projectSettingsValidator = v.object({
  installCommand: v.optional(v.string()),
  devCommand: v.optional(v.string()),
});

export const updateSettings = mutation({
  args: {
    projectId: v.id("project"),
    settings: projectSettingsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.projectId);
    if (project == null) {
      throw new Error("Project not found");
    }
    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const existing = project.settings ?? {};
    const nextSettings = {
      ...existing,
      ...args.settings,
    };

    if (nextSettings.installCommand === "") {
      delete nextSettings.installCommand;
    }
    if (nextSettings.devCommand === "") {
      delete nextSettings.devCommand;
    }

    await ctx.db.patch(args.projectId, {
      settings: nextSettings,
      updatedAt: Date.now(),
    });
  },
});