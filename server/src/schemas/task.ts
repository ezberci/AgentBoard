import { z } from "zod";

export const TaskCreate = z.object({
  project_id: z.number(),
  column_id: z.number().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000).optional(),
  priority: z.number().min(1).max(5).default(4),
  assigned_agent_id: z.number().nullable().optional(),
});

export const TaskRead = z.object({
  id: z.number(),
  project_id: z.number(),
  column_id: z.number().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.number(),
  result: z.string().nullable(),
  assigned_agent_id: z.number().nullable(),
  version: z.number(),
  claimed_at: z.string().or(z.date()).nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export const TaskUpdate = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
  priority: z.number().min(1).max(5).optional(),
  result: z.string().min(1).max(50000).optional(),
  assigned_agent_id: z.number().nullable().optional(),
  expected_version: z.number().optional(),
});

export const TaskMove = z.object({
  column_id: z.number(),
  expected_version: z.number().optional(),
});

export const TaskRunCreate = z.object({
  model_id: z.number(),
  prompt: z.string().optional(),
});

export type TaskCreate = z.infer<typeof TaskCreate>;
export type TaskRead = z.infer<typeof TaskRead>;
export type TaskUpdate = z.infer<typeof TaskUpdate>;
export type TaskMove = z.infer<typeof TaskMove>;
export type TaskRunCreate = z.infer<typeof TaskRunCreate>;
