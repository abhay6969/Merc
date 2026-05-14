import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`[\])]+/g;

function markdownFromScrapeResult(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as Record<string, unknown>;
  const top = r.markdown;
  if (typeof top === "string") return top;
  const data = r.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const nested = d.markdown;
    if (typeof nested === "string") return nested;
  }
  return undefined;
}

export function extractUrlsFromText(text: string): string[] {
  return text.match(URL_REGEX) ?? [];
}

/**
 * Scrapes up to five unique URLs and returns markdown for the quick-edit prompt.
 * No-ops when `FIRECRAWL_API_KEY` is missing or scrape fails.
 */
export async function scrapeUrlsToDocumentationMarkdown(
  urls: readonly string[],
): Promise<string> {
  if (!process.env.FIRECRAWL_API_KEY?.trim()) {
    return "";
  }
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].slice(0, 5);
  const chunks: string[] = [];
  for (const url of unique) {
    try {
      const result = await firecrawl.scrape(url, { formats: ["markdown"] });
      const md = markdownFromScrapeResult(result)?.trim();
      if (md) {
        chunks.push(`### ${url}\n\n${md}`);
      }
    } catch {
      /* ignore failed scrapes */
    }
  }
  return chunks.join("\n\n---\n\n");
}
