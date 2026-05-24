import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  content: z.string(),
  max_length: z.number().int().min(1).optional(),
  strategy: z.enum(["head", "tail", "middle"]).optional(),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "truncate",
  description: "Truncate content to a maximum length using head, tail, or middle strategy.",
  parameters,
  async execute(params, ctx) {
    const { content, max_length: maxLengthParam, strategy: strategyParam } = params;
    const max_length = maxLengthParam ?? 4000;
    const strategy = strategyParam ?? "head";
    if (content.length <= max_length) {
      return content;
    }

    ctx.logger.info({ original: content.length, max_length, strategy }, "truncate: truncating");

    if (strategy === "head") {
      return content.slice(0, max_length) + "\n... [truncated]";
    }

    if (strategy === "tail") {
      return "... [truncated]\n" + content.slice(-max_length);
    }

    // middle
    const half = Math.floor(max_length / 2);
    return content.slice(0, half) + "\n... [truncated] ...\n" + content.slice(-half);
  },
};
