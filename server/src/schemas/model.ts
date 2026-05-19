import { z } from "zod";

export const ModelCreate = z.object({
  name: z.string().min(1).max(255),
  provider: z.string().min(1),
  model_id: z.string().min(1),
  api_key_env: z.string().min(1),
  base_url: z.string().optional(),
  is_enabled: z.boolean().default(true),
});

export const ModelRead = z.object({
  id: z.number(),
  name: z.string(),
  provider: z.string(),
  model_id: z.string(),
  api_key_env: z.string(),
  base_url: z.string().nullable(),
  is_enabled: z.boolean(),
  created_at: z.string().or(z.date()),
});

export const ModelUpdate = z.object({
  name: z.string().min(1).max(255).optional(),
  provider: z.string().min(1).optional(),
  model_id: z.string().min(1).optional(),
  api_key_env: z.string().min(1).optional(),
  base_url: z.string().optional(),
  is_enabled: z.boolean().optional(),
});

export type ModelCreate = z.infer<typeof ModelCreate>;
export type ModelRead = z.infer<typeof ModelRead>;
export type ModelUpdate = z.infer<typeof ModelUpdate>;
