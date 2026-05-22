import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import type { SkillCreate, SkillUpdate } from "../schemas/skill.js";

function parseAllowedTools(value: string | null): unknown[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function serializeAllowedTools(value: unknown[] | undefined): string | undefined {
  if (!value || value.length === 0) return undefined;
  return JSON.stringify(value);
}

export async function createSkill(data: SkillCreate) {
  try {
    const skill = await prisma.skill.create({
      data: {
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        allowed_tools: serializeAllowedTools(data.allowed_tools),
      },
    });
    return { ...skill, allowed_tools: parseAllowedTools(skill.allowed_tools) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Skill with name '${data.name}' already exists`);
    }
    throw e;
  }
}

export async function getSkill(skillId: number) {
  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) return null;
  return { ...skill, allowed_tools: parseAllowedTools(skill.allowed_tools) };
}

export async function listSkills(limit = 50, offset = 0) {
  const skills = await prisma.skill.findMany({ take: limit, skip: offset });
  return skills.map((skill) => ({
    ...skill,
    allowed_tools: parseAllowedTools(skill.allowed_tools),
  }));
}

export async function updateSkill(skillId: number, data: SkillUpdate) {
  const skill = await prisma.skill.update({
    where: { id: skillId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.instructions !== undefined && { instructions: data.instructions }),
      ...(data.allowed_tools !== undefined && { allowed_tools: serializeAllowedTools(data.allowed_tools) }),
    },
  });
  return { ...skill, allowed_tools: parseAllowedTools(skill.allowed_tools) };
}

export async function deleteSkill(skillId: number) {
  await prisma.skill.delete({ where: { id: skillId } });
}
