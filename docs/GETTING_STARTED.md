# Getting Started

> Setup, run, and develop Agent Board.

## 1. Prerequisites

- Node.js 20+ + `npm`

## 2. Installation

```bash
cd /Users/arif/Desktop/AgentBoard
npm install
```

## 3. Database Setup

```bash
# Prisma client generation (auto-runs on install)
npm run db:generate -w server

# Optional: seed with sample data
npm run db:seed
```

## 4. Running

### 4.1 Backend Only

```bash
npm run dev -w server
```

### 4.2 Frontend Only

```bash
npm run dev -w web
```

### 4.3 Both (concurrent)

```bash
./scripts/dev.sh
```

Backend: `http://localhost:8765`
Frontend: `http://localhost:5173`

## 5. Running Tests

```bash
# Full suite
npm run test -w server

# Watch mode
npm run test:watch -w server
```

Tests use in-memory SQLite and `supertest` against the Hono app.

## 6. Type Check

```bash
npm run build -w server
```

## 7. MCP Setup

You can copy the MCP server snippet from the **Settings** page in the UI (top-right nav), or run:

```bash
claude mcp add agent-board -- \
  npm run mcp -w /Users/arif/Desktop/AgentBoard/server
```

Verify in Claude Code with `/mcp`.

The **Settings** page also shows model environment variable health (`/api/models/health`).

## 8. Adding a Model

1. Set env var: `export DEEPSEEK_API_KEY=sk-...`
2. Go to **Models** page in UI
3. Click **Add** and fill:
   - Name: `deepseek-v3`
   - Provider: `deepseek`
   - Model ID: `deepseek-chat`
   - API Key Env Var: `DEEPSEEK_API_KEY`
4. Check `/api/models/health` — should show `env_present: true`

## 9. Project Structure for Agents

When modifying code, respect these boundaries:

| Layer | Responsibility |
|---|---|
| `server/src/routes/` | HTTP input validation, broadcast WS events |
| `server/src/services/` | Business logic, atomic operations |
| `server/src/prisma/` | Prisma schema + client |
| `server/src/schemas/` | Zod validation |
| `server/src/executors/` | LLM API integration |
| `server/src/mcp/` | MCP tool definitions |
| `web/src/api/` | REST client |
| `web/src/hooks/` | React Query + mutations |
| `web/src/pages/` | Page-level components |
| `web/src/components/` | Shared UI components |

Always update `docs/` when adding major features.
