# API Reference

> REST endpoints and WebSocket events.

All API endpoints (except `/api/health`) require the `x-api-key` header.

## 1. REST Endpoints

### 1.1 Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/{id}` | Get project |
| `PATCH` | `/api/projects/{id}` | Update project |
| `DELETE` | `/api/projects/{id}` | Delete project |

### 1.2 Columns

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects/{id}/columns` | List columns |
| `POST` | `/api/projects/{id}/columns` | Create column |
| `PATCH` | `/api/columns/{id}` | Update column |
| `DELETE` | `/api/columns/{id}` | Delete column |
| `POST` | `/api/columns/{id}/reorder` | Reorder columns |

### 1.3 Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects/{id}/tasks` | List tasks |
| `POST` | `/api/tasks` | Create task |
| `GET` | `/api/tasks/{id}` | Get task (with comments) |
| `PATCH` | `/api/tasks/{id}` | Update task |
| `DELETE` | `/api/tasks/{id}` | Delete task |
| `POST` | `/api/tasks/{id}/move` | Move task to column |
| `POST` | `/api/tasks/{id}/comments` | Add comment |
| `POST` | `/api/tasks/{id}/run` | **Start task execution** |
| `GET` | `/api/tasks/{id}/runs` | **List task runs** |

### 1.4 Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents` | List agents |
| `POST` | `/api/agents` | Create agent |
| `GET` | `/api/agents/{id}` | Get agent |
| `PATCH` | `/api/agents/{id}` | Update agent |
| `DELETE` | `/api/agents/{id}` | Delete agent |
| `POST` | `/api/agents/{id}/skills/{skill_id}` | Assign skill |
| `DELETE` | `/api/agents/{id}/skills/{skill_id}` | Remove skill |

### 1.5 Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/skills` | List skills |
| `POST` | `/api/skills` | Create skill |
| `GET` | `/api/skills/{id}` | Get skill |
| `PATCH` | `/api/skills/{id}` | Update skill |
| `DELETE` | `/api/skills/{id}` | Delete skill |

### 1.6 Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/models` | List models |
| `POST` | `/api/models` | Create model |
| `GET` | `/api/models/{id}` | Get model |
| `PATCH` | `/api/models/{id}` | Update model |
| `DELETE` | `/api/models/{id}` | Delete model |
| `GET` | `/api/models/health` | Env var check |

### 1.7 Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check (no auth) |
| `GET` | `/api/mcp-info` | MCP setup snippet |

## 2. Request/Response Examples

All examples include the required `x-api-key` header.

### Create Task

```bash
curl -X POST http://localhost:8765/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-change-me" \
  -d '{"project_id":1,"column_id":1,"title":"Fix bug","priority":2}'
```

### Move Task (with optimistic locking)

```bash
curl -X POST http://localhost:8765/api/tasks/42/move \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-change-me" \
  -d '{"column_id":3,"expected_version":5}'
```

### Start Task Run

```bash
curl -X POST http://localhost:8765/api/tasks/42/run \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-change-me" \
  -d '{"model_id":1,"prompt":"Implement auth"}'
```

Response: `202 Accepted`
```json
{"status": "started", "task_id": 42}
```

### Models Health

```bash
curl http://localhost:8765/api/models/health \
  -H "x-api-key: dev-key-change-me"
```

Response:
```json
[
  {"id": 1, "name": "deepseek-v3", "env_var": "DEEPSEEK_API_KEY", "env_present": true}
]
```

## 3. WebSocket Events

### 3.1 Project Channel (`/ws/projects/{id}`)

| Event | Payload | Trigger |
|-------|---------|---------|
| `task.created` | `{ task }` | POST /api/tasks |
| `task.moved` | `{ task }` | POST /api/tasks/{id}/move |
| `task.updated` | `{ task }` | PATCH /api/tasks/{id} |
| `task.deleted` | `{ task_id }` | DELETE /api/tasks/{id} |
| `task.claimed` | `{ task }` | MCP claim_next_task |
| `comment.created` | `{ comment }` | POST /api/tasks/{id}/comments |
| `column.created` | `{ column }` | POST /api/projects/{id}/columns |
| `column.updated` | `{ column }` | PATCH /api/columns/{id} |
| `column.deleted` | `{ column_id }` | DELETE /api/columns/{id} |
| `run.started` | `{ run_id, task_id }` | POST /api/tasks/{id}/run |
| `run.token` | `{ run_id, token }` | Executor streaming |
| `run.finished` | `{ run_id, status, error? }` | Executor done/fail |

### 3.2 Global Channel (`/ws/global`)

| Event | Payload | Trigger |
|-------|---------|---------|
| `agent.created` | `{ agent }` | POST /api/agents |
| `agent.updated` | `{ agent }` | PATCH /api/agents/{id} |
| `agent.deleted` | `{ agent_id }` | DELETE /api/agents/{id} |
| `skill.created` | `{ skill }` | POST /api/skills |
| `skill.updated` | `{ skill }` | PATCH /api/skills/{id} |
| `skill.deleted` | `{ skill_id }` | DELETE /api/skills/{id} |
| `model.created` | `{ model }` | POST /api/models |
| `model.updated` | `{ model }` | PATCH /api/models/{id} |
| `model.deleted` | `{ model_id }` | DELETE /api/models/{id} |

## 4. Error Codes

| Status | Meaning | Context |
|--------|---------|---------|
| `400` | Bad Request | Validation error (Zod) |
| `401` | Unauthorized | Missing or invalid `x-api-key` |
| `404` | Not Found | Entity does not exist |
| `409` | Conflict | `expected_version` mismatch |
| `503` | Service Unavailable | Max concurrent runs exceeded |
