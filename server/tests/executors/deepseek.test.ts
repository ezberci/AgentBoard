import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepSeekExecutor } from "../../src/executors/deepseek.js";

vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

function createStreamResponse(lines: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + "\n"));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
  const tokens: string[] = [];
  for await (const token of iterable) {
    tokens.push(token);
  }
  return tokens;
}

describe("DeepSeekExecutor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws when API key env var is missing", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const executor = new DeepSeekExecutor();
    const iterable = executor.run("hello", {
      apiKeyEnv: "DEEPSEEK_API_KEY",
      modelId: "deepseek-chat",
    });
    await expect(collect(iterable)).rejects.toThrow("Missing env var: DEEPSEEK_API_KEY");
  });

  it("sends only user message when no context is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        "data: [DONE]",
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const executor = new DeepSeekExecutor();
    await collect(executor.run("hello", { apiKeyEnv: "DEEPSEEK_API_KEY", modelId: "deepseek-chat" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("adds system message before user message when systemPrompt is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        "data: [DONE]",
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const executor = new DeepSeekExecutor();
    await collect(
      executor.run("hello", { apiKeyEnv: "DEEPSEEK_API_KEY", modelId: "deepseek-chat" }, { systemPrompt: "Be helpful" })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: "system", content: "Be helpful" },
      { role: "user", content: "hello" },
    ]);
  });

  it("adds skills system message when skills are provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        "data: [DONE]",
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const executor = new DeepSeekExecutor();
    await collect(
      executor.run(
        "hello",
        { apiKeyEnv: "DEEPSEEK_API_KEY", modelId: "deepseek-chat" },
        {
          skills: [
            { name: "Search", instructions: "Search the web", allowed_tools: '["google"]' },
            { name: "Calc", allowed_tools: '["calculator"]' },
          ],
        }
      )
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("Search");
    expect(body.messages[0].content).toContain("Search the web");
    expect(body.messages[0].content).toContain("Allowed tools: google");
    expect(body.messages[0].content).toContain("Calc");
    expect(body.messages[0].content).toContain("Allowed tools: calculator");
    expect(body.messages[1]).toEqual({ role: "user", content: "hello" });
  });

  it("adds system prompt first, then skills, then user when both are provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        "data: [DONE]",
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const executor = new DeepSeekExecutor();
    await collect(
      executor.run(
        "hello",
        { apiKeyEnv: "DEEPSEEK_API_KEY", modelId: "deepseek-chat" },
        {
          systemPrompt: "Be helpful",
          skills: [{ name: "Search", instructions: "Search the web" }],
        }
      )
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(3);
    expect(body.messages[0]).toEqual({ role: "system", content: "Be helpful" });
    expect(body.messages[1].role).toBe("system");
    expect(body.messages[1].content).toContain("Search");
    expect(body.messages[2]).toEqual({ role: "user", content: "hello" });
  });

  it("yields tokens from streaming response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        "data: [DONE]",
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const executor = new DeepSeekExecutor();
    const tokens = await collect(executor.run("hi", { apiKeyEnv: "DEEPSEEK_API_KEY", modelId: "deepseek-chat" }));

    expect(tokens).toEqual(["Hello", " world"]);
  });

  it("throws when API returns non-OK status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 500, statusText: "Internal Server Error" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const executor = new DeepSeekExecutor();
    const iterable = executor.run("hi", { apiKeyEnv: "DEEPSEEK_API_KEY", modelId: "deepseek-chat" });
    await expect(collect(iterable)).rejects.toThrow("DeepSeek API error: 500 Internal Server Error");
  });
});
