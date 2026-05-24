import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "plan_enter",
  description: "Enter a planning phase. Use this to signal that you are starting structured planning before taking action.",
  parameters,
  async execute(params, ctx) {
    ctx.logger.info({ title: params.title }, "plan_enter: started planning phase");
    return `Planning phase started: ${params.title}\n${params.description}`;
  },
};
