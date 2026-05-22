/**
 * Routes: /api/skills
 *   GET    /skills                - list all skills (paginated)
 *   POST   /skills                - create a new skill
 *   GET    /skills/:id            - get skill detail
 *   PATCH  /skills/:id            - update skill
 *   DELETE /skills/:id            - delete skill
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { PaginatedParams } from "../schemas/common.js";
import { SkillCreate, SkillUpdate } from "../schemas/skill.js";
import * as skillsService from "../services/skills.js";
import { broadcastGlobal } from "../ws/manager.js";

const app = new Hono();

app.get("/skills", zValidator("query", PaginatedParams), async (c) => {
  const { limit, offset } = c.req.valid("query");
  const skills = await skillsService.listSkills(limit, offset);
  return c.json(skills);
});

app.post("/skills", zValidator("json", SkillCreate), async (c) => {
  const data = c.req.valid("json");
  const skill = await skillsService.createSkill(data);
  await broadcastGlobal("skill.created", skill);
  return c.json(skill, 201);
});

app.get("/skills/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const skill = await skillsService.getSkill(id);
  if (!skill) throw new HTTPException(404, { message: "Skill not found" });
  return c.json(skill);
});

app.patch("/skills/:id", zValidator("json", SkillUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const skill = await skillsService.getSkill(id);
  if (!skill) throw new HTTPException(404, { message: "Skill not found" });
  const data = c.req.valid("json");
  const updated = await skillsService.updateSkill(id, data);
  await broadcastGlobal("skill.updated", updated);
  return c.json(updated);
});

app.delete("/skills/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const skill = await skillsService.getSkill(id);
  if (!skill) throw new HTTPException(404, { message: "Skill not found" });
  await skillsService.deleteSkill(id);
  await broadcastGlobal("skill.deleted", { skill_id: id });
  return c.body(null, 204);
});

export default app;
