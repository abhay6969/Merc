import { httpRouter } from "convex/server";
import { z } from "zod";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

// ---------------------------------------------------------------------------
// Shared internal key validation
// ---------------------------------------------------------------------------

export function validateInternalKey(request: Request): Response | null {
  const expected = process.env.INTERNAL_API_KEY?.trim();
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  const headerKey = request.headers.get("x-internal-key")?.trim();
  const provided = bearer ?? headerKey;
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Read JSON body reliably (request.json() can fail on some proxied requests). */
async function parseRequestJson(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  const text = await request.text();
  if (!text.trim()) {
    return {
      ok: false,
      response: jsonError({ error: "Empty request body" }, 400),
    };
  }
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: jsonError({ error: "Invalid JSON", received: text.slice(0, 200) }, 400),
    };
  }
}

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

const completeBodySchema = z.object({
  messageId: z.string(),
  nonce: z.string(),
  content: z.string(),
  status: z.enum(["completed", "cancelled"]).optional().default("completed"),
  error: z.string().optional(),
});

const failBodySchema = z.object({
  messageId: z.string(),
  nonce: z.string(),
  errorDetail: z.string().optional(),
});

const contextBodySchema = z.object({
  messageId: z.string(),
});

const assistantStatusBodySchema = z.object({
  messageId: z.string(),
});

const conversationTitleBodySchema = z.object({
  conversationId: z.string(),
  title: z.string(),
});

const projectFilesBodySchema = z.object({
  projectId: z.string(),
});

const readFilesBodySchema = z.object({
  projectId: z.string(),
  fileIds: z.array(z.string()).min(1).max(32),
});

const updateFileBodySchema = z.object({
  projectId: z.string(),
  fileId: z.string(),
  content: z.string(),
});

const createManyFilesBodySchema = z.object({
  projectId: z.string(),
  parentId: z.string().nullable(),
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1)
    .max(20),
  /** When "update", existing files at the same path are overwritten instead of failing. */
  onConflict: z.enum(["fail", "update"]).optional(),
});

const createFolderBodySchema = z.object({
  projectId: z.string(),
  parentId: z.string().nullable(),
  name: z.string().min(1),
  skipIfExists: z.boolean().optional(),
});

const createFileBodySchema = z.object({
  projectId: z.string(),
  parentId: z.string().nullable(),
  name: z.string().min(1),
  content: z.string(),
  onConflict: z.enum(["fail", "update"]).optional(),
});

const renameFileBodySchema = z.object({
  projectId: z.string(),
  fileId: z.string(),
  newName: z.string().min(1),
});

const deleteFileBodySchema = z.object({
  projectId: z.string(),
  fileId: z.string(),
});

function parentIdFromBody(
  parentId: string | null,
): Id<"files"> | undefined {
  if (parentId === null || parentId === "") {
    return undefined;
  }
  return parentId as Id<"files">;
}

const cancelProjectBodySchema = z.object({
  projectId: z.string(),
  ownerId: z.string(),
});

const projectIdBodySchema = z.object({
  projectId: z.string(),
});

const updateImportStatusBodySchema = z.object({
  projectId: z.string(),
  importStatus: z.enum(["importing", "completed", "failed"]),
});

const updateExportStatusBodySchema = z.object({
  projectId: z.string(),
  exportStatus: z.enum(["exporting", "completed", "failed", "cancelled"]),
  exportRepoUrl: z.string().optional(),
});

const createBinaryFileBodySchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  storageId: z.string(),
  parentId: z.string().nullable(),
});

const createProjectBodySchema = z.object({
  name: z.string().min(1),
  ownerId: z.string().min(1),
});

const createFromAiPromptBodySchema = z.object({
  ownerId: z.string().min(1),
  projectName: z.string().min(1).max(120),
  conversationTitle: z.string().min(1).max(120),
  prompt: z.string().min(1),
  modelId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// HTTP router
// ---------------------------------------------------------------------------

const http = httpRouter();

/**
 * POST /internal/chat/complete
 * Called by Inngest after successful AI generation to persist the result.
 */
http.route({
  path: "/internal/chat/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = completeBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const { messageId, nonce, content, status, error } = parsed.data;

    await ctx.runMutation(internal.messages.finalizeAssistantInternal, {
      messageId: messageId as Id<"messages">,
      nonce,
      content,
      status,
      error,
    });

    return jsonOk({ ok: true });
  }),
});

/**
 * POST /internal/chat/fail
 * Called by Inngest's onFailure handler when all retries are exhausted.
 */
http.route({
  path: "/internal/chat/fail",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = failBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const { messageId, nonce, errorDetail } = parsed.data;

    await ctx.runMutation(internal.messages.failAssistantInternal, {
      messageId: messageId as Id<"messages">,
      nonce,
      userVisibleMessage:
        "Something went wrong while generating a reply. Try again.",
      errorDetail,
    });

    return jsonOk({ ok: true });
  }),
});

/**
 * POST /internal/chat/context
 * Called by the Inngest processMessage worker to fetch all conversation
 * context needed for AI generation in a single authenticated round-trip.
 */
http.route({
  path: "/internal/chat/context",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = contextBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const context = await ctx.runQuery(
      internal.messages.getContextForGenerationInternal,
      { assistantMessageId: parsed.data.messageId },
    );

    if (!context) {
      return jsonError({ error: "Message not found" }, 404);
    }

    return jsonOk(context);
  }),
});

http.route({
  path: "/internal/chat/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = assistantStatusBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const status = await ctx.runQuery(
      internal.messages.getAssistantStatusInternal,
      { messageId: parsed.data.messageId as Id<"messages"> },
    );

    if (!status) {
      return jsonError({ error: "Message not found" }, 404);
    }

    return jsonOk(status);
  }),
});

http.route({
  path: "/internal/conversations/title",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = conversationTitleBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await ctx.runMutation(
      internal.conversations.updateConversationTitleInternal,
      {
        conversationId: parsed.data.conversationId as Id<"conversations">,
        title: parsed.data.title,
      },
    );

    return jsonOk(result);
  }),
});

http.route({
  path: "/internal/chat/cancel-project",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = cancelProjectBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await ctx.runMutation(
      internal.messages.cancelProcessingForProjectInternal,
      {
        projectId: parsed.data.projectId as Id<"project">,
        ownerId: parsed.data.ownerId,
      },
    );

    return jsonOk(result);
  }),
});

http.route({
  path: "/internal/files/list",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = projectFilesBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const files = await ctx.runQuery(internal.files.getProjectFilesInternal, {
      projectId: parsed.data.projectId as Id<"project">,
    });

    return jsonOk({ files });
  }),
});

http.route({
  path: "/internal/files/read",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = readFilesBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const files = await ctx.runQuery(internal.files.getFilesByIdsInternal, {
      projectId: parsed.data.projectId as Id<"project">,
      fileIds: parsed.data.fileIds as Id<"files">[],
    });

    const missing = parsed.data.fileIds.filter(
      (id) => !files.some((f) => f.id === id),
    );

    return jsonOk({ files, missing });
  }),
});

http.route({
  path: "/internal/files/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = updateFileBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    try {
      await ctx.runMutation(internal.files.updateFileInternal, {
        projectId: parsed.data.projectId as Id<"project">,
        fileId: parsed.data.fileId as Id<"files">,
        content: parsed.data.content,
      });
      return jsonOk({ ok: true, fileId: parsed.data.fileId });
    } catch (e) {
      return jsonError(
        { error: e instanceof Error ? e.message : "Update failed" },
        400,
      );
    }
  }),
});

http.route({
  path: "/internal/files/create-many",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = createManyFilesBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    try {
      const result = await ctx.runMutation(
        internal.files.createFilesInternal,
        {
          projectId: parsed.data.projectId as Id<"project">,
          parentId: parentIdFromBody(parsed.data.parentId),
          files: parsed.data.files,
          onConflict: parsed.data.onConflict,
        },
      );
      return jsonOk(result);
    } catch (e) {
      return jsonError(
        { error: e instanceof Error ? e.message : "Create failed" },
        400,
      );
    }
  }),
});

http.route({
  path: "/internal/files/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = createFileBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    try {
      const result = await ctx.runMutation(internal.files.createFileInternal, {
        projectId: parsed.data.projectId as Id<"project">,
        parentId: parentIdFromBody(parsed.data.parentId),
        name: parsed.data.name,
        content: parsed.data.content,
        onConflict: parsed.data.onConflict,
      });
      return jsonOk(result);
    } catch (e) {
      return jsonError(
        { error: e instanceof Error ? e.message : "Create file failed" },
        400,
      );
    }
  }),
});

http.route({
  path: "/internal/files/rename",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = renameFileBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    try {
      await ctx.runMutation(internal.files.renameFileInternal, {
        projectId: parsed.data.projectId as Id<"project">,
        fileId: parsed.data.fileId as Id<"files">,
        newName: parsed.data.newName,
      });
      return jsonOk({ ok: true });
    } catch (e) {
      return jsonError(
        { error: e instanceof Error ? e.message : "Rename failed" },
        400,
      );
    }
  }),
});

http.route({
  path: "/internal/files/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = deleteFileBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    try {
      await ctx.runMutation(internal.files.deleteFileInternal, {
        projectId: parsed.data.projectId as Id<"project">,
        fileId: parsed.data.fileId as Id<"files">,
      });
      return jsonOk({ ok: true });
    } catch (e) {
      return jsonError(
        { error: e instanceof Error ? e.message : "Delete failed" },
        400,
      );
    }
  }),
});

http.route({
  path: "/internal/files/create-folder",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = createFolderBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    try {
      const result = await ctx.runMutation(
        internal.files.createFolderInternal,
        {
          projectId: parsed.data.projectId as Id<"project">,
          parentId: parentIdFromBody(parsed.data.parentId),
          name: parsed.data.name,
          onConflict: parsed.data.skipIfExists ? "skip" : "fail",
        },
      );
      return jsonOk(result);
    } catch (e) {
      return jsonError(
        { error: e instanceof Error ? e.message : "Create folder failed" },
        400,
      );
    }
  }),
});

http.route({
  path: "/internal/system/cleanup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = projectIdBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    await ctx.runMutation(internal.system.cleanupInternal, {
      projectId: parsed.data.projectId as Id<"project">,
    });
    return jsonOk({ ok: true });
  }),
});

http.route({
  path: "/internal/system/generate-upload-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const uploadUrl = await ctx.runMutation(
      internal.system.generateUploadUrlInternal,
      {},
    );
    return jsonOk({ uploadUrl });
  }),
});

http.route({
  path: "/internal/system/create-binary-file",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = createBinaryFileBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    try {
      const result = await ctx.runMutation(
        internal.system.createBinaryFileInternal,
        {
          projectId: parsed.data.projectId as Id<"project">,
          name: parsed.data.name,
          storageId: parsed.data.storageId as Id<"_storage">,
          parentId: parentIdFromBody(parsed.data.parentId),
        },
      );
      return jsonOk(result);
    } catch (e) {
      return jsonError(
        { error: e instanceof Error ? e.message : "Create binary file failed" },
        400,
      );
    }
  }),
});

http.route({
  path: "/internal/system/update-import-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = updateImportStatusBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    await ctx.runMutation(internal.system.updateImportStatusInternal, {
      projectId: parsed.data.projectId as Id<"project">,
      importStatus: parsed.data.importStatus,
    });
    return jsonOk({ ok: true });
  }),
});

http.route({
  path: "/internal/system/update-export-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = updateExportStatusBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    await ctx.runMutation(internal.system.updateExportStatusInternal, {
      projectId: parsed.data.projectId as Id<"project">,
      exportStatus: parsed.data.exportStatus,
      exportRepoUrl: parsed.data.exportRepoUrl,
    });
    return jsonOk({ ok: true });
  }),
});

http.route({
  path: "/internal/system/get-project-files-with-urls",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = projectIdBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const files = await ctx.runQuery(
      internal.system.getProjectFilesWithUrlsInternal,
      { projectId: parsed.data.projectId as Id<"project"> },
    );
    return jsonOk({ files });
  }),
});

http.route({
  path: "/internal/system/create-project",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = createProjectBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const projectId = await ctx.runMutation(
      internal.system.createProjectInternal,
      {
        name: parsed.data.name,
        ownerId: parsed.data.ownerId,
      },
    );
    return jsonOk({ projectId });
  }),
});

http.route({
  path: "/internal/system/get-project-owner",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = projectIdBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const owner = await ctx.runQuery(internal.system.getProjectOwnerInternal, {
      projectId: parsed.data.projectId as Id<"project">,
    });
    return jsonOk(owner);
  }),
});

http.route({
  path: "/internal/projects/create-from-ai-prompt",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = createFromAiPromptBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    const { projectId, conversationId } = await ctx.runMutation(
      internal.system.createProjectWithConversationInternal,
      {
        projectName: parsed.data.projectName,
        conversationTitle: parsed.data.conversationTitle,
        ownerId: parsed.data.ownerId,
      },
    );

    const bootstrap = await ctx.runMutation(
      internal.messages.bootstrapAssistantTurnInternal,
      {
        projectId,
        conversationId,
        content: parsed.data.prompt,
        modelId: parsed.data.modelId,
      },
    );

    return jsonOk({
      projectId,
      conversationId,
      assistantMessageId: bootstrap.assistantMessageId,
      nonce: bootstrap.nonce,
      modelId: bootstrap.modelId,
    });
  }),
});

http.route({
  path: "/internal/system/clear-export-state",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authErr = validateInternalKey(request);
    if (authErr) return authErr;

    const body = await parseRequestJson(request);
    if (!body.ok) return body.response;

    const parsed = projectIdBodySchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError(
        { error: "Invalid body", details: parsed.error.flatten() },
        400,
      );
    }

    await ctx.runMutation(internal.system.clearExportStateInternal, {
      projectId: parsed.data.projectId as Id<"project">,
    });
    return jsonOk({ ok: true });
  }),
});

export default http;
