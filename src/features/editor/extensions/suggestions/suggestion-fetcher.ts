import ky from "ky";
import { toast } from "sonner";
import { z } from "zod";

export const suggestionRequestSchema = z.object({
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

export const suggestionResponseSchema = z.object({
  suggestion: z.string(),
});

export type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;
export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;

export async function fetcher(
  payload: SuggestionRequest,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const validatedPayload = suggestionRequestSchema.parse(payload);

    const raw = await ky
      .post("/api/suggestion", {
        json: validatedPayload,
        signal,
        timeout: 10_000,
        retry: 0,
      })
      .json();

    const validatedResponse = suggestionResponseSchema.parse(raw);
    const trimmed = validatedResponse.suggestion.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }
    toast.error("Failed to fetch AI completion");
    return null;
  }
}
