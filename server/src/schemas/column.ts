import { z } from "zod";

export const ColumnCreate = z.object({
  name: z.string().min(1).max(255),
  position: z.number().int().default(0),
  is_terminal: z.boolean().default(false),
});

export const ColumnRead = z.object({
  id: z.number(),
  project_id: z.number(),
  name: z.string(),
  position: z.number(),
  is_terminal: z.boolean(),
  created_at: z.string().or(z.date()),
});

export const ColumnUpdate = z.object({
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().optional(),
  is_terminal: z.boolean().optional(),
});

export const ColumnReorder = z.object({
  positions: z.record(z.string(), z.number().int()),
});

export type ColumnCreate = z.infer<typeof ColumnCreate>;
export type ColumnRead = z.infer<typeof ColumnRead>;
export type ColumnUpdate = z.infer<typeof ColumnUpdate>;
export type ColumnReorder = z.infer<typeof ColumnReorder>;
