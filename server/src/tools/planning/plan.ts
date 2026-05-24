import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  goal: z.string().min(1),
  steps: z.array(z.string().min(1)),
});

const plans = new Map<number, { goal: string; steps: string[] }>();

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "plan",
  description: "Create a structured plan with a goal and ordered steps. The plan is stored for the current task run.",
  parameters,
  async execute(params, ctx) {
    const { goal, steps } = params;
    plans.set(ctx.taskRunId, { goal, steps });
    ctx.logger.info({ taskRunId: ctx.taskRunId, goal, stepCount: steps.length }, "plan: created");

    const lines = [`Goal: ${goal}`, "", "Steps:"];
    steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    return lines.join("\n");
  },
};
