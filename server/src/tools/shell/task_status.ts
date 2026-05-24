import { z } from "zod";
import type { ToolDefinition } from "../types.js";
import { taskStore } from "./task.js";

export const parameters = z.object({
  taskId: z.string().describe("The ID of the background task to query"),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "task_status",
  description: "Check the status of a background task by its ID.",
  parameters,
  async execute(params, ctx) {
    const record = taskStore.get(params.taskId);

    if (!record) {
      ctx.logger.warn({ taskId: params.taskId }, "Task not found");
      return { error: `Task "${params.taskId}" not found` };
    }

    const isRunning = record.exitCode === null;

    ctx.logger.info(
      { taskId: params.taskId, running: isRunning, exitCode: record.exitCode },
      "Queried task status",
    );

    return {
      task_id: params.taskId,
      running: isRunning,
      exit_code: record.exitCode,
      stdout: record.stdout.trim(),
      stderr: record.stderr.trim(),
      description: record.description,
    };
  },
};
