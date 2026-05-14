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
│   └── agentColors.ts    # Color slug → CSS color resolver
├── hooks/
│   ├── useAgents.ts      # Agent CRUD hooks
│   ├── useBoard.ts       # Board data + WebSocket listener
│   ├── useModels.ts      # Model registry hooks
│   ├── useProjects.ts    # Project hooks
│   ├── useTaskDetail.ts  # Task + update + comment hooks
│   └── useTaskRuns.ts    # Task run history hook
├── pages/
│   ├── Board.tsx         # Main board (classic/dense/swimlanes)
│   ├── Agents.tsx        # Agent CRUD page
│   ├── Skills.tsx        # Skill CRUD page
│   └── Models.tsx        # Model registry page
└── components/
    ├── Column.tsx        # Droppable column
    ├── TaskCard.tsx      # Draggable task card
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

| View | Description | DnD |
|------|-------------|-----|
| `classic` | Kanban columns with cards | Yes |
| `dense` | Compact list per column | No |
| `swimlanes` | Agent rows × column grid | No |

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

Focusable cards have `tabIndex={0}` and `data-task-id={id}`.

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
