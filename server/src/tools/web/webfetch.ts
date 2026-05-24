import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  url: z.string().url(),
});

const MAX_SIZE = 50 * 1024;

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "webfetch",
  description: "Fetch a URL and return its text content. HTML is stripped to plain text; JSON and plain text are returned as-is. Output is limited to ~50KB.",
  parameters,
  async execute(params, ctx) {
    const { url } = params;
    ctx.logger.info({ url }, "webfetch: fetching URL");

    const response = await fetch(url, {
      signal: ctx.abortSignal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AgentBoard/0.1)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = await response.arrayBuffer();
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

    let text: string;
    if (contentType.includes("text/html")) {
      text = stripHtml(raw);
    } else {
      text = raw;
    }

    if (text.length > MAX_SIZE) {
      text = text.slice(0, MAX_SIZE) + "\n... [truncated]";
    }

    ctx.logger.info({ url, length: text.length }, "webfetch: done");
    return text;
  },
};
