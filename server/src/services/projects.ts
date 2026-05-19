import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { logger } from "../lib/logger.js";
import { slugify } from "../lib/utils.js";
import type { ProjectCreate, ProjectUpdate } from "../schemas/project.js";

export async function createProject(data: ProjectCreate) {
  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let counter = 2;
  while (true) {
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}${counter}`;
    counter++;
  }

  const project = await prisma.project.create({
    data: { name: data.name, slug, description: data.description },
  });
  logger.info({ project_id: project.id, slug }, "project_created");
  return project;
}

export async function getProject(projectId: number) {
  return prisma.project.findUnique({ where: { id: projectId } });
}

export async function listProjects(limit = 50, offset = 0) {
  return prisma.project.findMany({ take: limit, skip: offset });
}

export async function updateProject(projectId: number, data: ProjectUpdate) {
  const project = await getProject(projectId);
  if (!project) return null;

  const updateData: Prisma.ProjectUpdateInput = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 2;
    while (true) {
      const existing = await prisma.project.findFirst({
        where: { slug, NOT: { id: projectId } },
      });
      if (!existing) break;
      slug = `${baseSlug}${counter}`;
      counter++;
    }
    updateData.slug = slug;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });
  logger.info({ project_id: updated.id }, "project_updated");
  return updated;
}

export async function deleteProject(projectId: number) {
  await prisma.project.delete({ where: { id: projectId } });
  logger.info({ project_id: projectId }, "project_deleted");
}
