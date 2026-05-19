import { z } from "zod";

export const TaskRunRead = z.object({
  id: z.number(),
  task_id: z.number(),
  model_id: z.number().nullable(),
  agent_id: z.number().nullable(),
  status: z.string(),
  prompt: z.string().nullable(),
  output: z.string().nullable(),
  usage: z.string().nullable(),
  started_at: z.string().or(z.date()).nullable(),
  finished_at: z.string().or(z.date()).nullable(),
  error: z.string().nullable(),
});

export type TaskRunRead = z.infer<typeof TaskRunRead>;
