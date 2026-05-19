import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { executeProcessMessage } from "@/features/conversations/ingest/process-message";
import { messageSentEventSchema } from "@/features/conversations/ingest/types/message-sent";
import { sendInngestEvent } from "@/lib/inngest-send";

function isInngestDev(): boolean {
  return process.env.INNGEST_DEV === "1";
}

/** Skip Inngest and run in Next.js — no runs in the Inngest dashboard. */
function useInlineProcessing(): boolean {
  return isInngestDev() && process.env.INNGEST_INLINE === "1";
}

function scheduleInlineProcessing(
  data: unknown,
  label: "inline" | "inline-fallback",
): void {
  after(async () => {
    try {
      await executeProcessMessage(data);
    } catch (err) {
      console.error(`[dispatch] ${label} process-message failed:`, err);
    }
  });
}

/**
 * Queue AI generation.
 *
 * Local dev (default): sends `message.sent` to the Inngest dev server so runs
 * appear in the dashboard. Requires `npm run inngest:dev` in another terminal.
 *
 * Local dev (INNGEST_INLINE=1): runs in Next.js only — dashboard stays empty.
 *
 * Production: sends to Inngest Cloud.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = messageSentEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const eventData = parsed.data;

  try {
    if (useInlineProcessing()) {
      scheduleInlineProcessing(eventData, "inline");
      return NextResponse.json({ ok: true, mode: "inline" });
    }

    try {
      await sendInngestEvent("message.sent", eventData);
      return NextResponse.json({
        ok: true,
        mode: isInngestDev() ? "inngest-dev" : "inngest",
      });
    } catch (sendError) {
      if (!isInngestDev()) {
        throw sendError;
      }
      console.warn(
        "[dispatch] Inngest dev server unreachable — falling back to inline. " +
          "Start with: npm run inngest:dev",
        sendError,
      );
      scheduleInlineProcessing(eventData, "inline-fallback");
      return NextResponse.json({ ok: true, mode: "inline-fallback" });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
