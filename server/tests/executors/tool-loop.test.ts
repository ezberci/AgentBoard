import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { DeepSeekExecutor } from "../../src/executors/deepseek.js";
import { registerTool, getTool, listToolNames, buildToolMetas } from "../../src/tools/registry.js";

vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
  const tokens: string[] = [];
  for await (const token of iterable) {
    tokens.push(token);
  }
  return tokens;
}

describe("tool registry", () => {
  it("registers and retrieves a tool", () => {
    const name = `test-echo-${Date.now()}`;
    const def = {
      name,
      description: "Echoes input",
      parameters: z.object({ message: z.string() }),
      execute: (params: { message: string }) => params.message,
    };
    registerTool(def);
    const retrieved = getTool(name);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe(name);
  });

  it("lists registered tool names", () => {
    const name = `test-list-${Date.now()}`;
    registerTool({
      name,
      description: "List test",
      parameters: z.object({}),
      execute: () => "ok",
    });
    const names = listToolNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names).toContain(name);
  });

  it("buildToolMetas returns OpenAI-compatible format", () => {
    const name = `test-meta-${Date.now()}`;
    registerTool({
      name,
      description: "A test tool",
      parameters: z.object({ req: z.string(), opt: z.number().optional() }),
      execute: () => "ok",
    });

    const metas = buildToolMetas([name]);
    expect(metas).toHaveLength(1);
    expect(metas[0]).toEqual({
      type: "function",
      function: {
        name,
        description: "A test tool",
        parameters: {
          type: "object",
          properties: {
            req: { type: "string" },
            opt: { type: "number" },
          },
          required: ["req"],
        },
      },
    });
  });

  it("throws on duplicate registration", () => {
    const name = `test-dup-${Date.now()}`;
    const def = {
      name,
      description: "Dup",
      parameters: z.object({}),
      execute: () => "ok",
    };
    registerTool(def);
    expect(() => registerTool(def)).toThrow(`Tool "${name}" is already registered`);
  });
});

describe("DeepSeekExecutor with tools", () => {
  beforeEach(() => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts tools array in ExecutorContext and sends them in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "done" } }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const executor = new DeepSeekExecutor();
    await collect(
      executor.run(
        "hello",
        { apiKeyEnv: "DEEPSEEK_API_KEY", modelId: "deepseek-chat" },
        {
          tools: [
            {
              name: "test_calc",
              description: "Calculates sum",
              parameters: z.object({ a: z.number(), b: z.number() }),
              execute: () => "42",
            },
          ],
        }
      )
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toBeDefined();
    expect(body.tools).toHaveLength(1);
    expect(body.tools[0].type).toBe("function");
    expect(body.tools[0].function.name).toBe("test_calc");
    expect(body.tools[0].function.parameters.type).toBe("object");
    expect(body.stream).toBe(false);
  });
});
