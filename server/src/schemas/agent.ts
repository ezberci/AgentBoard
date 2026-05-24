import { z } from "zod";
import { ToolRead } from "./tool.js";

export const AgentCreate = z.object({
  name: z.string().min(1).max(255),
  system_prompt: z.string().min(1).max(10000).optional(),
  color: z.string().min(1).max(50).optional(),
});

export const AgentRead = z.object({
  id: z.number(),
  name: z.string(),
  system_prompt: z.string().nullable(),
  color: z.string().nullable(),
  created_at: z.string().or(z.date()),
  skills: z.array(z.any()).optional(),
  tools: z.array(ToolRead).optional(),
});

export const AgentUpdate = z.object({
  name: z.string().min(1).max(255).optional(),
  system_prompt: z.string().min(1).max(10000).optional(),
  color: z.string().min(1).max(50).optional(),
});

export type AgentCreate = z.infer<typeof AgentCreate>;
export type AgentRead = z.infer<typeof AgentRead>;
export type AgentUpdate = z.infer<typeof AgentUpdate>;
