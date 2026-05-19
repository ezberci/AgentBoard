# Architecture

> High-level system design for Agent Board.

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Hono, Prisma, Zod, Pino |
| Database | SQLite (local-only, `127.0.0.1`, no auth) |
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS |
| Realtime | WebSocket (`ws` library, `/ws/projects/{id}` + `/ws/global`) |
| DnD | `@dnd-kit/core` |
| State | React Query (TanStack) + WebSocket reconcile |
| MCP | `@modelcontextprotocol/sdk`, stdio transport |
| Executor | DeepSeek API (OpenAI-compatible streaming) |

## 2. Directory Layout

```
AgentBoard/
├── server/                     # TypeScript backend
│   ├── src/
│   │   ├── index.ts            # Hono app + WS upgrade
│   │   ├── prisma/
│   │   │   └── schema.prisma   # DB schema
│   │   ├── routes/
│   │   │   ├── projects.ts
│   │   │   ├── columns.ts
│   │   │   ├── tasks.ts        # + /run + /comments
│   │   │   ├── agents.ts
│   │   │   ├── skills.ts
│   │   │   ├── models.ts
│   │   │   └── mcpInfo.ts
│   │   ├── services/
│   │   │   └── (same 7 service files)
│   │   ├── middleware/
│   │   │   └── auth.ts         # x-api-key check
│   │   ├── ws/
│   │   │   └── manager.ts      # in-memory connection manager
│   │   ├── executors/
│   │   │   ├── base.ts
│   │   │   ├── deepseek.ts
│   │   │   └── registry.ts
│   │   ├── mcp/
│   │   │   ├── server.ts
│   │   │   └── tools.ts        # 18 tools
│   │   └── lib/
│   │       └── logger.ts       # pino
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── web/src/                    # React frontend
│   ├── api/client.ts           # Typed REST client
│   ├── hooks/                  # React Query hooks
│   ├── pages/                  # Top-level pages
│   ├── components/             # Reusable UI components
│   └── lib/                    # Utilities (agentColors, phase)
└── docs/                       # This directory
```

## 3. Data Flow

### 3.1 Task Lifecycle

```
[User] → REST POST /api/tasks → [Hono] → [Service] → [SQLite]
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
[REST POST /api/tasks/{id}/move] → Hono → Service → SQLite
         ↓
[Success] → WS broadcast task.moved → Frontend reconciles
[Failure] → Rollback setQueryData to previous state
```

### 3.3 Task Run (Executor)

```
[User clicks Run] → POST /api/tasks/{id}/run → Hono
         ↓
[Background Promise] → Executor.run() → DeepSeek API
         ↓
[Streaming tokens] → WS run.token events → Frontend live output
         ↓
[Completed / Failed] → WS run.finished + DB update
```

### 3.4 MCP Claim

```
[Claude Code] → MCP claim_next_task(tool) → Hono Service
         ↓
[Atomic UPDATE ... RETURNING] → SQLite
         ↓
[WS broadcast: task.claimed] → Board updates live
```

## 4. Key Design Decisions

| Decision | Rationale |
|---|---|
| SQLite + Prisma | Single-user local app; simplicity over scale |
| `version` INTEGER on tasks | Optimistic locking; 409 Conflict on mismatch |
| WS reconcile via `setQueryData` | Fast UI updates; `invalidateQueries` fallback on error |
| `UPDATE...RETURNING` for claim | Atomic claim prevents race conditions |
| Separate `task_runs` table | Keeps execution history; task result is user-managed |
| Executor rollback + cleanup session | Prisma transaction rollback after exception |

## 5. CORS

```ts
app.use(
  cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "x-api-key"],
    credentials: true,
  })
);
```

## 6. Environment

Required env vars for executors (examples):

```bash
DEEPSEEK_API_KEY=sk-...
```

Model registry stores the env var name, not the key itself.
