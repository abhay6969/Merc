import { convexFetch, readConvexError } from "@/features/conversations/ingest/convex-http";

export async function verifyProjectOwner(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const res = await convexFetch("/internal/system/get-project-owner", {
    projectId,
  });
  if (!res.ok) {
    throw new Error(await readConvexError(res));
  }
  const data = (await res.json()) as { ownerId: string } | null;
  return data?.ownerId === userId;
}
