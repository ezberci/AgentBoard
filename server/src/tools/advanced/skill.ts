import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  skill_name: z.string().min(1),
  input: z.string().min(1),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "skill",
  description: "Invoke another skill by name with an input string. (Stub — full skill invocation is not yet implemented.)",
  parameters,
  async execute(params, ctx) {
    ctx.logger.info({ skillName: params.skill_name }, "skill: stub invocation");
    return `Skill invocation is not yet implemented. Skill: ${params.skill_name}, Input: ${params.input}`;
  },
};
