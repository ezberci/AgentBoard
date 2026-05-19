import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { env } from "../lib/config.js";

export async function requireAuth(c: Context, next: Next): Promise<void> {
  const apiKey = c.req.header("x-api-key");
  if (apiKey !== env.apiKey) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
}
