import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexFetch, readConvexError } from "@/features/conversations/ingest/convex-http";
import { verifyProjectOwner } from "@/features/projects/lib/verify-project-owner";
import { sendInngestEvent } from "@/lib/inngest-send";

const bodySchema = z.object({
  projectId: z.string().min(1),
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

  const ownsProject = await verifyProjectOwner(parsed.data.projectId, userId);
  if (!ownsProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const statusRes = await convexFetch("/internal/system/update-export-status", {
    projectId: parsed.data.projectId,
    exportStatus: "cancelled",
  });
  if (!statusRes.ok) {
    return NextResponse.json(
      { error: await readConvexError(statusRes) },
      { status: 502 },
    );
  }

  try {
    await sendInngestEvent("github/export.cancel", {
      projectId: parsed.data.projectId,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to cancel export job",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
