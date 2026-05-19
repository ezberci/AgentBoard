import { z } from "zod";

export const TaskCommentCreate = z.object({
  author: z.string().min(1),
  body: z.string().min(1),
});

export const TaskCommentRead = z.object({
  id: z.number(),
  task_id: z.number(),
  author: z.string(),
  body: z.string(),
  created_at: z.string().or(z.date()),
});

export type TaskCommentCreate = z.infer<typeof TaskCommentCreate>;
export type TaskCommentRead = z.infer<typeof TaskCommentRead>;
