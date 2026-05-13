# Vibe Kanban — REST API Reference

Base path: `/api`

## Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |

## Projects

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects` | List all projects |
| `POST` | `/projects` | Create a project (auto-slug) |
| `GET` | `/projects/{id}` | Get project detail |
| `PATCH` | `/projects/{id}` | Update project |
| `DELETE` | `/projects/{id}` | Delete project |

## Columns

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects/{project_id}/columns` | List columns by project |
| `POST` | `/projects/{project_id}/columns` | Create a column |
| `PATCH` | `/columns/{id}` | Update a column |
| `DELETE` | `/columns/{id}` | Delete a column |
| `POST` | `/columns/{id}/reorder` | Reorder columns within a project |

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects/{project_id}/tasks` | List tasks by project |
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks/{id}` | Get task detail |
| `PATCH` | `/tasks/{id}` | Update a task (supports `expected_version` for optimistic locking) |
| `DELETE` | `/tasks/{id}` | Delete a task |
| `POST` | `/tasks/{id}/move` | Move task to another column (supports `expected_version`) |
| `POST` | `/tasks/{id}/comments` | Add a comment to a task |

### Optimistic Locking

`PATCH /tasks/{id}` and `POST /tasks/{id}/move` accept an optional `expected_version` field. If the task's current `version` does not match, the API returns `409 Conflict`.

## Agents

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/agents` | List all agents |
| `POST` | `/agents` | Create an agent (auto-deduped color) |
| `GET` | `/agents/{id}` | Get agent detail with skills |
| `PATCH` | `/agents/{id}` | Update an agent |
| `DELETE` | `/agents/{id}` | Delete an agent |
| `POST` | `/agents/{id}/skills/{skill_id}` | Assign a skill to an agent |
| `DELETE` | `/agents/{id}/skills/{skill_id}` | Unassign a skill from an agent |

## Skills

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/skills` | List all skills |
| `POST` | `/skills` | Create a skill |
| `GET` | `/skills/{id}` | Get skill detail |
| `PATCH` | `/skills/{id}` | Update a skill |
| `DELETE` | `/skills/{id}` | Delete a skill |
