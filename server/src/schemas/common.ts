import { z } from "zod";

export const PaginatedParams = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type PaginatedParams = z.infer<typeof PaginatedParams>;
