import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ProjectCreate, ProjectUpdate } from "../schemas/project.js";
import { PaginatedParams } from "../schemas/common.js";
import * as projectsService from "../services/projects.js";
import { broadcastGlobal } from "../ws/manager.js";

const app = new Hono();

app.get("/projects", zValidator("query", PaginatedParams), async (c) => {
  const { limit, offset } = c.req.valid("query");
  const projects = await projectsService.listProjects(limit, offset);
  return c.json(projects);
});

app.post("/projects", zValidator("json", ProjectCreate), async (c) => {
  const data = c.req.valid("json");
  const project = await projectsService.createProject(data);
  await broadcastGlobal("project.created", project);
  return c.json(project, 201);
});

app.get("/projects/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const project = await projectsService.getProject(id);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  return c.json(project);
});

app.patch("/projects/:id", zValidator("json", ProjectUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");
  const project = await projectsService.updateProject(id, data);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  await broadcastGlobal("project.updated", project);
  return c.json(project);
});

app.delete("/projects/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const project = await projectsService.getProject(id);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  await projectsService.deleteProject(id);
  await broadcastGlobal("project.deleted", { project_id: id });
  return c.body(null, 204);
});

export default app;
