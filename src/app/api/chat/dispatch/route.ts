import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendInngestEvent } from "@/lib/inngest-send";

const bodySchema = z.object({
  assistantMessageId: z.string().min(1),
  conversationId: z.string().min(1),
  projectId: z.string().min(1),
  nonce: z.string().min(1),
  modelId: z.string().min(1),
});

/** Queue AI generation via Inngest (uses INNGEST_DEV locally; no event key in .env). */
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
    await sendInngestEvent("message.sent", parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
