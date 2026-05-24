import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  question: z.string().min(1),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "question",
  description: "Ask the user a clarifying question when requirements are ambiguous or missing. The question will be surfaced to the user interface.",
  parameters,
  async execute(params, ctx) {
    ctx.logger.info({ question: params.question }, "question: asking user");
    return `[AWAITING USER INPUT] ${params.question}`;
  },
};
