/**
 * Routes: /api/projects/:id/tasks, /api/tasks
 *   GET    /projects/:id/tasks    - list tasks for a project (paginated)
 *   POST   /tasks                 - create a new task
 *   GET    /tasks/:id             - get task detail (with comments)
 *   PATCH  /tasks/:id             - update task (409 on version mismatch)
 *   DELETE /tasks/:id             - delete task
 *   POST   /tasks/:id/move        - move task to column (409 on version mismatch)
 *   POST   /tasks/:id/comments    - add comment to task
 *   POST   /tasks/:id/run         - start LLM executor run (202 accepted)
 *   GET    /tasks/:id/runs        - list task runs (paginated)
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger.js";
import { PaginatedParams } from "../schemas/common.js";
import {
  TaskCreate,
  TaskMove,
  TaskRunCreate,
  TaskUpdate,
} from "../schemas/task.js";
import { TaskCommentCreate } from "../schemas/taskComment.js";
import * as commentsService from "../services/comments.js";
import * as projectsService from "../services/projects.js";
import * as runsService from "../services/runs.js";
import * as tasksService from "../services/tasks.js";
import { broadcastProject } from "../ws/manager.js";

const app = new Hono();

const MAX_CONCURRENT_RUNS = 5;
let activeRuns = 0;

app.get("/projects/:id/tasks", zValidator("query", PaginatedParams), async (c) => {
  const projectId = Number(c.req.param("id"));
  const project = await projectsService.getProject(projectId);
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  const { limit, offset } = c.req.valid("query");
  const tasks = await tasksService.listTasksByProject(projectId, limit, offset);
  return c.json(tasks);
});

app.post("/tasks", zValidator("json", TaskCreate), async (c) => {
  const data = c.req.valid("json");
  const task = await tasksService.createTask(data);
  await broadcastProject(task.project_id, "task.created", task);
  return c.json(task, 201);
});

app.get("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const task = await tasksService.getTask(id);
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  const status = tasksService.deriveStatus(task);
  return c.json({ ...task, status });
});

app.patch("/tasks/:id", zValidator("json", TaskUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const task = await tasksService.getTask(id);
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  const data = c.req.valid("json");
  if (data.expected_version === undefined) {
    data.expected_version = task.version;
  }
  try {
    const updated = await tasksService.updateTask(id, data);
    await broadcastProject(updated.project_id, "task.updated", updated);
    return c.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "version mismatch") {
      throw new HTTPException(409, { message: "Task was modified by another client" });
    }
    throw e;
  }
});

app.delete("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const task = await tasksService.getTask(id);
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  const projectId = task.project_id;
  await tasksService.deleteTask(id);
  await broadcastProject(projectId, "task.deleted", { task_id: id });
  return c.body(null, 204);
});

app.post("/tasks/:id/move", zValidator("json", TaskMove), async (c) => {
  const id = Number(c.req.param("id"));
  const task = await tasksService.getTask(id);
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  const data = c.req.valid("json");
  if (data.expected_version === undefined) {
    data.expected_version = task.version;
  }
  try {
    const updated = await tasksService.moveTask(id, data);
    await broadcastProject(updated.project_id, "task.moved", updated);
    return c.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "version mismatch") {
      throw new HTTPException(409, { message: "Task was modified by another client" });
    }
    throw e;
  }
});

app.post("/tasks/:id/comments", zValidator("json", TaskCommentCreate), async (c) => {
  const id = Number(c.req.param("id"));
  const task = await tasksService.getTask(id);
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  const data = c.req.valid("json");
  const comment = await commentsService.createComment(id, data);
  await broadcastProject(task.project_id, "comment.created", comment);
  return c.json(comment, 201);
});

app.post("/tasks/:id/run", zValidator("json", TaskRunCreate), async (c) => {
  const id = Number(c.req.param("id"));
  const task = await tasksService.getTask(id);
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  const data = c.req.valid("json");

  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    throw new HTTPException(503, { message: "Server busy, try again later" });
  }

  const prompt = data.prompt ?? (task.description || task.title);
  activeRuns++;

  runsService
    .executeTaskRun(id, data.model_id, prompt)
    .catch((err) => logger.error({ err }, "task_run_failed"))
    .finally(() => {
      activeRuns--;
    });

  return c.json({ status: "started", task_id: id }, 202);
});

app.get("/tasks/:id/runs", zValidator("query", PaginatedParams), async (c) => {
  const id = Number(c.req.param("id"));
  const task = await tasksService.getTask(id);
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  const { limit, offset } = c.req.valid("query");
  const runs = await runsService.listTaskRuns(id, limit, offset);
  return c.json(runs);
});

export default app;
