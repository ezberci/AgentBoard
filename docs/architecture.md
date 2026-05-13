# Vibe Kanban — Architecture

## Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI + SQLAlchemy 2.x (async) + Alembic + Pydantic v2 + structlog |
| Database | SQLite (local-only, async via `aiosqlite`) |
| Realtime | WebSocket (`/ws/projects/{id}` + `/ws/global`) |
| MCP | Official Python `mcp` SDK, stdio transport |
| Frontend | Vite + React 18 + TypeScript + `@dnd-kit/core` + `@tanstack/react-query` + Tailwind CSS |
| Tooling | `uv`, `ruff`, `pytest` |

## Data Model

### Tables

- `projects` — Kanban boards (id, name, slug, description, timestamps)
- `columns` — Board columns (id, project_id FK, name, position, is_terminal, created_at)
- `tasks` — Cards (id, project_id FK, column_id FK, title, description, priority, result, assigned_agent_id FK, version, claimed_at, timestamps)
- `agents` — AI agents (id, name UNIQUE, system_prompt, color, created_at)
- `skills` — Reusable capabilities (id, name UNIQUE, description, instructions, allowed_tools JSON, created_at)
- `agent_skills` — Many-to-many join (agent_id, skill_id)
- `task_comments` — Threaded comments (id, task_id FK, author, body, created_at)

### Key Design Rules

1. **Optimistic locking** — `tasks.version` is checked on PATCH and move; mismatch returns HTTP 409.
2. **Agent color deduplication** — Derived from name initials (first 2 chars), suffixed if taken (`fb` → `fb2` → `fb3`).
3. **Atomic claim** — `claim_next_task` uses a single `UPDATE ... RETURNING` statement to avoid race conditions.
4. **Broadcast order** — `await session.commit()` is always executed **before** WebSocket broadcast.
5. **Task status derivation** — `terminal column` → "done", `claimed_at is None` → "todo", else "in_progress".

## API Overview

All REST endpoints are prefixed with `/api`.

| Domain | Endpoints |
|--------|-----------|
| Projects | `GET /projects`, `POST /projects`, `GET /projects/{id}`, `PATCH /projects/{id}`, `DELETE /projects/{id}` |
| Columns | `GET /projects/{id}/columns`, `POST /projects/{id}/columns`, `PATCH /columns/{id}`, `DELETE /columns/{id}`, `POST /columns/{id}/reorder` |
| Tasks | `GET /projects/{id}/tasks`, `POST /tasks`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`, `POST /tasks/{id}/move`, `POST /tasks/{id}/comments` |
| Agents | `GET /agents`, `POST /agents`, `GET /agents/{id}`, `PATCH /agents/{id}`, `DELETE /agents/{id}`, `POST /agents/{id}/skills/{skill_id}`, `DELETE /agents/{id}/skills/{skill_id}` |
| Skills | `GET /skills`, `POST /skills`, `GET /skills/{id}`, `PATCH /skills/{id}`, `DELETE /skills/{id}` |
| Health | `GET /health` |

## WebSocket Events

Connections are managed in-memory by `ConnectionManager`.

### Channels

- `/ws/projects/{project_id}` — Project-scoped events (task/column/comment changes)
- `/ws/global` — Global events (project create/update/delete, agent/skill changes)

### Event Types

| Channel | Event | Payload |
|---------|-------|---------|
| Project | `task.created` | Task JSON |
| Project | `task.updated` | Task JSON |
| Project | `task.moved` | Task JSON |
| Project | `task.deleted` | `{task_id}` |
| Project | `task.claimed` | Task JSON |
| Project | `task.completed` | Task JSON |
| Project | `column.created` | Column JSON |
| Project | `column.updated` | Column JSON |
| Project | `column.deleted` | `{column_id}` |
| Project | `column.reordered` | `{columns: [...]}` |
| Project | `comment.created` | Comment JSON |
| Global | `project.created` | Project JSON |
| Global | `project.updated` | Project JSON |
| Global | `project.deleted` | `{project_id}` |

## MCP Tools

The MCP server (`vibe_kanban_clone.mcp.server`) exposes the following tools for agent integration:

| Tool | Purpose |
|------|---------|
| `get_context` | Current project, columns, and recent tasks |
| `list_projects` | All projects |
| `get_project` | Project detail by ID |
| `list_tasks` | Tasks with optional filters (status, agent_id, priority_gte) |
| `get_task` | Task detail with comments |
| `create_task` | Create a new task (auto-assigns first column) |
| `update_task` | Update description, result, or priority |
| `delete_task` | Remove a task |
| `list_agents` | All agents |
| `get_agent` | Agent detail with skills |
| `list_skills` | All skills |
| `get_skill` | Skill detail |
| `assign_agent_to_task` | Link an agent to a task |
| `unassign_agent` | Remove agent assignment |
| `claim_next_task` | Atomically claim the next unclaimed task |
| `complete_task` | Write result and move to terminal column |
| `add_task_comment` | Append a comment to a task |

## Project Layout

```
project-root/
├── src/vibe_kanban_clone/   # Backend application
│   ├── api/                 # FastAPI app, routes, deps
│   ├── db/                  # SQLAlchemy base, engine, Alembic migrations
│   ├── executors/           # Agent executor implementations
│   ├── mcp/                 # MCP server and tools
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response models
│   └── services/            # Business logic layer
├── tests/                   # pytest suite
├── web/                     # Vite + React frontend
└── docs/                    # Architecture, API, MCP docs
```
