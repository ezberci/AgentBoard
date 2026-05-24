import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  directory: z.string().min(1),
  max_entries: z.number().int().min(1).optional(),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "truncation_dir",
  description: "List directory entries, truncating if there are more than max_entries.",
  parameters,
  async execute(params, ctx) {
    const dirPath = path.resolve(ctx.workingDir, params.directory);
    ctx.logger.info({ dirPath }, "truncation_dir: reading");

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const lines = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));

    const max_entries = params.max_entries ?? 50;
    if (lines.length > max_entries) {
      const shown = lines.slice(0, max_entries);
      return shown.join("\n") + `\n... and ${lines.length - max_entries} more entries (truncated)`;
    }

    return lines.join("\n") || "(empty directory)";
  },
};
