import { promises as fs } from "node:fs";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";
import { resolvePath } from "./utils.js";

export const parameters = z.object({
  filePath: z.string().describe("Path to the file to edit"),
  oldString: z.string().describe("Exact string to replace"),
  newString: z.string().describe("Replacement string"),
  replaceAll: z.boolean().optional().describe("Replace all occurrences (default false)"),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "edit",
  description: "Replace an exact string in a file. Fails if the string is not found or ambiguous.",
  parameters,
  async execute(params, ctx) {
    const target = resolvePath(params.filePath, ctx.workingDir);

    ctx.logger.info({ filePath: params.filePath, target }, "edit tool");

    const content = await fs.readFile(target, "utf-8");

    const occurrences = content.split(params.oldString).length - 1;

    if (occurrences === 0) {
      throw new Error(`oldString not found in ${params.filePath}`);
    }

    if (occurrences > 1 && !params.replaceAll) {
      throw new Error(
        `oldString found ${occurrences} times in ${params.filePath}. Use replaceAll=true or provide more context to make the match unique.`
      );
    }

    const newContent = params.replaceAll
      ? content.replaceAll(params.oldString, params.newString)
      : content.replace(params.oldString, params.newString);

    await fs.writeFile(target, newContent, "utf-8");

    return `Successfully replaced ${occurrences} occurrence(s) in ${params.filePath}`;
  },
};
