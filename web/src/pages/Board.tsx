import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useBoard } from "@/hooks/useBoard";
import { useAgents } from "@/hooks/useAgents";
import { Column } from "@/components/Column";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetail } from "@/components/TaskDetail";
import { api } from "@/api/client";
import type { Task, Column as ColumnType } from "@/types";
import { resolveAgentColor } from "@/lib/agentColors";
import { computePhase } from "@/lib/phase";

type ViewMode = "classic" | "dense" | "swimlanes";
type StatusFilter = "todo" | "in_progress" | "done";

function deriveStatus(task: Task, columns: ColumnType[]): StatusFilter {
  const col = columns.find((c) => c.id === task.column_id);
  if (col?.is_terminal) return "done";
  if (task.claimed_at) return "in_progress";
  return "todo";
}

function priorityLabel(priority: number): string {
  if (priority <= 1) return "P1";
  if (priority <= 2) return "P2";
  if (priority <= 3) return "P3";
  return "P4";
}

function priorityClass(priority: number): string {
  if (priority <= 1) return "bg-red-500/20 text-red-400";
  if (priority <= 2) return "bg-amber-500/20 text-amber-400";
  if (priority <= 3) return "bg-blue-500/20 text-blue-400";
  return "bg-zinc-500/20 text-zinc-400";
}

export function Board() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading: projectsLoading, isError: projectsError } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { columns, tasks, isLoading: boardLoading, isError: boardError } = useBoard(selectedProjectId);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
  const { data: agents } = useAgents();
  const createProject = useCreateProject();

  const [viewMode, setViewMode] = useState<ViewMode>("classic");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter[]>([]);
  const [agentFilter, setAgentFilter] = useState<number[]>([]);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const agentMap = new Map<number, string>();
  for (const agent of agents ?? []) {
    if (agent.color) {
      agentMap.set(agent.id, agent.color);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false;
      if (statusFilter.length > 0) {
        const st = deriveStatus(t, columns);
        if (!statusFilter.includes(st)) return false;
      }
      if (agentFilter.length > 0) {
        if (!agentFilter.includes(t.assigned_agent_id ?? -1)) return false;
      }
      return true;
    });
  }, [tasks, search, priorityFilter, statusFilter, agentFilter, columns]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const col of columns) {
      map.set(col.id, []);
    }
    for (const task of filteredTasks) {
      const list = map.get(task.column_id);
      if (list) {
        list.push(task);
      }
    }
    return map;
  }, [filteredTasks, columns]);

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const getTaskPosition = useCallback(
    (taskId: number) => {
      for (let colIdx = 0; colIdx < sortedColumns.length; colIdx++) {
        const colTasks = tasksByColumn.get(sortedColumns[colIdx].id) ?? [];
        const taskIdx = colTasks.findIndex((t) => t.id === taskId);
        if (taskIdx !== -1) return { colIdx, taskIdx, colTasks };
      }
      return null;
    },
    [sortedColumns, tasksByColumn]
  );

  const focusTask = useCallback(
    (taskId: number | null) => {
      if (taskId == null) return;
      setFocusedTaskId(taskId);
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`);
        el?.focus();
      }, 0);
    },
    []
  );
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedTaskId !== null) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
        e.preventDefault();
      }

      let currentId = focusedTaskId;
      if (currentId == null && filteredTasks.length > 0) {
        currentId = filteredTasks[0].id;
        focusTask(currentId);
        return;
      }
      if (currentId == null) return;

      const pos = getTaskPosition(currentId);
      if (!pos) return;

      switch (e.key) {
        case "ArrowDown": {
          const next = pos.colTasks[pos.taskIdx + 1];
          if (next) focusTask(next.id);
          break;
        }
        case "ArrowUp": {
          const prev = pos.colTasks[pos.taskIdx - 1];
          if (prev) focusTask(prev.id);
          break;
        }
        case "ArrowRight": {
          const rightCol = sortedColumns[pos.colIdx + 1];
          if (rightCol) {
            const rightTasks = tasksByColumn.get(rightCol.id) ?? [];
            const target = rightTasks[Math.min(pos.taskIdx, rightTasks.length - 1)];
            if (target) focusTask(target.id);
          }
          break;
        }
        case "ArrowLeft": {
          const leftCol = sortedColumns[pos.colIdx - 1];
          if (leftCol) {
            const leftTasks = tasksByColumn.get(leftCol.id) ?? [];
            const target = leftTasks[Math.min(pos.taskIdx, leftTasks.length - 1)];
            if (target) focusTask(target.id);
          }
          break;
        }
        case "Enter": {
          setSelectedTaskId(currentId);
          break;
        }
        case "Delete": {
          const task = tasks.find((t) => t.id === currentId);
          if (task && confirm(`Delete task "${task.title}"?`)) {
            api.deleteTask(currentId).then(() => {
              queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "tasks"] });
            });
          }
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedTaskId, filteredTasks, selectedTaskId, getTaskPosition, focusTask, sortedColumns, tasksByColumn]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (!activeId.startsWith("task-") || !overId.startsWith("column-")) return;

    const taskId = Number(activeId.replace("task-", ""));
    const columnId = Number(overId.replace("column-", ""));

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.column_id === columnId) return;

    const previousTasks = queryClient.getQueryData<Task[]>(["projects", selectedProjectId, "tasks"]);

    queryClient.setQueryData(
      ["projects", selectedProjectId, "tasks"],
      (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map((t) => (t.id === taskId ? { ...t, column_id: columnId } : t));
      }
    );

    try {
      await api.moveTask(taskId, {
        column_id: columnId,
        expected_version: task.version,
      });
    } catch (err) {
      if (previousTasks) {
        queryClient.setQueryData(["projects", selectedProjectId, "tasks"], previousTasks);
      }
      if (err instanceof Error && err.message.includes("409")) {
        queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "tasks"] });
        queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "columns"] });
      }
    }
  };

  const togglePriority = (p: number) => {
    setPriorityFilter((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const toggleStatus = (s: StatusFilter) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleAgent = (id: number) => {
    setAgentFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const statusLabel = (s: StatusFilter) => {
    if (s === "todo") return "To Do";
    if (s === "in_progress") return "In Progress";
    return "Done";
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const project = await createProject.mutateAsync({ name: newProjectName.trim() });
    setNewProjectName("");
    setShowNewProject(false);
    setSelectedProjectId(project.id);
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !selectedProjectId) return;
    await api.createColumn(selectedProjectId, {
      name: newColumnName.trim(),
      position: sortedColumns.length,
    });
    queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "columns"] });
    setNewColumnName("");
    setShowAddColumn(false);
  };

  return (
    <div className="flex h-full flex-col bg-surface-sunken text-zinc-100">
      <header className="flex items-center gap-4 border-b border-border bg-surface px-6 py-3">
        <h1 className="text-lg font-bold tracking-tight">Vibe Kanban</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="project-select" className="text-sm text-muted-fg">Project</label>
          <select
            id="project-select"
            className="rounded-md border border-border bg-surface-sunken px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            value={selectedProjectId ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select a project…</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {projectsLoading && <span className="text-xs text-muted-fg">Loading projects…</span>}
        {projectsError && <span className="text-xs text-red-400">Failed to load projects</span>}

        <div className="ml-auto flex items-center gap-2">
          {showNewProject ? (
            <form onSubmit={handleCreateProject} className="flex items-center gap-2">
              <input
                autoFocus
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-40 rounded-md border border-border bg-surface-sunken px-3 py-1.5 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={createProject.isPending || !newProjectName.trim()}
                className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewProject(false);
                  setNewProjectName("");
                }}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-fg transition hover:text-zinc-200"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewProject(true)}
              className="rounded border border-border px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-surface-raised"
            >
              + New Project
            </button>
          )}
        </div>
      </header>

      {selectedProjectId && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-6 py-2">
          <input
            type="text"
            placeholder="Search tasks…"
            className="w-48 rounded-md border border-border bg-surface-sunken px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                  priorityFilter.includes(p)
                    ? priorityClass(p)
                    : "border border-border text-muted-fg hover:text-zinc-200"
                }`}
              >
                {priorityLabel(p)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {(["todo", "in_progress", "done"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                  statusFilter.includes(s)
                    ? "bg-accent/20 text-accent"
                    : "border border-border text-muted-fg hover:text-zinc-200"
                }`}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {agents?.map((a) => (
              <button
                key={a.id}
                onClick={() => toggleAgent(a.id)}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                  agentFilter.includes(a.id)
                    ? "bg-accent/20 text-accent"
                    : "border border-border text-muted-fg hover:text-zinc-200"
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {showAddColumn ? (
              <form onSubmit={handleCreateColumn} className="flex items-center gap-2">
                <input
                  autoFocus
                  placeholder="Column name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="w-32 rounded-md border border-border bg-surface-sunken px-2 py-1 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={!newColumnName.trim()}
                  className="rounded bg-accent px-2 py-1 text-[10px] font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddColumn(false);
                    setNewColumnName("");
                  }}
                  className="rounded border border-border px-2 py-1 text-[10px] text-muted-fg transition hover:text-zinc-200"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddColumn(true)}
                className="rounded border border-border px-2 py-1 text-[10px] font-medium text-zinc-200 transition hover:bg-surface-raised"
              >
                + Add Column
              </button>
            )}
            <div className="flex gap-1">
              {(["classic", "dense", "swimlanes"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold capitalize transition ${
                    viewMode === v
                      ? "bg-accent text-white"
                      : "border border-border text-muted-fg hover:text-zinc-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-4">
        {!selectedProjectId ? (
          <div className="flex h-full items-center justify-center text-muted-fg">Select a project to view the board.</div>
        ) : boardLoading ? (
          <div className="flex h-full items-center justify-center text-muted-fg">Loading board…</div>
        ) : boardError ? (
          <div className="flex h-full items-center justify-center text-red-400">Failed to load board.</div>
        ) : viewMode === "classic" ? (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4">
              {sortedColumns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={tasksByColumn.get(col.id) ?? []}
                  agentMap={agentMap}
                  projectId={selectedProjectId}
                  totalColumns={sortedColumns.length}
                  onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                />
              ))}
            </div>
          </DndContext>
        ) : viewMode === "dense" ? (
          <div className="flex h-full flex-col gap-4 overflow-y-auto">
            {sortedColumns.map((col) => {
              const colTasks = tasksByColumn.get(col.id) ?? [];
              const phase = computePhase(col.position, sortedColumns.length);
              return (
                <div key={col.id} className="rounded-xl border border-border bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-200">{col.name}</h3>
                    <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs font-medium text-muted-fg">{colTasks.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        agentColor={agentMap.get(task.assigned_agent_id ?? -1)}
                        phase={phase}
                        draggable={false}
                        onClick={() => setSelectedTaskId(task.id)}
                        onDelete={() => {
                          if (confirm(`Delete task "${task.title}"?`)) {
                            api.deleteTask(task.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "tasks"] });
                            });
                          }
                        }}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="py-2 text-xs text-muted-fg">No tasks</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col gap-2 overflow-y-auto">
            <div className="grid gap-2" style={{ gridTemplateColumns: `200px repeat(${sortedColumns.length}, 1fr)` }}>
              <div className="text-xs font-semibold uppercase text-muted-fg">Agent</div>
              {sortedColumns.map((col) => (
                <div key={col.id} className="text-xs font-semibold uppercase text-muted-fg">{col.name}</div>
              ))}
            </div>
            {(agents ?? []).concat({ id: -1, name: "Unassigned", color: undefined, system_prompt: undefined, created_at: "", skills: [] }).map((agent) => {
              const agentId = agent.id === -1 ? null : agent.id;
              const isUnassigned = agentId === null;
              return (
                <div key={agent.id} className="grid gap-2" style={{ gridTemplateColumns: `200px repeat(${sortedColumns.length}, 1fr)` }}>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: resolveAgentColor(agent.color) ?? "#a1a1aa" }}
                    />
                    <span className="text-sm font-medium text-zinc-200">{agent.name}</span>
                  </div>
                  {sortedColumns.map((col) => {
                    const phase = computePhase(col.position, sortedColumns.length);
                    const cellTasks = (tasksByColumn.get(col.id) ?? []).filter((t) =>
                      isUnassigned ? t.assigned_agent_id == null : t.assigned_agent_id === agentId
                    );
                    return (
                      <div key={col.id} className="rounded-md border border-border bg-surface p-2">
                        <div className="flex flex-col gap-2">
                          {cellTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              agentColor={agentMap.get(task.assigned_agent_id ?? -1)}
                              phase={phase}
                              draggable={false}
                              onClick={() => setSelectedTaskId(task.id)}
                              onDelete={() => {
                                if (confirm(`Delete task "${task.title}"?`)) {
                                  api.deleteTask(task.id).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "tasks"] });
                                  });
                                }
                              }}
                            />
                          ))}
                          {cellTasks.length === 0 && (
                            <div className="py-1 text-[10px] text-muted-fg">—</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <TaskDetail
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onDelete={(id) => {
          api.deleteTask(id).then(() => {
            queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "tasks"] });
          });
        }}
      />
    </div>
  );
}
