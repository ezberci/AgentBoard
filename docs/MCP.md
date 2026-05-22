# MCP Server

> Model Context Protocol integration for external agent tools.

## 1. Overview

The MCP server exposes Agent Board operations as structured tools over stdio transport. Any MCP-compatible client (Claude Code, Cursor, etc.) can call these tools to read and mutate board state.

Server name: `agent-board`
Entrypoint: `npm run mcp -w server`

## 2. Setup

```bash
claude mcp add agent-board -- \
  npm run mcp -w /Users/arif/Desktop/AgentBoard/server
```

Verify with `/mcp` in the client.

## 3. Available Tools (17)

### 3.1 Context

#### `get_context`
Return the current project with columns and recent tasks.

| Parameter | Type | Required | Default |
|---|---|---|---|
| `project_id` | integer | No | First project in list |

**Returns:** `{ current_project, columns, recent_tasks }`

---

### 3.2 Projects

#### `list_projects`
List all projects.

**Parameters:** none

**Returns:** `Project[]`

#### `get_project`
Get project detail.

| Parameter | Type | Required |
|---|---|---|
| `project_id` | integer | Yes |

**Returns:** `Project`

---

### 3.3 Tasks

#### `list_tasks`
List tasks with optional filters.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_id` | integer | Yes | Project to filter |
| `status` | string | No | `todo`, `in_progress`, or `done` |
| `agent_id` | integer | No | Filter by assigned agent |
| `priority_gte` | integer | No | Minimum priority (1 = urgent) |

**Returns:** `Task[]`

#### `get_task`
Get task detail with comments.

| Parameter | Type | Required |
|---|---|---|
| `task_id` | integer | Yes |

**Returns:** `Task` (with `comments` array)

#### `create_task`
Create a new task in the first column of the project.

| Parameter | Type | Required | Default |
|---|---|---|---|
| `project_id` | integer | Yes | — |
| `title` | string | Yes | — |
| `description` | string | No | — |
| `priority` | integer | No | `4` |
| `agent_id` | integer | No | — |

**Returns:** `Task`

#### `update_task`
Update task fields. Uses current version for optimistic locking internally.

| Parameter | Type | Required |
|---|---|---|
| `task_id` | integer | Yes |
| `description` | string | No | — |
| `result` | string | No | — |
| `priority` | integer | No | — |

**Returns:** `Task` or `null` if not found

#### `delete_task`
Delete a task.

| Parameter | Type | Required |
|---|---|---|
| `task_id` | integer | Yes |

**Returns:** `true` (deleted) or `false` (not found)

#### `assign_agent_to_task`
Assign an agent to a task.

| Parameter | Type | Required |
|---|---|---|
| `task_id` | integer | Yes |
| `agent_id` | integer | Yes |

**Returns:** `Task` or `null`

#### `unassign_agent`
Remove agent assignment from a task.

| Parameter | Type | Required |
|---|---|---|
| `task_id` | integer | Yes |

**Returns:** `Task` or `null`

#### `claim_next_task`
Atomically claim the next available unclaimed task for an agent. The task is moved to the next column by position and `claimed_at` is set.

| Parameter | Type | Required |
|---|---|---|
| `agent_id` | integer | Yes |
| `project_id` | integer | Yes |

**Returns:** `Task` or `null` (no available task)

**Race safety:** Single `UPDATE ... RETURNING` statement. Concurrent claims are serialized by SQLite.

#### `complete_task`
Write a result and move the task to the terminal column.

| Parameter | Type | Required |
|---|---|---|
| `task_id` | integer | Yes |
| `result` | string | Yes |

**Returns:** `Task` or `null`

#### `add_task_comment`
Add a comment to a task.

| Parameter | Type | Required | Default |
|---|---|---|---|
| `task_id` | integer | Yes | — |
| `body` | string | Yes | — |
| `author` | string | No | `"MCP"` |

**Returns:** `TaskComment` or `null`

---

### 3.4 Agents

#### `list_agents`
List all agents.

**Parameters:** none

**Returns:** `Agent[]`

#### `get_agent`
Get agent detail with skills.

| Parameter | Type | Required |
|---|---|---|
| `agent_id` | integer | Yes |

**Returns:** `Agent` (with `skills` array)

---

### 3.5 Skills

#### `list_skills`
List all skills.

**Parameters:** none

**Returns:** `Skill[]`

#### `get_skill`
Get skill detail.

| Parameter | Type | Required |
|---|---|---|
| `skill_id` | integer | Yes |

**Returns:** `Skill`

---

## 4. Status Filtering

`list_tasks` accepts a `status` filter derived from columns:

| Status | Condition |
|---|---|
| `todo` | `claimed_at IS NULL` |
| `in_progress` | `claimed_at IS NOT NULL AND column.is_terminal = FALSE` |
| `done` | `column.is_terminal = TRUE` |

## 5. Example Workflow

```
1. get_context() → identify current project
2. claim_next_task(agent_id, project_id) → pick up next task
3. (do the work)
4. complete_task(task_id, result) → finish and move to terminal column
```

Board updates live via WebSocket for all connected clients.

## 6. Env Loading

The MCP entrypoint loads `.env` from the server directory so that model API keys are available regardless of the current working directory:

```ts
import { config } from "dotenv";
config({ path: path.resolve(import.meta.dirname, "../../.env") });
```
