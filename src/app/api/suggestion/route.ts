import { auth } from "@clerk/nextjs/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, generateText, NoContentGeneratedError } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSuggestionUserPrompt } from "../editor/suggestions/prompts";

export const runtime = "nodejs";

export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash-lite";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

const suggestionTimestampsByUser = new Map<string, number[]>();

function takeSuggestionRateSlot(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const prev = suggestionTimestampsByUser.get(userId) ?? [];
  const pruned = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (pruned.length >= RATE_MAX) {
    const oldest = pruned[0]!;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  pruned.push(now);
  suggestionTimestampsByUser.set(userId, pruned);
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
  code: z.string().max(200_000),
  cursorPosition: z.number().int().min(0),
  currentLine: z.string().max(10_000),
  previousLines: z.string().max(50_000),
  textBeforeCursor: z.string().max(10_000),
  textAfterCursor: z.string().max(10_000),
  nextLines: z.string().max(50_000),
  lineNumber: z.number().int().positive(),
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

  const rate = takeSuggestionRateSlot(userId);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Too many suggestion requests. Limit is ${RATE_MAX} per minute. Try again in ${rate.retryAfterSec}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const { fileName, code, cursorPosition } = parsed.data;
  const safeCursor = Math.min(cursorPosition, code.length);

  const google = createGoogleGenerativeAI({ apiKey });

  let prompt: string;
  try {
    prompt = buildSuggestionUserPrompt(fileName, code, safeCursor);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build prompt";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const { text } = await generateText({
      model: google(GEMINI_MODEL),
      prompt,
      maxOutputTokens: 512,
    });

    const suggestion = text
      .replace(/^```[\w]*\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    return NextResponse.json({ suggestion });
  } catch (e) {
    if (NoContentGeneratedError.isInstance(e)) {
      return NextResponse.json({ suggestion: "" });
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
