import { Prisma } from "@prisma/client";
import type { Agent, AgentSkill, Skill, AgentTool, Tool } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { logger } from "../lib/logger.js";
import { slugToColor } from "../lib/utils.js";
import type { AgentCreate, AgentUpdate } from "../schemas/agent.js";

type AgentWithRelations = Agent & {
  agentSkills: (AgentSkill & { skill: Skill })[];
  agentTools: (AgentTool & { tool: Tool })[];
};

function mapAgent(agent: AgentWithRelations) {
  const { agentSkills, agentTools, ...rest } = agent;
  return {
    ...rest,
    skills: agentSkills.map((as) => as.skill),
    tools: agentTools.map((at) => at.tool),
  };
}

export async function createAgent(data: AgentCreate) {
  const baseColor = data.color ?? slugToColor(data.name);
  let color = baseColor;
  let counter = 2;
  while (true) {
    const existing = await prisma.agent.findUnique({ where: { color } });
    if (!existing) break;
    color = `${baseColor}${counter}`;
    counter++;
  }

  try {
    const agent = await prisma.agent.create({
      data: { name: data.name, system_prompt: data.system_prompt, color },
      include: {
        agentSkills: { include: { skill: true } },
        agentTools: { include: { tool: true } },
      },
    });
    logger.info({ agent_id: agent.id, color: agent.color }, "agent_created");
    return agent;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Agent with name '${data.name}' already exists`);
    }
    throw e;
  }
}

export async function getAgent(agentId: number) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      agentSkills: { include: { skill: true } },
      agentTools: { include: { tool: true } },
    },
  });
  return agent ? mapAgent(agent) : null;
}

export async function listAgents(limit = 50, offset = 0) {
  const agents = await prisma.agent.findMany({
    include: {
      agentSkills: { include: { skill: true } },
      agentTools: { include: { tool: true } },
    },
    take: limit,
    skip: offset,
  });
  return agents.map(mapAgent);
}

export async function updateAgent(agentId: number, data: AgentUpdate) {
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.system_prompt !== undefined && { system_prompt: data.system_prompt }),
      ...(data.color !== undefined && { color: data.color }),
    },
    include: {
      agentSkills: { include: { skill: true } },
      agentTools: { include: { tool: true } },
    },
  });
  return mapAgent(agent);
}

export async function deleteAgent(agentId: number) {
  await prisma.agent.delete({ where: { id: agentId } });
  logger.info({ agent_id: agentId }, "agent_deleted");
}

export async function assignSkill(agentId: number, skillId: number) {
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { agentSkills: { create: { skill_id: skillId } } },
    include: {
      agentSkills: { include: { skill: true } },
      agentTools: { include: { tool: true } },
    },
  });
  return mapAgent(agent);
}

export async function removeSkill(agentId: number, skillId: number) {
  await prisma.agentSkill.deleteMany({
    where: { agent_id: agentId, skill_id: skillId },
  });
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      agentSkills: { include: { skill: true } },
      agentTools: { include: { tool: true } },
    },
  });
  return agent ? mapAgent(agent) : null;
}

export async function assignTool(agentId: number, toolId: number) {
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { agentTools: { create: { tool_id: toolId } } },
    include: {
      agentSkills: { include: { skill: true } },
      agentTools: { include: { tool: true } },
    },
  });
  return mapAgent(agent);
}

export async function removeTool(agentId: number, toolId: number) {
  await prisma.agentTool.deleteMany({
    where: { agent_id: agentId, tool_id: toolId },
  });
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      agentSkills: { include: { skill: true } },
      agentTools: { include: { tool: true } },
    },
  });
  return agent ? mapAgent(agent) : null;
}
