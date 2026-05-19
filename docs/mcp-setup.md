# Agent Board — MCP Setup

The project ships with an MCP server that exposes Kanban operations to Claude Code (or any MCP client).

## Installation

The MCP server is part of the `agent-board-clone` package and uses the official Python `mcp` SDK.

```bash
uv sync
```

## Register with Claude Code

Add the following to your Claude Code configuration (e.g., `~/.claude-code/config.json` or the IDE-specific MCP config):

```json
{
  "mcpServers": {
    "vibe-kanban": {
      "command": "uv",
      "args": [
        "run",
        "--package",
        "vibe-kanban-clone",
        "python",
        "-m",
        "vibe_kanban_clone.mcp"
      ],
      "env": {
        "DATABASE_URL": "sqlite+aiosqlite:///./vibe_kanban.db"
      }
    }
  }
}
```

> The server uses **stdio** transport. Make sure the working directory is the project root so the database file is found relative to `DATABASE_URL`.

## Available Tools

Once connected, Claude Code can call:

- `get_context` — overview of the current project, columns, and recent tasks
- `list_projects` / `get_project` — project queries
- `list_tasks` / `get_task` — task queries (with status, agent, and priority filters)
- `create_task` / `update_task` / `delete_task` — task CRUD
- `list_agents` / `get_agent` — agent queries
- `list_skills` / `get_skill` — skill queries
- `assign_agent_to_task` / `unassign_agent` — task ownership
- `claim_next_task` — atomically pull the next unclaimed task for an agent
- `complete_task` — finish a task and move it to the terminal column
- `add_task_comment` — leave a comment on a task

## Usage Example

In Claude Code, you can ask:

> "Create a task called 'Write API docs' in the current project and assign it to agent A1."

Claude will call `get_context` to find the project, `create_task` to add the card, and `assign_agent_to_task` to set the owner.

## Troubleshooting

- **Database not found**: Ensure `DATABASE_URL` points to the correct SQLite file and the backend has run at least once to create the schema.
- **Tool errors**: Check the backend logs; the MCP tools reuse the same services as the REST API.
