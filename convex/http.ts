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
  assistantMessageId: z.string(),
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
      { assistantMessageId: parsed.data.assistantMessageId },
    );

    if (!context) {
      return jsonError({ error: "Message not found" }, 404);
    }

    return jsonOk(context);
  }),
});

export default http;
