import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import type { ToolCreate, ToolUpdate } from "../schemas/tool.js";

export async function createTool(data: ToolCreate) {
  try {
    const tool = await prisma.tool.create({
      data: {
        name: data.name,
        description: data.description,
        handler_key: data.handler_key,
        json_schema: data.json_schema,
        is_enabled: data.is_enabled ?? true,
      },
    });
    return tool;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Tool with name '${data.name}' already exists`);
    }
    throw e;
  }
}

export async function getTool(toolId: number) {
  return prisma.tool.findUnique({ where: { id: toolId } });
}

export async function getToolByName(name: string) {
  return prisma.tool.findUnique({ where: { name } });
}

export async function listTools(limit = 50, offset = 0) {
  return prisma.tool.findMany({
    take: limit,
    skip: offset,
    orderBy: { created_at: "desc" },
  });
}

export async function updateTool(toolId: number, data: ToolUpdate) {
  try {
    return await prisma.tool.update({
      where: { id: toolId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.handler_key !== undefined && { handler_key: data.handler_key }),
        ...(data.json_schema !== undefined && { json_schema: data.json_schema }),
        ...(data.is_enabled !== undefined && { is_enabled: data.is_enabled }),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Tool with name '${data.name}' already exists`);
    }
    throw e;
  }
}

export async function deleteTool(toolId: number) {
  await prisma.tool.delete({ where: { id: toolId } });
}
