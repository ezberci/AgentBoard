# Executor System

> Internal LLM execution for tasks.

## 1. Overview

The executor system runs tasks against LLM APIs (currently DeepSeek) with:
- Streaming output (token-by-token)
- WebSocket broadcast to frontend
- Run history persistence
- Failure isolation and rollback

## 2. Architecture

```
[User clicks Run] → POST /api/tasks/{id}/run
         ↓
[Hono] → Promise background (executeTaskRun(...))
         ↓
[Background] → Executor.run(prompt, modelConfig)
         ↓
[DeepSeek API] → SSE streaming
         ↓
[Per-token] → WS broadcast run.token
         ↓
[Done] → DB update + WS broadcast run.finished
```

## 3. Components

### 3.1 Base Interface

```ts
// server/src/executors/base.ts
export interface BaseExecutor {
  run(prompt: string, modelConfig: Record<string, unknown>): AsyncIterable<string>;
}
```

### 3.2 Registry

```ts
// server/src/executors/registry.ts
const executors: Record<string, () => BaseExecutor> = {
  deepseek: () => new DeepSeekExecutor(),
};

export function getExecutor(provider: string): BaseExecutor {
  const factory = executors[provider];
  if (!factory) throw new Error(`Unknown executor provider: ${provider}`);
  return factory();
}
```

Register custom executor:
```ts
import { registerExecutor } from "../executors/registry.js";
registerExecutor("openai", () => new OpenAIExecutor());
```

### 3.3 DeepSeek Executor

OpenAI-compatible streaming using native `fetch` + `ReadableStream`:

```ts
const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  }),
  timeout,
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

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
    const chunk = JSON.parse(data);
    const content = chunk.choices?.[0]?.delta?.content as string | undefined;
    if (content) yield content;
  }
}
```

## 4. Execution Service

`services/runs.ts` handles the full lifecycle:

1. **Create run record** (`status=running`)
2. **Broadcast `run.started`**
3. **Stream tokens** → broadcast `run.token` per chunk
4. **On success**: update run (`status=completed`, `output=full_text`)
5. **On failure**: update run (`status=failed`, `error=message`)
6. **Broadcast `run.finished`**

### Failure Path

```ts
try {
  for await (const token of executor.run(...)) {
    ...
  }
} catch (e) {
  await prisma.taskRun.update({
    where: { id: run.id },
    data: {
      status: "failed",
      error: `${e.constructor.name}: ${e.message}`.slice(0, 500),
      finished_at: new Date(),
    },
  });
  await broadcastProject(project_id, "run.finished", { ... });
}
```

**Rules:**
- Task column does NOT change on failure — user moves manually
- Error stored in `task_runs.error` (max 500 chars)
- Full traceback NOT broadcast — only short error message
- Re-run requires user to click Run again

## 5. Model Registry

Executors read model config from the `models` table:

| Field | Example | Usage |
|---|---|---|
| `provider` | `deepseek` | Registry lookup |
| `model_id` | `deepseek-chat` | API request body |
| `api_key_env` | `DEEPSEEK_API_KEY` | `process.env[...]` |
| `base_url` | `https://api.deepseek.com` | Optional override |

## 6. Adding a New Provider

1. Create `executors/<provider>.ts` implementing `BaseExecutor`
2. Register in `executors/registry.ts`
3. Add model row via `/api/models` or DB seed

No backend code changes required beyond the executor class itself.
