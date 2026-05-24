/**
 * Routes: /api/tools
 *   GET    /tools                - list all tools (paginated)
 *   POST   /tools                - create a new tool
 *   GET    /tools/:id            - get tool detail
 *   PATCH  /tools/:id            - update tool
 *   DELETE /tools/:id            - delete tool
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { PaginatedParams } from "../schemas/common.js";
import { ToolCreate, ToolUpdate } from "../schemas/tool.js";
import * as toolsService from "../services/tools.js";
import { broadcastGlobal } from "../ws/manager.js";

const app = new Hono();

app.get("/tools", zValidator("query", PaginatedParams), async (c) => {
  const { limit, offset } = c.req.valid("query");
  const tools = await toolsService.listTools(limit, offset);
  return c.json(tools);
});

app.post("/tools", zValidator("json", ToolCreate), async (c) => {
  const data = c.req.valid("json");
  try {
    const tool = await toolsService.createTool(data);
    await broadcastGlobal("tool.created", tool);
    return c.json(tool, 201);
  } catch (e) {
    if (e instanceof Error && e.message.includes("already exists")) {
      throw new HTTPException(409, { message: e.message });
    }
    throw e;
  }
});

app.get("/tools/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const tool = await toolsService.getTool(id);
  if (!tool) throw new HTTPException(404, { message: "Tool not found" });
  return c.json(tool);
});

app.patch("/tools/:id", zValidator("json", ToolUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const tool = await toolsService.getTool(id);
  if (!tool) throw new HTTPException(404, { message: "Tool not found" });
  const data = c.req.valid("json");
  try {
    const updated = await toolsService.updateTool(id, data);
    await broadcastGlobal("tool.updated", updated);
    return c.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message.includes("already exists")) {
      throw new HTTPException(409, { message: e.message });
    }
    throw e;
  }
});

app.delete("/tools/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const tool = await toolsService.getTool(id);
  if (!tool) throw new HTTPException(404, { message: "Tool not found" });
  await toolsService.deleteTool(id);
  await broadcastGlobal("tool.deleted", { tool_id: id });
  return c.body(null, 204);
});

export default app;
