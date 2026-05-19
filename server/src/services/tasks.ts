import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client.js";
import { logger } from "../lib/logger.js";
import type { TaskCreate, TaskMove, TaskUpdate } from "../schemas/task.js";

export async function createTask(data: TaskCreate) {
  const task = await prisma.task.create({
    data: {
      project_id: data.project_id,
      column_id: data.column_id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigned_agent_id: data.assigned_agent_id,
    },
  });

  if (task.column_id !== null) {
    const column = await prisma.column.findUnique({
      where: { id: task.column_id },
    });
    if (!column || column.project_id !== task.project_id) {
      throw new Error("Column does not belong to project");
    }
  }

  logger.info({ task_id: task.id }, "task_created");
  return task;
}

export async function getTask(taskId: number) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { comments: true },
  });
}

export async function listTasksByProject(projectId: number, limit = 50, offset = 0) {
  return prisma.task.findMany({
    where: { project_id: projectId },
    take: limit,
    skip: offset,
  });
}

export async function listTasksFiltered(
  projectId: number,
  status?: string,
  agentId?: number,
  priorityGte?: number
) {
  const conditions: string[] = [`t.project_id = ${projectId}`];

  if (status === "todo") {
    conditions.push("t.claimed_at IS NULL");
  } else if (status === "in_progress") {
    conditions.push("t.claimed_at IS NOT NULL");
    conditions.push("c.is_terminal = 0");
  } else if (status === "done") {
    conditions.push("c.is_terminal = 1");
  }

  if (agentId !== undefined) {
    conditions.push(`t.assigned_agent_id = ${agentId}`);
  }
  if (priorityGte !== undefined) {
    conditions.push(`t.priority >= ${priorityGte}`);
  }

  const whereClause = conditions.join(" AND ");

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      project_id: number;
      column_id: number | null;
      title: string;
      description: string | null;
      priority: number;
      result: string | null;
      assigned_agent_id: number | null;
      version: number;
      claimed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>
  >(`
    SELECT t.* FROM tasks t
    LEFT JOIN columns c ON t.column_id = c.id
    WHERE ${whereClause}
    ORDER BY t.priority ASC, t.created_at ASC
  `);

  return rows;
}

export async function updateTask(taskId: number, data: TaskUpdate) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (data.expected_version !== undefined && task.version !== data.expected_version) {
    throw new Error("version mismatch");
  }

  const updateData: Prisma.TaskUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.result !== undefined) updateData.result = data.result;
  if (data.assigned_agent_id !== undefined) {
    if (data.assigned_agent_id !== null) {
      const agent = await prisma.agent.findUnique({ where: { id: data.assigned_agent_id } });
      if (!agent) throw new Error("Agent not found");
      updateData.assignedAgent = { connect: { id: data.assigned_agent_id } };
    } else {
      updateData.assignedAgent = { disconnect: true };
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { ...updateData, version: { increment: 1 } },
  });
  logger.info({ task_id: updated.id, version: updated.version }, "task_updated");
  return updated;
}

export async function moveTask(taskId: number, data: TaskMove) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (data.expected_version !== undefined && task.version !== data.expected_version) {
    throw new Error("version mismatch");
  }

  const column = await prisma.column.findUnique({ where: { id: data.column_id } });
  if (!column || column.project_id !== task.project_id) {
    throw new Error("Column does not belong to project");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { column_id: data.column_id, version: { increment: 1 } },
  });
  logger.info({ task_id: updated.id, column_id: updated.column_id }, "task_moved");
  return updated;
}

export async function deleteTask(taskId: number) {
  await prisma.task.delete({ where: { id: taskId } });
  logger.info({ task_id: taskId }, "task_deleted");
}

export async function assignAgentToTask(taskId: number, agentId: number) {
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { assigned_agent_id: agentId },
  });
  logger.info({ task_id: taskId, agent_id: agentId }, "task_assigned");
  return updated;
}

export async function unassignAgent(taskId: number) {
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { assigned_agent_id: null },
  });
  logger.info({ task_id: taskId }, "task_unassigned");
  return updated;
}

export async function claimNextTask(agentId: number, projectId: number) {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      project_id: number;
      column_id: number | null;
      title: string;
      description: string | null;
      priority: number;
      result: string | null;
      assigned_agent_id: number | null;
      version: number;
      claimed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>
  >(`
    UPDATE tasks
    SET
      column_id = (
        SELECT c2.id
        FROM columns c2
        WHERE c2.project_id = ${projectId}
        AND c2.position > (
          SELECT c.position FROM columns c WHERE c.id = tasks.column_id
        )
        ORDER BY c2.position ASC
        LIMIT 1
      ),
      claimed_at = CURRENT_TIMESTAMP,
      assigned_agent_id = ${agentId},
      version = version + 1
    WHERE id = (
      SELECT t.id
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      WHERE t.project_id = ${projectId}
      AND t.claimed_at IS NULL
      AND c.is_terminal = FALSE
      AND EXISTS (
        SELECT 1 FROM columns c2
        WHERE c2.project_id = ${projectId}
        AND c2.position > c.position
      )
      ORDER BY t.priority ASC, t.created_at ASC
      LIMIT 1
    )
    RETURNING *
  `);

  if (rows.length === 0) return null;
  const row = rows[0];
  logger.info({ task_id: row.id, agent_id: agentId }, "task_claimed");

  return prisma.task.findUnique({ where: { id: row.id } });
}

export async function completeTask(taskId: number, result: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  const terminalCol = await prisma.column.findFirst({
    where: { project_id: task.project_id, is_terminal: true },
    orderBy: { position: "asc" },
  });
  if (!terminalCol) throw new Error("no terminal column");

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { result, column_id: terminalCol.id, version: { increment: 1 } },
  });
  logger.info({ task_id: updated.id }, "task_completed");
  return updated;
}
