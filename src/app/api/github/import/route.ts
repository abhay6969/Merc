import { requireProPlan } from "@/lib/require-pro-plan";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexFetch, readConvexError } from "@/features/conversations/ingest/convex-http";
import {
  getGitHubAccessToken,
  GitHubNotConnectedError,
} from "@/features/projects/lib/get-github-token";
import { parseGitHubUrl } from "@/features/projects/lib/parse-github-url";
import { sendInngestEvent } from "@/lib/inngest-send";

const bodySchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
});

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let owner: string;
  let repo: string;
  try {
    ({ owner, repo } = parseGitHubUrl(parsed.data.url));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid GitHub URL" },
      { status: 400 },
    );
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

  const projectName = parsed.data.name?.trim() || repo;

  const createRes = await convexFetch("/internal/system/create-project", {
    name: projectName,
    ownerId: userId,
  });
  if (!createRes.ok) {
    return NextResponse.json(
      { error: await readConvexError(createRes) },
      { status: 502 },
    );
  }

  const { projectId } = (await createRes.json()) as { projectId: string };

  try {
    await sendInngestEvent("github/import.repository", {
      projectId,
      owner,
      repo,
      githubToken,
    });
  } catch (e) {
    await convexFetch("/internal/system/update-import-status", {
      projectId,
      importStatus: "failed",
    });
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to start import job. Is Inngest running?",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ projectId, owner, repo });
}
