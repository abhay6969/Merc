/** Fire Inngest events from the browser via Next.js (INNGEST_DEV handles routing). */

export async function dispatchMessageSent(payload: {
  messageId: string;
  conversationId: string;
  projectId: string;
  nonce: string;
  modelId: string;
  content: string;
}): Promise<void> {
  const res = await fetch("/api/chat/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Dispatch failed (${res.status})`);
  }
}

export async function dispatchMessageCancel(payload: {
  messageId: string;
  nonce: string;
}): Promise<void> {
  const res = await fetch("/api/chat/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Cancel dispatch failed (${res.status})`);
  }
}

/** Cancel every in-flight generation for a project (Convex + Inngest). */
export async function dispatchProjectCancel(projectId: string): Promise<void> {
  const res = await fetch("/api/messages/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Project cancel failed (${res.status})`);
  }
}
