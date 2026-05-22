import { logger } from "../lib/logger.js";
import type { BaseExecutor, ExecutorContext } from "./base.js";

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    const messages: Array<{ role: string; content: string }> = [];

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
}
