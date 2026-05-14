# Architecture

> High-level system design for Vibe Kanban Clone.

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy 2.x async, Alembic, Pydantic v2, structlog |
| Database | SQLite (local-only, `127.0.0.1`, no auth) |
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS |
| Realtime | WebSocket (`/ws/projects/{id}` + `/ws/global`) |
| DnD | `@dnd-kit/core` |
| State | React Query (TanStack) + WebSocket reconcile |
| MCP | Official Python `mcp` SDK, stdio transport |
| Executor | DeepSeek API (OpenAI-compatible streaming) |

## 2. Directory Layout

```
AgentBoard/
├── src/vibe_kanban_clone/      # Python backend
│   ├── api/
│   │   ├── app.py              # FastAPI factory + CORS
│   │   ├── deps.py             # DB session dependency
│   │   └── routes/
│   │       ├── projects.py
│   │       ├── columns.py
│   │       ├── tasks.py        # + run endpoint
│   │       ├── agents.py
│   │       ├── skills.py
│   │       ├── models.py       # Model registry CRUD
│   │       ├── mcp_info.py
│   │       └── ws.py           # WebSocket manager
│   ├── db/
│   │   ├── engine.py           # SQLite engine + session factory
│   │   ├── base.py             # SQLAlchemy DeclarativeBase
│   │   └── migrations/
│   ├── models/                 # ORM entities
│   ├── schemas/                # Pydantic v2 schemas
│   ├── services/               # Business logic
│   ├── executors/              # LLM executor implementations
│   └── mcp/                    # MCP server (stdio)
├── web/src/                    # React frontend
│   ├── api/client.ts           # Typed REST client
│   ├── hooks/                  # React Query hooks
│   ├── pages/                  # Top-level pages
│   ├── components/             # Reusable UI components
│   └── lib/                    # Utilities (agentColors, phase)
├── tests/                      # pytest suite
└── docs/                       # This directory
```

## 3. Data Flow

### 3.1 Task Lifecycle

```
[User] → REST POST /api/tasks → [FastAPI] → [Service] → [SQLite]
                     ↓
              [WS broadcast: task.created]
                     ↓
              [React Query invalidate]
                     ↓
              [Board re-renders]
```

### 3.2 Task Move (Optimistic Update)

```
[User drags card] → React Query setQueryData (optimistic)
         ↓
[REST POST /api/tasks/{id}/move] → FastAPI → Service → SQLite
         ↓
[Success] → WS broadcast task.moved → Frontend reconciles
[Failure] → Rollback setQueryData to previous state
```

### 3.3 Task Run (Executor)

```
[User clicks Run] → POST /api/tasks/{id}/run → FastAPI
         ↓
[Asyncio background task] → Executor.run() → DeepSeek API
         ↓
[Streaming tokens] → WS run.token events → Frontend live output
         ↓
[Completed / Failed] → WS run.finished + DB update
```

### 3.4 MCP Claim

```
[Claude Code] → MCP claim_next_task(tool) → FastAPI Service
         ↓
[Atomic UPDATE ... RETURNING] → SQLite
         ↓
[WS broadcast: task.claimed] → Board updates live
```

## 4. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite + StaticPool | Single-user local app; simplicity over scale |
| `version` INTEGER on tasks | Optimistic locking; 409 Conflict on mismatch |
| WS reconcile via `setQueryData` | Fast UI updates; `invalidateQueries` fallback on error |
| `UPDATE...RETURNING` for claim | Atomic claim prevents race conditions |
| Separate `task_runs` table | Keeps execution history; task result is user-managed |
| Executor rollback + cleanup session | SQLAlchemy session invalidation after exception |

## 5. CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 6. Environment

Required env vars for executors (examples):

```bash
DEEPSEEK_API_KEY=sk-...
```

Model registry stores the env var name, not the key itself.
