# Frontend Guide

> React + TypeScript + Tailwind CSS architecture.

## 1. Tech Stack

| Tool | Purpose |
|------|---------|
| Vite | Build tool + dev server |
| React 18 | UI framework |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| `@tailwindcss/typography` | Markdown prose styles |
| TanStack Query | Server state + caching |
| `@dnd-kit/core` | Drag & drop |
| `react-markdown` | Markdown rendering |

## 2. Directory Structure

```
web/src/
├── main.tsx              # Entry point
├── App.tsx               # Root layout + navigation
├── index.css             # Tailwind directives + CSS variables
├── types.ts              # Shared TypeScript interfaces
├── api/client.ts         # Typed fetch wrapper
├── lib/
│   ├── agentColors.ts    # Color slug → CSS color resolver
│   └── phase.ts          # Column position → phase (1-4) calculator
├── hooks/
│   ├── useAgents.ts      # Agent CRUD hooks
│   ├── useBoard.ts       # Board data + WebSocket listener
│   ├── useModels.ts      # Model registry hooks
│   ├── useProjects.ts    # Project hooks (+ useCreateProject)
│   ├── useTaskDetail.ts  # Task + update + comment hooks
│   └── useTaskRuns.ts    # Task run history hook
├── pages/
│   ├── Board.tsx         # Main board (classic/dense/swimlanes)
│   ├── Agents.tsx        # Agent CRUD page
│   ├── Skills.tsx        # Skill CRUD page
│   ├── Models.tsx        # Model registry page
│   └── Settings.tsx      # MCP snippet, health checks, env status
└── components/
    ├── Column.tsx        # Droppable column + inline task create
    ├── TaskCard.tsx      # Draggable task card + phase ribbon
    └── TaskDetail.tsx    # Slide-out drawer (detail, comments, run)
```

## 3. State Management

### 3.1 Server State — React Query

All backend data is fetched via React Query. Cache keys follow this pattern:

```
["agents"]                    → Agent list
["agents", id]               → Single agent
["skills"]                    → Skill list
["models"]                    → Model list
["projects"]                  → Project list
["projects", id, "columns"]  → Columns for project
["projects", id, "tasks"]    → Tasks for project
["tasks", id]                → Task detail (with comments)
["tasks", id, "runs"]        → Task run history
```

### 3.2 WebSocket Reconcile

`useBoard.ts` opens a WebSocket per project and updates React Query cache directly:

```typescript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "task.moved":
      queryClient.setQueryData(tasksKey, (old) =>
        old.map((t) => (t.id === msg.payload.id ? msg.payload : t))
      );
      break;
    case "task.deleted":
      queryClient.setQueryData(tasksKey, (old) =>
        old.filter((t) => t.id !== msg.payload.task_id)
      );
      break;
    // ... etc
  }
};
```

WebSocket reconnect uses exponential backoff (max 30s).

### 3.3 Optimistic Updates

Task drag-and-drop uses optimistic update:

```typescript
const previousTasks = queryClient.getQueryData(tasksKey);
queryClient.setQueryData(tasksKey, (old) =>
  old.map((t) => (t.id === taskId ? { ...t, column_id: newColumnId } : t))
);
try {
  await api.moveTask(taskId, { column_id: newColumnId, expected_version });
} catch {
  queryClient.setQueryData(tasksKey, previousTasks); // rollback
}
```

## 4. Board Views

Three view modes in `Board.tsx`:

| View | Description | DnD | Phase Ribbon |
|------|-------------|-----|--------------|
| `classic` | Kanban columns with cards | Yes | Yes |
| `dense` | Compact list per column | Yes | Yes |
| `swimlanes` | Agent rows × column grid | Yes | Yes |

All views reuse `TaskCard` for consistent card rendering, draggability, and agent dots.

Switch via state: `const [viewMode, setViewMode] = useState<ViewMode>("classic");`

## 5. Filters

Filter state lives in `Board.tsx`:

```typescript
const [search, setSearch] = useState("");
const [priorityFilter, setPriorityFilter] = useState<number[]>([]);
const [statusFilter, setStatusFilter] = useState<StatusFilter[]>([]);
const [agentFilter, setAgentFilter] = useState<number[]>([]);
```

All filters are applied client-side on `tasks` array via `useMemo`.

Status is derived from `column.is_terminal` and `task.claimed_at`:
- `todo` → `claimed_at` is null and column not terminal
- `in_progress` → `claimed_at` is set and column not terminal
- `done` → column `is_terminal` is true

## 6. Keyboard Navigation

`Board.tsx` attaches a global `keydown` listener when no drawer is open:

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate within same column |
| `←` / `→` | Navigate to adjacent column (same index) |
| `Enter` | Open task detail drawer |
| `Escape` | Close drawer |
| `Delete` | Delete focused task (with confirmation) |

Focusable cards have `tabIndex={0}` and `data-task-id={id}`.

## 5. Task & Column CRUD UI

### 5.1 Create Task
Each `Column` has an "+ Add task" button at the bottom. Clicking opens an inline form with:
- Title input (auto-focused)
- Priority selector (P1–P4)
- Add / Cancel buttons

Uses `useMutation` + `api.createTask()`. On success invalidates the project's tasks query.

### 5.2 Delete Task
- **Board:** Hovering a `TaskCard` reveals a delete button (⋮ or 🗑).
- **TaskDetail drawer:** Footer has a red "Delete" button with `confirm()` guard.
Both call `api.deleteTask()` and invalidate queries on success.

### 5.3 Column Management
- **Rename:** Click the column header name to enter inline edit mode. Submit on Enter or blur.
- **Delete:** Column header has a "⋮" actions menu with Delete option (with `confirm()`).
- **Add:** Board toolbar has an "+ Add Column" inline form.

All column mutations invalidate `["projects", projectId, "columns"]`.

## 6. Settings Page

`pages/Settings.tsx` provides onboarding and diagnostics:

| Section | Data Source |
|---------|------------|
| Backend Health | `api.health()` |
| Model Env Checks | `api.modelsHealth()` |
| MCP Snippet | Hardcoded JSON config with **Copy** button |

## 7. Agent Colors

Agent colors are slugs (e.g. `fb`, `na`) stored in DB. Frontend resolves them via `lib/agentColors.ts`:

```typescript
const palette: Record<string, string> = {
  fb: "#ef4444",
  na: "#a1a1aa",
  // ...
};
```

Fallback: `hsl((charCode * 37) % 360, 70%, 60%)`

## 8. Markdown Rendering

`TaskDetail.tsx` uses `react-markdown` with `prose prose-invert prose-sm` classes for:
- Task description
- Task result
- Live streaming output

Requires `@tailwindcss/typography` plugin in `tailwind.config.ts`.
