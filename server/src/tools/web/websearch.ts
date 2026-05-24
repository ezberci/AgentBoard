import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
});

interface SearchResult {
  title: string;
  url: string;
}

function parseDuckDuckGoResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML results are in .result divs
  const resultBlocks = html.match(/<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g) || [];

  for (const block of resultBlocks) {
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const hrefMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>/);

    if (titleMatch && hrefMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const url = hrefMatch[1];
      results.push({ title, url });
    }
  }

  return results;
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "websearch",
  description: "Search the web using DuckDuckGo and return a list of result titles and URLs.",
  parameters,
  async execute(params, ctx) {
    const { query, limit = 5 } = params;
    ctx.logger.info({ query, limit }, "websearch: searching");

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      signal: ctx.abortSignal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AgentBoard/0.1)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const results = parseDuckDuckGoResults(html).slice(0, limit);

    if (results.length === 0) {
      return "No results found.";
    }

    ctx.logger.info({ query, count: results.length }, "websearch: done");
    return results.map((r) => `${r.title}\n${r.url}`).join("\n\n");
  },
};
