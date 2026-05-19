import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  convexFetch,
  readConvexError,
} from "@/features/conversations/ingest/convex-http";
import { sendInngestEvent } from "@/lib/inngest-send";

const bodySchema = z.object({
  projectId: z.string().min(1),
});

/** Cancel all active processing assistant messages for a project. */
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const res = await convexFetch("/internal/chat/cancel-project", {
      projectId: parsed.data.projectId,
      ownerId: userId,
    });
    if (!res.ok) {
      const detail = await readConvexError(res);
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const body = (await res.json()) as {
      cancelled: Array<{ assistantMessageId: string; nonce: string }>;
    };

    await Promise.all(
      body.cancelled.map((job) =>
        sendInngestEvent("message.cancel", {
          messageId: job.assistantMessageId,
          nonce: job.nonce,
        }),
      ),
    );

    return NextResponse.json({ ok: true, cancelled: body.cancelled.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cancel failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
