import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";

const DEFAULT_PROMPT =
  "Write a vegetarian Lasagna recipe in 5 steps for 4 people";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt =
      (body.prompt as string)?.trim() || DEFAULT_PROMPT;

    const result = await inngest.send({
      name: "demo/generate-text",
      data: { prompt },
    });

    return NextResponse.json({
      ok: true,
      ids: result.ids,
      message:
        "Job queued. Inngest will run it in the background. Check the Inngest Dev Server or logs for the result.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
