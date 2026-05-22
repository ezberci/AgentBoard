/**
 * Routes: /api/models
 *   GET    /models                - list all models (paginated)
 *   POST   /models                - create a new model
 *   GET    /models/health         - check env var presence for each model
 *   GET    /models/:id            - get model detail
 *   PATCH  /models/:id            - update model
 *   DELETE /models/:id            - delete model
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { PaginatedParams } from "../schemas/common.js";
import { ModelCreate, ModelUpdate } from "../schemas/model.js";
import * as modelsService from "../services/models.js";
import { broadcastGlobal } from "../ws/manager.js";

const app = new Hono();

app.get("/models", zValidator("query", PaginatedParams), async (c) => {
  const { limit, offset } = c.req.valid("query");
  const models = await modelsService.listModels(limit, offset);
  return c.json(models);
});

app.post("/models", zValidator("json", ModelCreate), async (c) => {
  const data = c.req.valid("json");
  const model = await modelsService.createModel(data);
  await broadcastGlobal("model.created", model);
  return c.json(model, 201);
});

// Static routes BEFORE param routes — Hono matches top-down
app.get("/models/health", async (c) => {
  const models = await modelsService.listModels();
  const health = models.map((m) => ({
    id: m.id,
    name: m.name,
    env_var: m.api_key_env,
    env_present: !!process.env[m.api_key_env],
  }));
  return c.json(health);
});

app.get("/models/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const model = await modelsService.getModel(id);
  if (!model) throw new HTTPException(404, { message: "Model not found" });
  return c.json(model);
});

app.patch("/models/:id", zValidator("json", ModelUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const model = await modelsService.getModel(id);
  if (!model) throw new HTTPException(404, { message: "Model not found" });
  const data = c.req.valid("json");
  const updated = await modelsService.updateModel(id, data);
  await broadcastGlobal("model.updated", updated);
  return c.json(updated);
});

app.delete("/models/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const model = await modelsService.getModel(id);
  if (!model) throw new HTTPException(404, { message: "Model not found" });
  await modelsService.deleteModel(id);
  await broadcastGlobal("model.deleted", { model_id: id });
  return c.body(null, 204);
});

export default app;
