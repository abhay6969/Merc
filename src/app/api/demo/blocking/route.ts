import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { NextResponse } from "next/server";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const prompt =
    (body.prompt as string) ?? "Write a vegetarian lasagna recipe for 4 people";

  const result = await generateText({
    model: google("gemini-2.5-flash"),
    prompt,
  });
  return NextResponse.json(result);
}