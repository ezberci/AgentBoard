import { prisma } from "../prisma/client.js";
import { logger } from "../lib/logger.js";
import { getExecutor } from "../executors/registry.js";
import { getModel } from "./models.js";
import { broadcastProject } from "../ws/manager.js";
import type { ExecutorContext } from "../executors/base.js";

const RUN_TIMEOUT_MS = 300_000;

export async function listTaskRuns(taskId: number, limit = 50, offset = 0) {
  return prisma.taskRun.findMany({
    where: { task_id: taskId },
    orderBy: { started_at: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function executeTaskRun(
  taskId: number,
  modelId: number,
  prompt: string
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  const run = await prisma.taskRun.create({
    data: {
      task_id: taskId,
      model_id: modelId,
      agent_id: task.assigned_agent_id,
      status: "running",
      prompt,
      started_at: new Date(),
    },
  });

  await broadcastProject(task.project_id, "run.started", {
    run_id: run.id,
    task_id: task.id,
  });

  const model = await getModel(modelId);
  if (!model) throw new Error("Model not found");

  const executor = getExecutor(model.provider);

  let context: ExecutorContext | undefined;
  if (task.assigned_agent_id) {
    const agent = await prisma.agent.findUnique({
      where: { id: task.assigned_agent_id },
      include: { agentSkills: { include: { skill: true } } },
    });
    if (agent) {
      context = {
        systemPrompt: agent.system_prompt ?? undefined,
        skills: agent.agentSkills.map((as) => as.skill),
      };
    }
  }

  let output = "";
  try {
    const iterable = executor.run(prompt, {
      model_id: model.model_id,
      api_key_env: model.api_key_env,
      base_url: model.base_url,
    }, context);

    const iterator = iterable[Symbol.asyncIterator]();
    const startTime = Date.now();

    while (true) {
      const remaining = RUN_TIMEOUT_MS - (Date.now() - startTime);
      if (remaining <= 0) throw new Error("Task run timed out");

      const { value, done } = await Promise.race([
        iterator.next(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Task run timed out")), remaining)
        ),
      ]);

      if (done) break;
      output += value;
      await broadcastProject(task.project_id, "run.token", {
        run_id: run.id,
        token: value,
      });
    }

    await prisma.taskRun.update({
      where: { id: run.id },
      data: { status: "completed", output, finished_at: new Date() },
    });

    await broadcastProject(task.project_id, "run.finished", {
      run_id: run.id,
      status: "completed",
    });

    return run;
  } catch (e) {
    const error = `${e instanceof Error ? e.constructor.name : "Error"}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500);

    await prisma.taskRun.update({
      where: { id: run.id },
      data: { status: "failed", error, finished_at: new Date() },
    });

    await broadcastProject(task.project_id, "run.finished", {
      run_id: run.id,
      status: "failed",
      error,
    });

    logger.error({ run_id: run.id, error }, "task_run_failed");
    return run;
  }
}
