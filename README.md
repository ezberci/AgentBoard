# Agent Board

> Local-first agent Kanban board. Manage tasks, assign agents, run LLM executors, and collaborate via MCP.

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate -w server

# Optional: seed with sample data
npm run db:seed -w server

# Run both backend and frontend
./scripts/dev.sh
```

- Backend: http://localhost:8765
- Frontend: http://localhost:5173

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Hono, Prisma, Zod, Pino |
| Database | SQLite (local-only) |
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS |
| Realtime | WebSocket (`ws` library) |
| DnD | `@dnd-kit/core` |
| State | React Query + WebSocket reconcile |
| MCP | `@modelcontextprotocol/sdk` |
| Executor | DeepSeek API (OpenAI-compatible streaming) |

## Project Structure

```
AgentBoard/
├── server/              # Hono backend
│   ├── src/
│   │   ├── index.ts           # App entry + WS upgrade
│   │   ├── routes/            # HTTP route handlers
│   │   ├── services/          # Business logic
│   │   ├── schemas/           # Zod validation
│   │   ├── executors/         # LLM API integration
│   │   ├── mcp/               # MCP server + tools
│   │   ├── ws/                # WebSocket manager
│   │   └── prisma/            # Schema + client + seed
│   └── tests/                 # Vitest + supertest
├── web/                 # Vite + React frontend
│   ├── src/
│   │   ├── api/               # REST client
│   │   ├── hooks/             # React Query hooks
│   │   ├── pages/             # Page components
│   │   └── components/        # Shared UI components
└── docs/                # Architecture & feature docs
```

## Common Commands

```bash
# Dev servers
npm run dev -w server          # backend only
npm run dev -w web             # frontend only
./scripts/dev.sh               # both (concurrent)

# Tests & checks
npm run test -w server         # run tests
npm run test:watch -w server   # watch mode
npm run build -w server        # type check
npm run check -w server        # type check + tests

# Database
npm run db:generate -w server  # regenerate Prisma client
npm run db:migrate -w server   # run migrations
npm run db:seed -w server      # seed sample data
```

## Environment

Copy `.env.example` to `server/.env` and fill in:

```bash
DATABASE_URL="file:../../agentboard.db"
API_KEY=dev-key-change-me
```

For LLM executors, set the provider API key (e.g., `DEEPSEEK_API_KEY`).

## MCP Setup

```bash
claude mcp add agent-board -- \
  npm run mcp -w /Users/arif/Desktop/AgentBoard/server
```

Verify in Claude Code with `/mcp`.

## Documentation

- [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md) — Detailed setup
- [`docs/architecture.md`](docs/architecture.md) — System design
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — Prisma schema reference
- [`docs/api.md`](docs/api.md) — API endpoints
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — Frontend patterns
- [`docs/MCP.md`](docs/MCP.md) — MCP tool reference
- [`docs/EXECUTOR.md`](docs/EXECUTOR.md) — Executor design
