import { z } from "zod";

export const ToolCreate = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  handler_key: z.string().min(1).max(255),
  json_schema: z.string().optional(),
  is_enabled: z.boolean().optional(),
});

export const ToolRead = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  handler_key: z.string(),
  json_schema: z.string().nullable(),
  is_enabled: z.boolean(),
  created_at: z.string().or(z.date()),
});

export const ToolUpdate = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  handler_key: z.string().min(1).max(255).optional(),
  json_schema: z.string().optional(),
  is_enabled: z.boolean().optional(),
});

export type ToolCreate = z.infer<typeof ToolCreate>;
export type ToolRead = z.infer<typeof ToolRead>;
export type ToolUpdate = z.infer<typeof ToolUpdate>;
