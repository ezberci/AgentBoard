/**
 * Routes: /api/agents
 *   GET    /agents                - list all agents (paginated)
 *   POST   /agents                - create a new agent
 *   GET    /agents/:id            - get agent detail (with skills)
 *   PATCH  /agents/:id            - update agent
 *   DELETE /agents/:id            - delete agent
 *   POST   /agents/:id/skills/:skillId - assign skill to agent
 *   DELETE /agents/:id/skills/:skillId - remove skill from agent
 *   POST   /agents/:id/tools/:toolId   - assign tool to agent
 *   DELETE /agents/:id/tools/:toolId   - remove tool from agent
 */
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AgentCreate, AgentUpdate } from "../schemas/agent.js";
import { PaginatedParams } from "../schemas/common.js";
import * as agentsService from "../services/agents.js";
import * as skillsService from "../services/skills.js";
import * as toolsService from "../services/tools.js";
import { broadcastGlobal } from "../ws/manager.js";

const app = new Hono();

app.get("/agents", zValidator("query", PaginatedParams), async (c) => {
  const { limit, offset } = c.req.valid("query");
  const agents = await agentsService.listAgents(limit, offset);
  return c.json(agents);
});

app.post("/agents", zValidator("json", AgentCreate), async (c) => {
  const data = c.req.valid("json");
  const agent = await agentsService.createAgent(data);
  await broadcastGlobal("agent.created", agent);
  return c.json(agent, 201);
});

app.get("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const agent = await agentsService.getAgent(id);
  if (!agent) throw new HTTPException(404, { message: "Agent not found" });
  return c.json(agent);
});

app.patch("/agents/:id", zValidator("json", AgentUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const agent = await agentsService.getAgent(id);
  if (!agent) throw new HTTPException(404, { message: "Agent not found" });
  const data = c.req.valid("json");
  const updated = await agentsService.updateAgent(id, data);
  await broadcastGlobal("agent.updated", updated);
  return c.json(updated);
});

app.delete("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const agent = await agentsService.getAgent(id);
  if (!agent) throw new HTTPException(404, { message: "Agent not found" });
  await agentsService.deleteAgent(id);
  await broadcastGlobal("agent.deleted", { agent_id: id });
  return c.body(null, 204);
});

app.post("/agents/:id/skills/:skillId", async (c) => {
  const id = Number(c.req.param("id"));
  const skillId = Number(c.req.param("skillId"));
  const agent = await agentsService.getAgent(id);
  if (!agent) throw new HTTPException(404, { message: "Agent not found" });
  const skill = await skillsService.getSkill(skillId);
  if (!skill) throw new HTTPException(404, { message: "Skill not found" });
  const updated = await agentsService.assignSkill(id, skillId);
  await broadcastGlobal("agent.updated", updated);
  return c.json(updated);
});

app.delete("/agents/:id/skills/:skillId", async (c) => {
  const id = Number(c.req.param("id"));
  const skillId = Number(c.req.param("skillId"));
  const agent = await agentsService.getAgent(id);
  if (!agent) throw new HTTPException(404, { message: "Agent not found" });
  const skill = await skillsService.getSkill(skillId);
  if (!skill) throw new HTTPException(404, { message: "Skill not found" });
  const updated = await agentsService.removeSkill(id, skillId);
  await broadcastGlobal("agent.updated", updated);
  return c.json(updated);
});

app.post("/agents/:id/tools/:toolId", async (c) => {
  const id = Number(c.req.param("id"));
  const toolId = Number(c.req.param("toolId"));
  const agent = await agentsService.getAgent(id);
  if (!agent) throw new HTTPException(404, { message: "Agent not found" });
  const tool = await toolsService.getTool(toolId);
  if (!tool) throw new HTTPException(404, { message: "Tool not found" });
  const updated = await agentsService.assignTool(id, toolId);
  await broadcastGlobal("agent.updated", updated);
  return c.json(updated);
});

app.delete("/agents/:id/tools/:toolId", async (c) => {
  const id = Number(c.req.param("id"));
  const toolId = Number(c.req.param("toolId"));
  const agent = await agentsService.getAgent(id);
  if (!agent) throw new HTTPException(404, { message: "Agent not found" });
  const tool = await toolsService.getTool(toolId);
  if (!tool) throw new HTTPException(404, { message: "Tool not found" });
  const updated = await agentsService.removeTool(id, toolId);
  await broadcastGlobal("agent.updated", updated);
  return c.json(updated);
});

export default app;
