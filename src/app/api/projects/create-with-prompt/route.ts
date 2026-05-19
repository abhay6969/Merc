import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

import {
  convexFetch,
  readConvexError,
} from "@/features/conversations/ingest/convex-http";
import { sendInngestEvent } from "@/lib/inngest-send";

const bodySchema = z.object({
  prompt: z.string().min(1),
});

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

  const prompt = parsed.data.prompt.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
  }

  const projectName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, colors],
    separator: "-",
    length: 3,
  });

  const conversationTitle =
    prompt.length > 48 ? `${prompt.slice(0, 48)}…` : prompt;

  const createRes = await convexFetch("/internal/projects/create-from-ai-prompt", {
    ownerId: userId,
    projectName,
    conversationTitle,
    prompt,
  });

  if (!createRes.ok) {
    return NextResponse.json(
      { error: await readConvexError(createRes) },
      { status: 502 },
    );
  }

  const data = (await createRes.json()) as {
    projectId: string;
    conversationId: string;
    assistantMessageId: string;
    nonce: string;
    modelId: string;
  };

  try {
    await sendInngestEvent("message.sent", {
      messageId: data.assistantMessageId,
      conversationId: data.conversationId,
      projectId: data.projectId,
      content: prompt,
      nonce: data.nonce,
      modelId: data.modelId,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to start AI generation. Is Inngest running?",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    projectId: data.projectId,
    conversationId: data.conversationId,
  });
}
