import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  summary: z.string().min(1),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "plan_exit",
  description: "Exit a planning phase. Use this to signal that planning is complete and you are ready to execute.",
  parameters,
  async execute(params, ctx) {
    ctx.logger.info({ summary: params.summary }, "plan_exit: ended planning phase");
    return `Planning phase complete.\nSummary: ${params.summary}`;
  },
};
