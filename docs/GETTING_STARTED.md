# Getting Started

> Setup, run, and develop Vibe Kanban Clone.

## 1. Prerequisites

- Python 3.11+
- `uv` (Python package manager)
- Node.js 20+ + `npm`

## 2. Installation

```bash
# Clone (or cd into existing directory)
cd /Users/arif/Desktop/AgentBoard

# Install Python dependencies
uv sync --all-extras --all-groups

# Install frontend dependencies
cd web && npm install && cd ..
```

## 3. Database Setup

```bash
# Run migrations
uv run alembic upgrade head

# Optional: seed with sample data
uv run python scripts/seed.py
```

## 4. Running

### 4.1 Backend Only

```bash
uv run uvicorn vibe_kanban_clone.api.app:app --host 127.0.0.1 --port 8765
```

### 4.2 Frontend Only

```bash
cd web && npm run dev
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
uv run pytest

# With coverage (optional)
uv run pytest --cov=src/vibe_kanban_clone
```

Tests use in-memory SQLite and `AsyncClient` against the FastAPI app.

## 6. Lint / Format

```bash
# Format
uv run ruff format src tests

# Lint
uv run ruff check src tests
```

## 7. MCP Setup

You can copy the MCP server snippet from the **Settings** page in the UI (top-right nav), or run:

```bash
set -a; source .env; set +a
claude mcp add vibe-kanban -- \
  uv --directory /Users/arif/Desktop/AgentBoard \
  run python -m vibe_kanban_clone.mcp
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
|-------|---------------|
| `api/routes/` | HTTP input validation, broadcast WS events |
| `services/` | Business logic, atomic operations |
| `models/` | ORM definitions only |
| `schemas/` | Pydantic validation |
| `executors/` | LLM API integration |
| `mcp/` | MCP tool definitions |
| `web/src/api/` | REST client |
| `web/src/hooks/` | React Query + mutations |
| `web/src/pages/` | Page-level components |
| `web/src/components/` | Shared UI components |

Always update `docs/` when adding major features.
