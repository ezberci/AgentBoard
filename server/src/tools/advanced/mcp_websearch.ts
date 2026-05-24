import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  query: z.string().min(1),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "mcp_websearch",
  description: "MCP-compatible web search wrapper. (Stub — not yet implemented.)",
  parameters,
  async execute(params, ctx) {
    ctx.logger.info({ query: params.query }, "mcp_websearch: stub call");
    return `MCP web search is not yet implemented. Query: ${params.query}`;
  },
};
