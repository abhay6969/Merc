import { inngest } from "@/inngest/client";

function isInngestDev(): boolean {
  return process.env.INNGEST_DEV === "1";
}

/**
 * Send an event to Inngest. In local dev, POSTs to the Inngest dev server
 * (127.0.0.1:8288) so runs appear without INNGEST_EVENT_KEY / cloud setup.
 */
export async function sendInngestEvent(
  name: string,
  data: Record<string, unknown>,
): Promise<void> {
  inngest.setEnvVars({
    INNGEST_DEV: process.env.INNGEST_DEV,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    INNGEST_BASE_URL: process.env.INNGEST_BASE_URL,
  });

  if (isInngestDev()) {
    const base = (
      process.env.INNGEST_BASE_URL ?? "http://127.0.0.1:8288"
    ).replace(/\/$/, "");
    const eventKey = process.env.INNGEST_EVENT_KEY?.trim() || "local";
    const res = await fetch(`${base}/e/${eventKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, data }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Inngest dev server rejected event [${res.status}]: ${detail.slice(0, 400)}. Is \`npx inngest-cli dev -u http://localhost:4000/api/inngest\` running?`,
      );
    }
    return;
  }

  await inngest.send({ name, data });
}
