import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  action: z.enum(["hover", "definition", "references"]),
  file_path: z.string().min(1),
  line: z.number().int().min(1),
  character: z.number().int().min(0),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "lsp",
  description: "Query an LSP server for hover, definition, or references. (Stub — LSP bridge is not yet implemented.)",
  parameters,
  async execute(params, ctx) {
    ctx.logger.info({ action: params.action, filePath: params.file_path }, "lsp: stub call");
    return `LSP bridge is not yet implemented. Action: ${params.action}, File: ${params.file_path}, Line: ${params.line}, Char: ${params.character}`;
  },
};
