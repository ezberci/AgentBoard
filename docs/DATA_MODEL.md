# Data Model

> ORM entities, relationships, and migrations.

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
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### 2.2 columns

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| project_id | INTEGER | FK → projects(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| position | INTEGER | NOT NULL, DEFAULT 0 |
| is_terminal | BOOLEAN | NOT NULL, DEFAULT FALSE |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### 2.3 tasks

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| project_id | INTEGER | FK → projects(id) ON DELETE CASCADE |
| column_id | INTEGER | FK → columns(id) |
| title | TEXT | NOT NULL |
| description | TEXT | |
| priority | INTEGER | NOT NULL, DEFAULT 4 (1=urgent, 4=low) |
| result | TEXT | |
| assigned_agent_id | INTEGER | FK → agents(id) ON DELETE SET NULL |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| claimed_at | TIMESTAMP | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

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
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

### 2.5 skills

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| name | TEXT | NOT NULL, UNIQUE |
| description | TEXT | |
| instructions | TEXT | |
| allowed_tools | JSON | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

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
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_task_comments_task_created` on `(task_id, created_at)`

### 2.8 models (V2)

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| name | TEXT | NOT NULL, UNIQUE |
| provider | TEXT | NOT NULL |
| model_id | TEXT | NOT NULL (API model identifier) |
| api_key_env | TEXT | NOT NULL (env var name) |
| base_url | TEXT | |
| is_enabled | BOOLEAN | NOT NULL, DEFAULT TRUE |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Index:** `idx_models_provider_enabled` on `(provider, is_enabled)`

### 2.9 task_runs (V2)

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK |
| task_id | INTEGER | FK → tasks(id) ON DELETE CASCADE |
| model_id | INTEGER | FK → models(id) ON DELETE SET NULL |
| agent_id | INTEGER | FK → agents(id) ON DELETE SET NULL |
| status | TEXT | NOT NULL (`running`, `completed`, `failed`) |
| prompt | TEXT | |
| output | TEXT | |
| usage | JSON | Token counts etc. |
| started_at | TIMESTAMP | |
| finished_at | TIMESTAMP | |
| error | TEXT | Max 500 chars |

**Index:** `idx_task_runs_task_started` on `(task_id, started_at DESC)`

## 3. ON DELETE Behaviors

| Foreign Key | Behavior | Rationale |
|-------------|----------|-----------|
| `tasks.assigned_agent_id → agents(id)` | SET NULL | Agent silinince task unclaimed kalır |
| `agent_skills.agent_id → agents(id)` | CASCADE | Agent silinince ilişkileri de silinir |
| `agent_skills.skill_id → skills(id)` | CASCADE | Skill silinince ilişkileri de silinir |
| `task_runs.model_id → models(id)` | SET NULL | Model silinince run history korunur |
| `task_runs.agent_id → agents(id)` | SET NULL | Agent silinince run history korunur |

## 4. Migrations

| File | Description |
|------|-------------|
| `0001_initial.py` | Phase 1 tables: projects, columns, tasks, agents, skills, agent_skills, task_comments |
| `0002_executor.py` | Phase 5 tables: models, task_runs + indexes |

Run migrations:
```bash
uv run alembic upgrade head
```

## 5. Status Derivation

Tasks have no `status` column. Status is derived from `column.is_terminal` and `claimed_at`:

```python
def derive_status(task, columns):
    col = columns.find(c => c.id == task.column_id)
    if col.is_terminal: return "done"
    if task.claimed_at: return "in_progress"
    return "todo"
```
