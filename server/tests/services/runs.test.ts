import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../src/prisma/client.js";
import { executeTaskRun } from "../../src/services/runs.js";

vi.mock("../../src/executors/registry.js", () => ({
  getExecutor: vi.fn(),
}));

vi.mock("../../src/ws/manager.js", () => ({
  broadcastProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getExecutor } from "../../src/executors/registry.js";

const mockedGetExecutor = vi.mocked(getExecutor);

describe("executeTaskRun", () => {
  let counter = 0;

  beforeEach(() => {
    vi.resetAllMocks();
    counter += 1;
  });

  async function createModel(data?: { name?: string; provider?: string; model_id?: string; api_key_env?: string; base_url?: string }) {
    return prisma.model.create({
      data: {
        name: data?.name ?? `Test Model ${counter}`,
        provider: data?.provider ?? "deepseek",
        model_id: data?.model_id ?? "deepseek-chat",
        api_key_env: data?.api_key_env ?? "DEEPSEEK_API_KEY",
        base_url: data?.base_url ?? null,
      },
    });
  }

  async function createProject() {
    return prisma.project.create({
      data: { name: `Test Project ${counter}`, slug: `test-project-${counter}` },
    });
  }

  async function createTask(projectId: number, assignedAgentId?: number) {
    return prisma.task.create({
      data: {
        project_id: projectId,
        title: "Test Task",
        assigned_agent_id: assignedAgentId,
      },
    });
  }

  async function createAgent(systemPrompt?: string) {
    return prisma.agent.create({
      data: {
        name: `Test Agent ${counter}`,
        system_prompt: systemPrompt,
      },
    });
  }

  async function createSkill(name: string, instructions?: string, allowedTools?: string) {
    return prisma.skill.create({
      data: { name, instructions, allowed_tools: allowedTools },
    });
  }

  it("passes undefined context when task has no assigned agent", async () => {
    const mockRun = vi.fn().mockImplementation(async function* () {
      yield "done";
    });
    mockedGetExecutor.mockReturnValue({ run: mockRun } as unknown as ReturnType<typeof getExecutor>);

    const model = await createModel();
    const project = await createProject();
    const task = await createTask(project.id);

    await executeTaskRun(task.id, model.id, "prompt text");

    expect(mockedGetExecutor).toHaveBeenCalledWith("deepseek");
    expect(mockRun).toHaveBeenCalledWith(
      "prompt text",
      expect.objectContaining({
        model_id: "deepseek-chat",
        api_key_env: "DEEPSEEK_API_KEY",
      }),
      undefined
    );
  });

  it("passes context with only systemPrompt when assigned agent has no skills", async () => {
    const mockRun = vi.fn().mockImplementation(async function* () {
      yield "done";
    });
    mockedGetExecutor.mockReturnValue({ run: mockRun } as unknown as ReturnType<typeof getExecutor>);

    const model = await createModel();
    const project = await createProject();
    const agent = await createAgent("You are a coder");
    const task = await createTask(project.id, agent.id);

    await executeTaskRun(task.id, model.id, "prompt text");

    expect(mockRun).toHaveBeenCalledWith(
      "prompt text",
      expect.any(Object),
      expect.objectContaining({
        systemPrompt: "You are a coder",
      })
    );
    expect(mockRun.mock.calls[0][2].skills).toEqual([]);
  });

  it("passes context with systemPrompt and skills when assigned agent has skills", async () => {
    const mockRun = vi.fn().mockImplementation(async function* () {
      yield "done";
    });
    mockedGetExecutor.mockReturnValue({ run: mockRun } as unknown as ReturnType<typeof getExecutor>);

    const model = await createModel();
    const project = await createProject();
    const agent = await createAgent("You are a coder");
    const skill = await createSkill(`Search ${counter}`, "Search the web", '["google"]');
    await prisma.agentSkill.create({
      data: { agent_id: agent.id, skill_id: skill.id },
    });
    const task = await createTask(project.id, agent.id);

    await executeTaskRun(task.id, model.id, "prompt text");

    const context = mockRun.mock.calls[0][2];
    expect(context).toMatchObject({
      systemPrompt: "You are a coder",
      skills: [
        expect.objectContaining({
          name: `Search ${counter}`,
          instructions: "Search the web",
          allowed_tools: '["google"]',
        }),
      ],
    });
  });

  it("creates a run record in DB and updates it to completed", async () => {
    const mockRun = vi.fn().mockImplementation(async function* () {
      yield "token1";
      yield "token2";
    });
    mockedGetExecutor.mockReturnValue({ run: mockRun } as unknown as ReturnType<typeof getExecutor>);

    const model = await createModel();
    const project = await createProject();
    const task = await createTask(project.id);

    const run = await executeTaskRun(task.id, model.id, "prompt text");

    expect(run.task_id).toBe(task.id);
    expect(run.model_id).toBe(model.id);
    expect(run.prompt).toBe("prompt text");

    const dbRun = await prisma.taskRun.findUnique({ where: { id: run.id } });
    expect(dbRun).not.toBeNull();
    expect(dbRun!.status).toBe("completed");
    expect(dbRun!.output).toBe("token1token2");
    expect(dbRun!.finished_at).not.toBeNull();
  });

  it("passes correct modelConfig to the executor", async () => {
    const mockRun = vi.fn().mockImplementation(async function* () {
      yield "done";
    });
    mockedGetExecutor.mockReturnValue({ run: mockRun } as unknown as ReturnType<typeof getExecutor>);

    const model = await createModel({
      name: `Custom Model ${counter}`,
      model_id: "custom-model",
      api_key_env: "CUSTOM_KEY",
      base_url: "https://custom.example.com",
    });
    const project = await createProject();
    const task = await createTask(project.id);

    await executeTaskRun(task.id, model.id, "prompt text");

    expect(mockRun).toHaveBeenCalledWith(
      "prompt text",
      expect.objectContaining({
        model_id: "custom-model",
        api_key_env: "CUSTOM_KEY",
        base_url: "https://custom.example.com",
      }),
      undefined
    );
  });
});
