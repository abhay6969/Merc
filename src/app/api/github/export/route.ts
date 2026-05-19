import { requireProPlan } from "@/lib/require-pro-plan";
import { NextResponse } from "next/server";

import { convexFetch, readConvexError } from "@/features/conversations/ingest/convex-http";
import {
  getGitHubAccessToken,
  GitHubNotConnectedError,
} from "@/features/projects/lib/get-github-token";
import { githubExportSchema } from "@/features/projects/lib/github-repo-name";
import { verifyProjectOwner } from "@/features/projects/lib/verify-project-owner";
import { sendInngestEvent } from "@/lib/inngest-send";

export async function POST(req: Request) {
  const pro = await requireProPlan();
  if (!pro.ok) {
    return pro.response;
  }
  const { userId } = pro;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = githubExportSchema.safeParse(json);
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

  let githubToken: string;
  try {
    githubToken = await getGitHubAccessToken(userId);
  } catch (e) {
    if (e instanceof GitHubNotConnectedError) {
      return NextResponse.json({ error: e.message, code: "GITHUB_NOT_CONNECTED" }, {
        status: 403,
      });
    }
    throw e;
  }

  const statusRes = await convexFetch("/internal/system/update-export-status", {
    projectId: parsed.data.projectId,
    exportStatus: "exporting",
  });
  if (!statusRes.ok) {
    return NextResponse.json(
      { error: await readConvexError(statusRes) },
      { status: 502 },
    );
  }

  try {
    await sendInngestEvent("github/export.repository", {
      projectId: parsed.data.projectId,
      repositoryName: parsed.data.repositoryName,
      visibility: parsed.data.visibility,
      description: parsed.data.description,
      githubToken,
    });
  } catch (e) {
    await convexFetch("/internal/system/update-export-status", {
      projectId: parsed.data.projectId,
      exportStatus: "failed",
    });
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to start export job. Is Inngest running?",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
