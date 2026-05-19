# MCP Server

> Model Context Protocol integration for Claude Code.

## 1. What is MCP?

MCP (Model Context Protocol) allows Claude Code to interact with the Agent Board backend via tools. The server uses stdio transport (Claude Code default).

## 2. Setup

### 2.1 Register MCP Server

```bash
# Add to Claude Code
claude mcp add agent-board -- \
  npm run mcp -w /Users/arif/Desktop/AgentBoard/server
```

### 2.2 Verify Connection

In Claude Code:
```
/mcp
```

Check that `vibe-kanban` appears in the tool list.

## 3. Available Tools

| Tool | Description |
|---|---|
| `get_context()` | Returns `{current_project, columns, recent_tasks}` |
| `list_projects()` | All projects |
| `get_project(project_id)` | Project detail |
| `list_tasks(...)` | Filter by status, agent, priority |
| `get_task(task_id)` | Task detail |
| `create_task(...)` | Create new task |
| `update_task(...)` | Update description, result, priority |
| `delete_task(task_id)` | Delete task |
| `list_agents()` | All agents |
| `get_agent(agent_id)` | Agent with skills |
| `list_skills()` | All skills |
| `get_skill(skill_id)` | Skill detail |
| `assign_agent_to_task(...)` | Assign agent |
| `unassign_agent(task_id)` | Remove assignment |
| `claim_next_task(agent_id, project_id)` | **Atomic task pickup** |
| `complete_task(task_id, result)` | Write result + move to terminal column |
| `add_task_comment(...)` | Add comment |

## 4. Atomic Claim

`claim_next_task` is the most important tool. It uses a single atomic SQL statement:

```sql
UPDATE tasks
SET assigned_agent_id = :agent_id,
    claimed_at = :now,
    column_id = COALESCE(
        (SELECT next column id...),
        tasks.column_id
    )
WHERE id = (
    SELECT id FROM tasks
    WHERE claimed_at IS NULL
      AND project_id = :project_id
    ORDER BY priority ASC, created_at ASC
    LIMIT 1
)
RETURNING id, assigned_agent_id, claimed_at, column_id
```

This guarantees only one agent claims the next available task, even with concurrent calls.

## 5. Status Filtering in MCP

`list_tasks` accepts a `status` filter derived from columns:

| Status | SQL Condition |
|---|---|
| `todo` | `claimed_at IS NULL` |
| `in_progress` | `claimed_at IS NOT NULL AND column.is_terminal = FALSE` |
| `done` | `column.is_terminal = TRUE` |

## 6. Example Usage

In Claude Code:
```
Claim the next task for frontend-builder and implement the auth page.
```

Claude will:
1. Call `claim_next_task(agent_id=..., project_id=...)`
2. Work on the task
3. Call `complete_task(task_id=..., result="...")`
4. Board updates live via WebSocket

## 7. Env Loading

MCP entrypoint loads `.env` from server directory:

```ts
import { config } from "dotenv";
config({ path: path.resolve(import.meta.dirname, "../../.env") });
```

This ensures API keys are available regardless of CWD.
