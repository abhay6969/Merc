export function googleApiKey(): string {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "No Google API key found. Set GOOGLE_GENERATIVE_AI_API_KEY.",
    );
  }
  return key;
}
