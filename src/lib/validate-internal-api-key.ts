/**
 * Shared internal key check for Next.js routes (and any non-Convex server).
 * Mirror env + header rules with `convex/http.ts` `validateInternalKey`.
 */
export function validateInternalApiKeyFromHeaders(headers: Headers): {
  ok: true;
} | { ok: false; status: number; message: string } {
  const expected = process.env.INTERNAL_API_KEY?.trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      message: "INTERNAL_API_KEY not configured",
    };
  }
  const auth = headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  const headerKey = headers.get("x-internal-key")?.trim();
  const provided = bearer ?? headerKey;
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  return { ok: true };
}
