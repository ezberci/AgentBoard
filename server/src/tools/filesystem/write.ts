import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";
import { resolvePath } from "./utils.js";

export const parameters = z.object({
  filePath: z.string().describe("Absolute or relative path to the file to write"),
  content: z.string().describe("Content to write to the file"),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "write",
  description: "Create or overwrite a file, creating parent directories as needed.",
  parameters,
  async execute(params, ctx) {
    const target = resolvePath(params.filePath, ctx.workingDir);

    ctx.logger.info({ filePath: params.filePath, target }, "write tool");

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, params.content, "utf-8");

    return `Successfully wrote to ${params.filePath}`;
  },
};
