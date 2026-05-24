# Agent Tools

> Architecture and usage guide for the built-in tool system.

## Overview

Agent Board gives agents access to a registry of built-in tools. Tools are:

- **Typed** — Each tool has a Zod parameter schema.
- **Discoverable** — Registered in `server/src/tools/registry.ts`.
- **DB-backed** — Metadata lives in the `tools` table so the UI can list and assign them.
- **LLM-native** — Parameter schemas are converted to OpenAI-compatible JSON Schema for function calling.

## How It Works

1. **Registration** — On startup, `server/src/tools/index.ts` imports every tool definition and calls `registerTool(def)`.
2. **Assignment** — Users assign tools to agents via the UI or `POST /api/agents/:id/tools/:toolId`.
3. **Runtime hydration** — When a task runs, `server/src/services/runs.ts` loads the agent's assigned tools from the DB, looks up their `handler_key` in the registry, and passes the live `ToolDefinition` objects to the executor.
4. **Function calling** — The executor (DeepSeek) sends the `tools` array to the LLM. If the LLM responds with `tool_calls`, arguments are validated with Zod, the tool is executed, and the result is appended to the conversation. The loop repeats until the LLM returns plain text or the max iteration limit (10) is hit.

## Adding a New Tool

Create a file in the appropriate batch directory (e.g., `server/src/tools/filesystem/my_tool.ts`):

```ts
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

export const parameters = z.object({
  input: z.string().describe("The input to process"),
});

export const definition: ToolDefinition<z.infer<typeof parameters>> = {
  name: "my_tool",
  description: "Does something useful.",
  parameters,
  async execute(params, ctx) {
    ctx.logger.info({ input: params.input }, "my_tool: running");
    return `Processed: ${params.input}`;
  },
};
```

Then import and register it in `server/src/tools/index.ts`:

```ts
import { definition as myTool } from "./filesystem/my_tool.js";
registerTool(myTool);
```

Finally, create a DB row so the UI can assign it:

```bash
curl -X POST http://localhost:8765/api/tools \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-change-me" \
  -d '{"name": "My Tool", "handler_key": "my_tool"}'
```

## Security

- **Path traversal** — Filesystem tools resolve paths relative to `ctx.workingDir` and reject results outside that directory.
- **Dangerous commands** — The `shell` tool blocks patterns like `rm -rf /`, fork bombs, and disk-wiping commands.
- **Validation** — All arguments are validated with Zod before `execute()` is called.
- **Timeouts** — Shell commands have a configurable timeout (default 60s).

## Tool Catalog

### Filesystem
- `read` — Read a file (with offset/limit) or list a directory.
- `write` — Create/overwrite a file, creating parent dirs as needed.
- `edit` — Exact string replacement with occurrence checking.
- `apply_patch` — Apply a stripped-down patch format (Add/Update/Delete File).

### Search
- `glob` — Find files matching a glob pattern (max 100).
- `grep` — Regex content search via ripgrep with fallback to pure Node.js.

### Shell
- `shell` — Execute shell commands with timeout and dangerous-pattern blocking.
- `task` — Spawn a background task and get a task ID.
- `task_status` — Query stdout/stderr/exit code of a background task.

### Web
- `webfetch` — Fetch a URL and return plain text (HTML stripped, ~50KB limit).
- `websearch` — DuckDuckGo search returning titles and URLs.
- `repo_clone` — Clone a git repository under the working directory.
- `repo_overview` — Summarize repo structure (top-level files, extensions, key configs).

### Planning
- `plan` — Store a structured plan (goal + steps) for the current task run.
- `plan_enter` / `plan_exit` — Signal planning phase boundaries.
- `question` — Surface a clarifying question to the user.
- `todo` — In-memory todo list per task run (list/add/update/delete).

### Advanced
- `skill` — Stub for invoking another skill as a tool.
- `truncate` — Smart content truncation (head/tail/middle).
- `truncation_dir` — Directory listing with max-entry truncation.
- `lsp` — Stub for LSP client bridge.
- `mcp_websearch` — Stub for MCP-compatible web search wrapper.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   UI/FE     │────▶│  /api/tools │────▶│   tools table   │
│             │     │  /api/agents│     │  (metadata)     │
└─────────────┘     └─────────────┘     └─────────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   LLM API   │◀───▶│  Executor   │◀────│  Registry lookup│
│             │     │  (DeepSeek) │     │  (handler_key)  │
└─────────────┘     └─────────────┘     └─────────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Tool code  │
                                        │ (TypeScript)│
                                        └─────────────┘
```
