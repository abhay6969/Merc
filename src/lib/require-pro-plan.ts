import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { PRO_PLAN_REQUIRED } from "./pro-plan";

export { PRO_PLAN_REQUIRED };

export type ProAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireProPlan(): Promise<ProAuthResult> {
  const authResult = await auth();
  const { userId, has } = authResult;

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const isPro = has({ plan: "pro" });
  if (!isPro) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: PRO_PLAN_REQUIRED, code: "PRO_PLAN_REQUIRED" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId };
}
