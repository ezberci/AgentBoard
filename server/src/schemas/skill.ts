import { z } from "zod";

export const SkillCreate = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  allowed_tools: z.array(z.string()).optional(),
});

export const SkillRead = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  allowed_tools: z.array(z.string()).nullable().optional(),
  created_at: z.string().or(z.date()),
});

export const SkillUpdate = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  allowed_tools: z.array(z.string()).optional(),
});

export type SkillCreate = z.infer<typeof SkillCreate>;
export type SkillRead = z.infer<typeof SkillRead>;
export type SkillUpdate = z.infer<typeof SkillUpdate>;
