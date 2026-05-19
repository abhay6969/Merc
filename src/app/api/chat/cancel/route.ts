import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendInngestEvent } from "@/lib/inngest-send";

const bodySchema = z.object({
  messageId: z.string().min(1),
  nonce: z.string().min(1),
});

/** Cancel a running processMessage job via Inngest cancelOn matching. */
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
    await sendInngestEvent("message.cancel", parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cancel dispatch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
