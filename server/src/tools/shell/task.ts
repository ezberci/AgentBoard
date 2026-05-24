import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  command: z.string().min(1).describe("The shell command to run in the background"),
  description: z
    .string()
    .optional()
    .describe("Human-readable description of the task"),
});

export interface TaskRecord {
  process: ReturnType<typeof spawn>;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  description: string | undefined;
}

export const taskStore = new Map<string, TaskRecord>();

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "task",
  description:
    "Spawn a shell command as a background task and return a task ID that can be used to query its status later.",
  parameters,
  async execute(params, ctx) {
    const taskId = randomUUID();

    const child = spawn(params.command, {
      shell: true,
      cwd: ctx.workingDir,
    });

    const record: TaskRecord = {
      process: child,
      stdout: "",
      stderr: "",
      exitCode: null,
      description: params.description,
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (data: string) => {
      record.stdout += data;
    });

    child.stderr.on("data", (data: string) => {
      record.stderr += data;
    });

    child.on("exit", (code) => {
      record.exitCode = code ?? -1;
    });

    child.on("error", (err) => {
      record.stderr += `\n[spawn error: ${err.message}]`;
      record.exitCode = -1;
    });

    taskStore.set(taskId, record);

    ctx.logger.info({ taskId, command: params.command }, "Background task spawned");

    return {
      task_id: taskId,
      command: params.command,
    };
  },
};
