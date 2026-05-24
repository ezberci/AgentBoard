# Features

> Complete catalog of Agent Board capabilities.

## 1. Project & Board Management

- **Projects** — Create, read, update, delete Kanban projects. Each project has a unique slug derived from its name.
- **Columns** — Customizable columns per project with ordered positions. Each column can be marked as `is_terminal` (e.g., "Done").
- **Column Reordering** — Drag or API-call to reorder columns within a project.

## 2. Task Management

- **Task CRUD** — Full create, read, update, delete for tasks within projects.
- **Task Move** — Move tasks between columns via drag-and-drop or API. Uses **optimistic locking** (`version` field) — concurrent edits return `409 Conflict` if `expected_version` mismatches.
- **Priority** — Tasks have a priority integer (1 = urgent, 4 = low). Default is 4.
- **Status Derivation** — No explicit `status` column. Status is derived dynamically:
  - `todo` — `claimed_at` is NULL and column is not terminal
  - `in_progress` — `claimed_at` is set and column is not terminal
  - `done` — column `is_terminal` is TRUE
- **Comments** — Add threaded comments to tasks via `POST /api/tasks/{id}/comments`.
- **Result Field** — Tasks have a dedicated `result` text field for final output (populated by executor or manually).

## 3. Agents & Skills

- **Agents** — Create agents with name, system prompt, and auto-generated color slug. Agents can be assigned to tasks.
- **Skills** — Define reusable skills with description, instructions, and allowed tools (JSON). Full CRUD with inline editing in the UI.
- **Agent-Skill Assignment** — Many-to-many relation. Assign/unassign skills to agents via API. Assigned skills are injected into the LLM context at runtime.
- **Agent Colors** — Auto-generated 2-character slug from initials (e.g., "fb" for "Frontend Builder"), with deduplication suffixes.

## 4. Agent Tools

- **Tool Registry** — Built-in tools (read, write, shell, glob, grep, webfetch, websearch, etc.) are registered in a typed TypeScript registry. Each tool has a Zod parameter schema, a description, and an execute function.
- **Tool DB Records** — Tools are also first-class DB entities (`tools` table) with `name`, `description`, `handler_key`, `json_schema`, and `is_enabled`. This lets the frontend list and manage them.
- **Agent-Tool Assignment** — Many-to-many relation via `agent_tools`. Assign any subset of tools to any agent.
- **Function Calling** — When an agent with tools runs a task, the executor sends the OpenAI-compatible `tools` array to the LLM. The LLM can call tools via structured `tool_calls`; results are fed back into the conversation automatically (up to 10 iterations).
- **20+ Tools** — Filesystem (read, write, edit, apply_patch), Search (glob, grep), Shell (shell, task, task_status), Web (webfetch, websearch, repo_clone, repo_overview), Planning (plan, todo, question), and Advanced (truncate, lsp stub, skill stub, mcp_websearch stub).

## 5. Model Registry

- **Model CRUD** — Register LLM providers (e.g., DeepSeek) with model ID, API key env var name, and optional base URL.
- **Health Check** — `GET /api/models/health` returns whether each model's env var is present in `process.env`.
- **Dynamic Executor Lookup** — Executors read provider name from the `models` table at runtime.

## 6. LLM Executor System

- **Task Runs** — Start an LLM execution on any task via `POST /api/tasks/{id}/run`. If the task has an assigned agent, its `system_prompt` and assigned skills' `instructions` are injected as `system` messages.
- **Streaming Output** — Token-by-token SSE streaming from LLM APIs (DeepSeek, OpenAI-compatible).
- **Live WebSocket Broadcast** — Each token is broadcast as a `run.token` event to the project WebSocket channel.
- **Run History** — All runs persisted in `task_runs` table with status (`running`, `completed`, `failed`), output, usage metadata, and error message.
- **Concurrency Limit** — Max 5 concurrent runs. Additional requests receive `503 Service Unavailable`.
- **Failure Isolation** — Executor failures update the run record and broadcast `run.finished` with error, but do NOT move the task column.

## 7. MCP Integration (Claude Code)

- **MCP Server** — Stdio-based MCP server exposing 16 tools for Claude Code.
- **Atomic Claim** — `claim_next_task` uses a single `UPDATE ... RETURNING` SQL statement to prevent race conditions when multiple agents claim simultaneously.
- **Context Awareness** — `get_context` returns current project, columns, and recent tasks.
- **Full CRUD via Tools** — list/get/create/update/delete for projects, tasks, agents, and skills.
- **Task Completion** — `complete_task` writes result and automatically moves task to the terminal column.
- **Status Filtering** — `list_tasks` accepts `status` filter (`todo`, `in_progress`, `done`) derived from columns.

## 8. Real-time Features

- **WebSocket Channels** — Two channels:
  - `/ws/projects/{id}` — project-scoped events (tasks, columns, runs, comments)
  - `/ws/global` — global events (agents, skills, models)
- **WebSocket Reconcile** — Frontend updates React Query cache directly on WS events instead of full refetch.
- **Optimistic UI** — Task drag-and-drop updates local state immediately, rolling back on API failure.

## 9. Frontend

- **Three Board Views** — `classic` (Kanban columns), `dense` (compact list), `swimlanes` (agent rows × columns).
- **Drag & Drop** — `@dnd-kit/core` for moving tasks between columns.
- **Filters** — Client-side filtering by search text, priority, status, and assigned agent.
- **Keyboard Navigation** — Arrow keys navigate between tasks/columns, Enter opens detail, Escape closes, Delete removes (with confirmation).
- **Task Detail Drawer** — Slide-out panel showing task info, comments, run history, and live streaming output.
- **Inline CRUD** — Create tasks and columns, rename columns inline without leaving the board.
- **Markdown Rendering** — Task descriptions, results, and live output rendered with `react-markdown` + Tailwind typography.
- **Settings Page** — Backend health, model env checks, and one-click MCP config copy.

## 10. Authentication

- **API Key** — All endpoints (except `/api/health`) require `x-api-key` header. Key is set via `API_KEY` env var.
- **CORS** — Configured for `localhost:5173` (frontend dev server).
