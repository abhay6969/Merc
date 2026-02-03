import Firecrawl from "@mendable/firecrawl";

export const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});