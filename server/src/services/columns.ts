import { prisma } from "../prisma/client.js";
import type { ColumnCreate, ColumnReorder, ColumnUpdate } from "../schemas/column.js";

export async function createColumn(projectId: number, data: ColumnCreate) {
  return prisma.column.create({
    data: {
      project_id: projectId,
      name: data.name,
      position: data.position,
      is_terminal: data.is_terminal,
    },
  });
}

export async function getColumn(columnId: number) {
  return prisma.column.findUnique({ where: { id: columnId } });
}

export async function listColumnsByProject(projectId: number, limit = 50, offset = 0) {
  return prisma.column.findMany({
    where: { project_id: projectId },
    orderBy: { position: "asc" },
    take: limit,
    skip: offset,
  });
}

export async function updateColumn(columnId: number, data: ColumnUpdate) {
  return prisma.column.update({
    where: { id: columnId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.is_terminal !== undefined && { is_terminal: data.is_terminal }),
    },
  });
}

export async function deleteColumn(columnId: number) {
  await prisma.column.delete({ where: { id: columnId } });
}

export async function reorderColumns(projectId: number, data: ColumnReorder) {
  const columns = await prisma.column.findMany({ where: { project_id: projectId } });
  const updates = [];
  for (const col of columns) {
    const newPos = data.positions[String(col.id)];
    if (newPos !== undefined) {
      updates.push(prisma.column.update({ where: { id: col.id }, data: { position: newPos } }));
    }
  }
  await prisma.$transaction(updates);
  return prisma.column.findMany({ where: { project_id: projectId }, orderBy: { position: "asc" } });
}
