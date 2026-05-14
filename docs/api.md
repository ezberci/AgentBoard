# API Reference

> REST endpoints and WebSocket events.

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
| `POST` | `/api/columns/{id}/reorder` | Reorder column |

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

### 1.6 Models (V2)

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
| `GET` | `/api/health` | Health check |
| `GET` | `/api/mcp-info` | MCP setup snippet |

## 2. Request/Response Examples

### Create Task

```bash
curl -X POST http://localhost:8765/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"project_id":1,"column_id":1,"title":"Fix bug","priority":2}'
```

### Move Task (with optimistic locking)

```bash
curl -X POST http://localhost:8765/api/tasks/42/move \
  -H "Content-Type: application/json" \
  -d '{"column_id":3,"expected_version":5}'
```

### Start Task Run

```bash
curl -X POST http://localhost:8765/api/tasks/42/run \
  -H "Content-Type: application/json" \
  -d '{"model_id":1,"prompt":"Implement auth"}'
```

Response: `202 Accepted`
```json
{"status": "started", "task_id": 42}
```

### Models Health

```bash
curl http://localhost:8765/api/models/health
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
| `task.deleted` | `{ task_id, column_id }` | DELETE /api/tasks/{id} |
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
| `400` | Bad Request | Missing `model_id` in run |
| `404` | Not Found | Entity does not exist |
| `409` | Conflict | `expected_version` mismatch |
