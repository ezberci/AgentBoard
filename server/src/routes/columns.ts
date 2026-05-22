/**
 * Routes: /api/projects/:id/columns, /api/columns
 *   GET    /projects/:id/columns  - list columns for a project (paginated)
 *   POST   /projects/:id/columns  - create column in project
 *   PATCH  /columns/:id           - update column
 *   DELETE /columns/:id           - delete column
 *   POST   /columns/:id/reorder   - reorder columns within project
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ColumnCreate, ColumnReorder, ColumnUpdate } from "../schemas/column.js";
import { PaginatedParams } from "../schemas/common.js";
import * as columnsService from "../services/columns.js";
import * as projectsService from "../services/projects.js";
import { broadcastProject } from "../ws/manager.js";

const app = new Hono();

app.get("/projects/:id/columns", zValidator("query", PaginatedParams), async (c) => {
  const projectId = Number(c.req.param("id"));
  const project = await projectsService.getProject(projectId);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  const { limit, offset } = c.req.valid("query");
  const columns = await columnsService.listColumnsByProject(projectId, limit, offset);
  return c.json(columns);
});

app.post("/projects/:id/columns", zValidator("json", ColumnCreate), async (c) => {
  const projectId = Number(c.req.param("id"));
  const project = await projectsService.getProject(projectId);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  const data = c.req.valid("json");
  const column = await columnsService.createColumn(projectId, data);
  await broadcastProject(projectId, "column.created", column);
  return c.json(column, 201);
});

app.patch("/columns/:id", zValidator("json", ColumnUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const column = await columnsService.getColumn(id);
  if (!column) throw new HTTPException(404, { message: "Column not found" });
  const data = c.req.valid("json");
  const updated = await columnsService.updateColumn(id, data);
  await broadcastProject(column.project_id, "column.updated", updated);
  return c.json(updated);
});

app.delete("/columns/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const column = await columnsService.getColumn(id);
  if (!column) throw new HTTPException(404, { message: "Column not found" });
  await columnsService.deleteColumn(id);
  await broadcastProject(column.project_id, "column.deleted", { column_id: id });
  return c.body(null, 204);
});

app.post("/columns/:id/reorder", zValidator("json", ColumnReorder), async (c) => {
  const id = Number(c.req.param("id"));
  const column = await columnsService.getColumn(id);
  if (!column) throw new HTTPException(404, { message: "Column not found" });
  const data = c.req.valid("json");
  const columns = await columnsService.reorderColumns(column.project_id, data);
  return c.json(columns);
});

export default app;
