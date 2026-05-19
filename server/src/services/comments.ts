import { prisma } from "../prisma/client.js";
import type { TaskCommentCreate } from "../schemas/taskComment.js";

export async function createComment(taskId: number, data: TaskCommentCreate) {
  return prisma.taskComment.create({
    data: { task_id: taskId, author: data.author, body: data.body },
  });
}

export async function listCommentsByTask(taskId: number) {
  return prisma.taskComment.findMany({
    where: { task_id: taskId },
    orderBy: { created_at: "asc" },
  });
}
