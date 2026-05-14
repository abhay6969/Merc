import { auth } from "@clerk/nextjs/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, generateText, NoContentGeneratedError } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildQuickEditUserPrompt } from "../suggestions/prompts";
import { extractUrlsFromText, scrapeUrlsToDocumentationMarkdown } from "@/lib/editor-doc-scrape";

export const runtime = "nodejs";

export const maxDuration = 120;

const GEMINI_MODEL = "gemini-2.5-flash-lite";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

const quickEditTimestampsByUser = new Map<string, number[]>();

function takeQuickEditRateSlot(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const prev = quickEditTimestampsByUser.get(userId) ?? [];
  const pruned = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (pruned.length >= RATE_MAX) {
    const oldest = pruned[0]!;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  pruned.push(now);
  quickEditTimestampsByUser.set(userId, pruned);
  return { ok: true };
}

function googleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    undefined
  );
}

function serializeApiFailure(e: unknown, modelTried: string): Record<string, unknown> {
  const out: Record<string, unknown> = { modelTried };
  if (APICallError.isInstance(e)) {
    out.statusCode = e.statusCode;
    out.url = e.url;
    const body = e.responseBody;
    out.responseBody =
      typeof body === "string" && body.length > 800 ? `${body.slice(0, 800)}…` : body;
  } else if (e instanceof Error) {
    out.name = e.name;
    out.message = e.message;
  } else {
    out.message = String(e);
  }
  return out;
}

const bodySchema = z.object({
  fileName: z.string().max(512),
  fullCode: z.string().max(200_000),
  selectionFrom: z.number().int().min(0),
  selectionTo: z.number().int().min(0),
  instruction: z.string().min(1).max(12_000),
  docUrls: z.array(z.string().url()).max(5).optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = googleApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server missing API key: set GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY / GOOGLE_API_KEY)",
      },
      { status: 500 },
    );
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

  const rate = takeQuickEditRateSlot(userId);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Too many quick-edit requests. Limit is ${RATE_MAX} per minute. Try again in ${rate.retryAfterSec}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const { fileName, fullCode, selectionFrom, selectionTo, instruction, docUrls } = parsed.data;
  const from = Math.min(selectionFrom, selectionTo, fullCode.length);
  const to = Math.min(Math.max(selectionFrom, selectionTo), fullCode.length);
  if (from === to) {
    return NextResponse.json({ error: "Empty selection" }, { status: 400 });
  }

  const selectedCode = fullCode.slice(from, to);

  const urlsFromInstruction = extractUrlsFromText(instruction);
  const allUrls = [...new Set([...(docUrls ?? []), ...urlsFromInstruction])].slice(0, 5);
  let documentation = "";
  if (allUrls.length > 0) {
    documentation = await scrapeUrlsToDocumentationMarkdown(allUrls);
  }
  if (!documentation.trim()) {
    documentation = "(No external documentation retrieved. Rely on the code context and instruction.)";
  }

  let prompt: string;
  try {
    prompt = buildQuickEditUserPrompt({
      selectedCode,
      fullCode,
      documentation,
      instruction,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build prompt";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const google = createGoogleGenerativeAI({ apiKey });

  try {
    const { text } = await generateText({
      model: google(GEMINI_MODEL),
      prompt,
      maxOutputTokens: 4096,
    });

    const stripped = text
      .replace(/^```[\w]*\n?/i, "")
      .replace(/\n?```$/i, "")
      .trimEnd();
    const replacement = stripped.length > 0 ? stripped : selectedCode;

    return NextResponse.json({ replacement });
  } catch (e) {
    if (NoContentGeneratedError.isInstance(e)) {
      return NextResponse.json({ replacement: selectedCode });
    }

    const message = e instanceof Error ? e.message : "Generation failed";
    const debug = serializeApiFailure(e, GEMINI_MODEL);

    return NextResponse.json(
      {
        error: message,
        debug,
      },
      { status: 502 },
    );
  }
}
