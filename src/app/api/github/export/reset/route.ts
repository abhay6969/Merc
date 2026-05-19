import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexFetch, readConvexError } from "@/features/conversations/ingest/convex-http";
import { verifyProjectOwner } from "@/features/projects/lib/verify-project-owner";

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

  const res = await convexFetch("/internal/system/clear-export-state", {
    projectId: parsed.data.projectId,
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: await readConvexError(res) },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
