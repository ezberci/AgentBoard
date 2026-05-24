import { logger } from "../lib/logger.js";
import type {
  BaseExecutor,
  ExecutorContext,
  ToolCallRequest,
  ToolCallResult,
} from "./base.js";
import { getTool, buildToolMetasFromDefs } from "../tools/registry.js";
import type { ToolContext } from "../tools/context.js";

type Message =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: string | null; tool_calls: ToolCallRequest[] }
  | { role: "tool"; tool_call_id: string; content: string };

export class DeepSeekExecutor implements BaseExecutor {
  async *run(
    prompt: string,
    modelConfig: Record<string, unknown>,
    context?: ExecutorContext
  ): AsyncIterable<string> {
    const apiKeyEnv = modelConfig.apiKeyEnv as string;
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing env var: ${apiKeyEnv}`);
    }

    const baseUrl = (modelConfig.baseUrl as string) || "https://api.deepseek.com";
    const modelId = modelConfig.modelId as string;
    const timeout = (modelConfig.timeout as number) || 120;

    const messages: Message[] = [];

    if (context?.systemPrompt) {
      messages.push({ role: "system", content: context.systemPrompt });
    }

    if (context?.skills && context.skills.length > 0) {
      const skillParts: string[] = [];
      for (const skill of context.skills) {
        let part = `## ${skill.name}`;
        if (skill.instructions) {
          part += `\n${skill.instructions}`;
        }
        if (skill.allowed_tools) {
          try {
            const tools = JSON.parse(skill.allowed_tools) as unknown[];
            if (Array.isArray(tools) && tools.length > 0) {
              part += `\nAllowed tools: ${tools.map(String).join(", ")}`;
            }
          } catch {
            part += `\nAllowed tools: ${skill.allowed_tools}`;
          }
        }
        skillParts.push(part);
      }
      messages.push({
        role: "system",
        content: `You have the following skills:\n\n${skillParts.join("\n\n")}`,
      });
    }

    messages.push({ role: "user", content: prompt });

    const hasTools = context?.tools && context.tools.length > 0;

    if (hasTools) {
      yield* this._runWithToolLoop(messages, baseUrl, modelId, apiKey, timeout, context!);
      return;
    }

    yield* this._runStream(messages, baseUrl, modelId, apiKey, timeout);
  }

  private async *_runStream(
    messages: Message[],
    baseUrl: string,
    modelId: string,
    apiKey: string,
    timeout: number
  ): AsyncGenerator<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const body = response.body;
      if (!body) {
        throw new Error("No response body");
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let yielded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const chunk = JSON.parse(data);
            const content = chunk.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              yielded = true;
              yield content;
            }
          } catch (e) {
            logger.warn({ error: String(e), data }, "deepseek_chunk_parse_error");
          }
        }
      }

      if (!yielded) {
        throw new Error("No tokens yielded from DeepSeek stream");
      }
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  private async *_runWithToolLoop(
    messages: Message[],
    baseUrl: string,
    modelId: string,
    apiKey: string,
    timeout: number,
    context: ExecutorContext
  ): AsyncGenerator<string> {
    const maxIterations = 10;
    const toolMetas = buildToolMetasFromDefs(context.tools!);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      let responseBody: unknown;
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelId,
            messages,
            tools: toolMetas,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        }

        responseBody = await response.json();
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }

      const choices = (responseBody as Record<string, unknown>)?.choices as
        | Array<Record<string, unknown>>
        | undefined;
      const choice = choices?.[0];
      const message = choice?.message as Record<string, unknown> | undefined;

      if (!message) {
        throw new Error("No message in DeepSeek response");
      }

      const content = message.content as string | null | undefined;
      const rawToolCalls = message.tool_calls as Array<Record<string, unknown>> | undefined;

      if (!rawToolCalls || rawToolCalls.length === 0) {
        if (content) {
          yield content;
        }
        return;
      }

      // Assistant message with tool_calls
      const toolCalls: ToolCallRequest[] = rawToolCalls.map((tc) => ({
        id: tc.id as string,
        name: (tc.function as Record<string, unknown>)?.name as string,
        arguments: (tc.function as Record<string, unknown>)?.arguments as string,
      }));

      messages.push({
        role: "assistant",
        content: content ?? null,
        tool_calls: toolCalls,
      });

      // Execute tools
      const results: ToolCallResult[] = [];
      for (const tc of toolCalls) {
        const result = await this._executeToolCall(tc, context);
        results.push(result);
      }

      // Append tool results
      for (const res of results) {
        messages.push({
          role: "tool",
          tool_call_id: res.id,
          content: res.output,
        });
      }
    }

    throw new Error("Tool call loop exceeded maximum iterations");
  }

  private async _executeToolCall(
    tc: ToolCallRequest,
    _ctx: ExecutorContext
  ): Promise<ToolCallResult> {
    const def = getTool(tc.name);
    if (!def) {
      return { id: tc.id, name: tc.name, output: `Error: Tool "${tc.name}" not found` };
    }

    let args: unknown;
    try {
      args = JSON.parse(tc.arguments);
    } catch {
      return { id: tc.id, name: tc.name, output: `Error: Invalid JSON arguments for tool "${tc.name}"` };
    }

    const parseResult = def.parameters.safeParse(args);
    if (!parseResult.success) {
      return {
        id: tc.id,
        name: tc.name,
        output: `Error: Invalid arguments for tool "${tc.name}": ${parseResult.error.message}`,
      };
    }

    const toolCtx: ToolContext = {
      taskRunId: 0,
      agentId: 0,
      workingDir: process.cwd(),
      abortSignal: new AbortController().signal,
      logger,
    };

    try {
      const output = await def.execute(parseResult.data, toolCtx);
      return {
        id: tc.id,
        name: tc.name,
        output: typeof output === "string" ? output : JSON.stringify(output, null, 2),
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return { id: tc.id, name: tc.name, output: `Error executing tool "${tc.name}": ${err}` };
    }
  }
}
