function convexHttpUrl(): string {
  const explicit = process.env.CONVEX_HTTP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const clientUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (clientUrl) {
    return clientUrl
      .replace(".convex.cloud", ".convex.site")
      .replace(/\/$/, "");
  }

  throw new Error(
    "Set CONVEX_HTTP_URL (or NEXT_PUBLIC_CONVEX_URL) so Inngest can reach Convex HTTP actions.",
  );
}

function internalHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY?.trim() ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: key ? `Bearer ${key}` : "",
    "x-internal-key": key,
  };
}

export async function convexFetch(
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const base = convexHttpUrl();
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(body),
  });
}

/** Extract a short, agent-readable message from Convex HTTP error bodies. */
export function parseConvexErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Request failed";

  try {
    const json = JSON.parse(trimmed) as { error?: string };
    if (typeof json.error === "string") {
      const uncaught = json.error.match(/Uncaught Error:\s*([^\n]+)/);
      if (uncaught?.[1]) return uncaught[1].trim();
      const plain = json.error.match(/^Error:\s*([^\n]+)/);
      if (plain?.[1]) return plain[1].trim();
      return json.error.split("\n")[0]?.trim() || json.error;
    }
  } catch {
    // not JSON
  }

  return trimmed.slice(0, 300);
}

export async function readConvexError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return parseConvexErrorMessage(text) || res.statusText;
}
