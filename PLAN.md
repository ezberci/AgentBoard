# Vibe Kanban — Development Plan

## Tech Stack
- Backend: FastAPI + SQLAlchemy 2.x async + Alembic + Pydantic v2 + structlog
- DB: SQLite (local-only, async via aiosqlite)
- MCP: official Python `mcp` SDK, stdio transport
- Frontend: Vite + React 18 + TypeScript + @dnd-kit/core + @tanstack/react-query + tailwindcss
- Realtime: WebSocket (`/ws/projects/{id}` + `/ws/global`)
- Tooling: `uv`, `ruff`, `pytest`

## Data Model (Phase 1)

### Tables
```sql
projects (id PK, name, slug UNIQUE, description, created_at, updated_at)
columns (id PK, project_id FK -> projects ON DELETE CASCADE, name, position INT, is_terminal BOOL, created_at)
tasks (id PK, project_id FK -> projects ON DELETE CASCADE, column_id FK -> columns, title, description, priority INT DEFAULT 4, result TEXT, assigned_agent_id FK -> agents ON DELETE SET NULL, version INT DEFAULT 1, claimed_at, created_at, updated_at)
agents (id PK, name UNIQUE, system_prompt TEXT, color TEXT, created_at)
skills (id PK, name UNIQUE, description, instructions TEXT, allowed_tools JSON, created_at)
agent_skills (agent_id FK -> agents ON DELETE CASCADE, skill_id FK -> skills ON DELETE CASCADE, PK(agent_id, skill_id))
task_comments (id PK, task_id FK -> tasks ON DELETE CASCADE, author TEXT, body TEXT, created_at)
```

### Indexes
- `idx_tasks_project_column ON tasks(project_id, column_id, priority ASC)`
- `idx_tasks_agent_claimed ON tasks(assigned_agent_id, claimed_at)`
- `idx_task_comments_task_created ON task_comments(task_id, created_at)`

## SQLite Engine Config
- `StaticPool`, `connect_args={"timeout": 5.0}`
- PRAGMAs on connect: `busy_timeout=5000`, `foreign_keys=ON`, `synchronous=NORMAL`
- WAL set once during seed/setup, not runtime

## REST Endpoints

### Projects
- `GET /api/projects` — list all
- `POST /api/projects` — create
- `GET /api/projects/{id}` — detail
- `PATCH /api/projects/{id}` — update
- `DELETE /api/projects/{id}` — delete

### Columns
- `GET /api/projects/{id}/columns` — list by project
- `POST /api/projects/{id}/columns` — create
- `PATCH /api/columns/{id}` — update
- `DELETE /api/columns/{id}` — delete
- `POST /api/columns/{id}/reorder` — reorder

### Tasks
- `GET /api/projects/{id}/tasks` — list by project
- `POST /api/tasks` — create
- `GET /api/tasks/{id}` — detail (with comments)
- `PATCH /api/tasks/{id}` — update (409 conflict support via expected_version)
- `DELETE /api/tasks/{id}` — delete
- `POST /api/tasks/{id}/move` — move to column (409 conflict support)
- `POST /api/tasks/{id}/comments` — add comment

### Agents
- `GET /api/agents` — list
- `POST /api/agents` — create
- `GET /api/agents/{id}` — detail with skills
- `PATCH /api/agents/{id}` — update
- `DELETE /api/agents/{id}` — delete
- `POST /api/agents/{id}/skills/{skill_id}` — assign skill
- `DELETE /api/agents/{id}/skills/{skill_id}` — unassign skill

### Skills
- `GET /api/skills` — list
- `POST /api/skills` — create
- `GET /api/skills/{id}` — detail
- `PATCH /api/skills/{id}` — update
- `DELETE /api/skills/{id}` — delete

### Other
- `GET /api/health` — health check
- `WS /ws/projects/{id}` — project channel
- `WS /ws/global` — global channel

## Key Implementation Rules
1. `version` INTEGER on tasks for optimistic locking. PATCH and move check `expected_version`; mismatch → 409.
2. Always `await session.commit()` BEFORE WebSocket broadcast.
3. Atomic `claim_next_task` via single `UPDATE ... RETURNING` statement (Phase 3).
4. `derive_status(task)`: terminal column → "done", claimed_at is None → "todo", else "in_progress".
5. Agent color: slug from initials (first 2 chars), dedupe with suffix (fb → fb2 → fb3).
6. Project slug: slugify(name), dedupe with suffix.
7. `journal_mode=WAL` set in seed/setup, not runtime.
8. Tests: in-memory SQLite, `pytest-asyncio`, independent tests.

## Phase 1a Acceptance Criteria
- `curl -X POST /api/tasks` creates a task and `GET /api/tasks/{id}` returns it.
- `curl -X POST /api/projects` creates a project with auto-slug.
- `curl -X GET /api/projects/{id}/columns` returns columns.
- `curl -X GET /api/projects/{id}/tasks` returns tasks.
- Alembic migration `0001_initial.py` exists and applies cleanly.
- `uv run pytest` passes (at least model and route tests).
- `uv run ruff format && uv run ruff check` passes.
