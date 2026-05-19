import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import type { ModelCreate, ModelUpdate } from "../schemas/model.js";

export async function listModels(limit = 50, offset = 0) {
  return prisma.model.findMany({
    orderBy: { name: "asc" },
    take: limit,
    skip: offset,
  });
}

export async function getModel(modelId: number) {
  return prisma.model.findUnique({ where: { id: modelId } });
}

export async function createModel(data: ModelCreate) {
  try {
    return await prisma.model.create({
      data: {
        name: data.name,
        provider: data.provider,
        model_id: data.model_id,
        api_key_env: data.api_key_env,
        base_url: data.base_url,
        is_enabled: data.is_enabled,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`Model with name '${data.name}' already exists`);
    }
    throw e;
  }
}

export async function updateModel(modelId: number, data: ModelUpdate) {
  return prisma.model.update({
    where: { id: modelId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.model_id !== undefined && { model_id: data.model_id }),
      ...(data.api_key_env !== undefined && { api_key_env: data.api_key_env }),
      ...(data.base_url !== undefined && { base_url: data.base_url }),
      ...(data.is_enabled !== undefined && { is_enabled: data.is_enabled }),
    },
  });
}

export async function deleteModel(modelId: number) {
  await prisma.model.delete({ where: { id: modelId } });
}
