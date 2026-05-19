import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import type { SkillCreate, SkillUpdate } from "../schemas/skill.js";

export async function createSkill(data: SkillCreate) {
  try {
    return await prisma.skill.create({
      data: {
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        allowed_tools: data.allowed_tools,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Skill with name '${data.name}' already exists`);
    }
    throw e;
  }
}

export async function getSkill(skillId: number) {
  return prisma.skill.findUnique({ where: { id: skillId } });
}

export async function listSkills(limit = 50, offset = 0) {
  return prisma.skill.findMany({ take: limit, skip: offset });
}

export async function updateSkill(skillId: number, data: SkillUpdate) {
  return prisma.skill.update({
    where: { id: skillId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.instructions !== undefined && { instructions: data.instructions }),
      ...(data.allowed_tools !== undefined && { allowed_tools: data.allowed_tools }),
    },
  });
}

export async function deleteSkill(skillId: number) {
  await prisma.skill.delete({ where: { id: skillId } });
}
