import { promises as fs } from "node:fs";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";
import { resolvePath } from "./utils.js";

export const parameters = z.object({
  filePath: z.string().describe("Absolute or relative path to the file or directory"),
  offset: z.number().int().min(1).optional().describe("1-indexed line number to start reading from"),
  limit: z.number().int().min(1).optional().describe("Maximum number of lines to read (default 2000)"),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "read",
  description: "Read the contents of a file or list the entries in a directory.",
  parameters,
  async execute(params, ctx) {
    const target = resolvePath(params.filePath, ctx.workingDir);
    const limit = params.limit ?? 2000;
    const offset = params.offset ?? 1;

    ctx.logger.info({ filePath: params.filePath, target }, "read tool");

    try {
      const stat = await fs.stat(target);

      if (stat.isDirectory()) {
        const entries = await fs.readdir(target);
        return entries.join("\n");
      }

      const content = await fs.readFile(target, "utf-8");
      const lines = content.split(/\r?\n/);

      const startIndex = Math.max(0, offset - 1);
      const endIndex = Math.min(lines.length, startIndex + limit);
      const selected = lines.slice(startIndex, endIndex);

      let result = selected.join("\n");
      if (lines.length > endIndex) {
        result += `\n\n... (${lines.length - endIndex} more lines truncated)`;
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.logger.error({ err: message, filePath: params.filePath }, "read failed");
      throw new Error(`Failed to read ${params.filePath}: ${message}`);
    }
  },
};
