import { z } from "zod";

export const ProjectCreate = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
});

export const ProjectRead = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export const ProjectUpdate = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
});

export type ProjectCreate = z.infer<typeof ProjectCreate>;
export type ProjectRead = z.infer<typeof ProjectRead>;
export type ProjectUpdate = z.infer<typeof ProjectUpdate>;
