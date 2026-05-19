# Data Model

> Prisma schema, entities, and relationships.

## 1. Entity Overview

```
Project 1--* Column 1--* Task 1--* TaskComment
                     Task *--1 Agent
                     Task *--1 Model (via TaskRun)
                     Task 1--* TaskRun
Agent *--* Skill
```

## 2. Tables

### 2.1 projects

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| name | TEXT | NOT NULL |
| slug | TEXT | NOT NULL, UNIQUE |
| description | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### 2.2 columns

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| project_id | INTEGER | FK → projects(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| position | INTEGER | NOT NULL, DEFAULT 0 |
| is_terminal | BOOLEAN | NOT NULL, DEFAULT FALSE |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### 2.3 tasks

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| project_id | INTEGER | FK → projects(id) ON DELETE CASCADE |
| column_id | INTEGER | FK → columns(id) ON DELETE SET NULL |
| title | TEXT | NOT NULL |
| description | TEXT | |
| priority | INTEGER | NOT NULL, DEFAULT 4 (1=urgent, 4=low) |
| result | TEXT | |
| assigned_agent_id | INTEGER | FK → agents(id) ON DELETE SET NULL |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| claimed_at | DATETIME | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Indexes:**
- `idx_tasks_project_column` on `(project_id, column_id, priority)`
- `idx_tasks_agent_claimed` on `(assigned_agent_id, claimed_at)`

### 2.4 agents

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| name | TEXT | NOT NULL, UNIQUE |
| system_prompt | TEXT | |
| color | TEXT | Slug initials, e.g. `fb` |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### 2.5 skills

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| name | TEXT | NOT NULL, UNIQUE |
| description | TEXT | |
| instructions | TEXT | |
| allowed_tools | TEXT | Stored as JSON string (SQLite has no native JSON type) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### 2.6 agent_skills (M2M)

| Column | Type | Constraints |
|--------|------|-------------|
| agent_id | INTEGER | FK → agents(id) ON DELETE CASCADE |
| skill_id | INTEGER | FK → skills(id) ON DELETE CASCADE |
| PK | (agent_id, skill_id) | |

### 2.7 task_comments

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| task_id | INTEGER | FK → tasks(id) ON DELETE CASCADE |
| author | TEXT | NOT NULL |
| body | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_task_comments_task_created` on `(task_id, created_at)`

### 2.8 models

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| name | TEXT | NOT NULL, UNIQUE |
| provider | TEXT | NOT NULL |
| model_id | TEXT | NOT NULL (API model identifier) |
| api_key_env | TEXT | NOT NULL (env var name) |
| base_url | TEXT | |
| is_enabled | BOOLEAN | NOT NULL, DEFAULT TRUE |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_models_provider_enabled` on `(provider, is_enabled)`

### 2.9 task_runs

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| task_id | INTEGER | FK → tasks(id) ON DELETE CASCADE |
| model_id | INTEGER | FK → models(id) ON DELETE SET NULL |
| agent_id | INTEGER | FK → agents(id) ON DELETE SET NULL |
| status | TEXT | NOT NULL (`running`, `completed`, `failed`) |
| prompt | TEXT | |
| output | TEXT | |
| usage | TEXT | Token counts etc. (stored as JSON string) |
| started_at | DATETIME | |
| finished_at | DATETIME | |
| error | TEXT | Max 500 chars |

**Index:** `idx_task_runs_task_started` on `(task_id, started_at DESC)`

## 3. ON DELETE Behaviors

| Foreign Key | Behavior | Rationale |
|-------------|----------|-----------|
| `tasks.assigned_agent_id → agents(id)` | SET NULL | Agent deleted → task becomes unclaimed |
| `agent_skills.agent_id → agents(id)` | CASCADE | Agent deleted → relations removed |
| `agent_skills.skill_id → skills(id)` | CASCADE | Skill deleted → relations removed |
| `task_runs.model_id → models(id)` | SET NULL | Model deleted → run history preserved |
| `task_runs.agent_id → agents(id)` | SET NULL | Agent deleted → run history preserved |

## 4. Schema Management

Schema is managed by **Prisma** (`server/src/prisma/schema.prisma`).

Generate the client after schema changes:
```bash
npm run db:generate
```

Run migrations (creates/updates SQLite schema):
```bash
npm run db:migrate
```

Seed the database:
```bash
npm run db:seed
```

## 5. Status Derivation

Tasks have no `status` column. Status is derived from `column.is_terminal` and `claimed_at`:

```typescript
function deriveStatus(task: Task, columns: Column[]): string {
  const col = columns.find((c) => c.id === task.column_id);
  if (col?.is_terminal) return "done";
  if (task.claimed_at) return "in_progress";
  return "todo";
}
```
