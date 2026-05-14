import { useState, useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Column as ColumnType, Task } from "@/types";
import { TaskCard } from "./TaskCard";
import { api } from "@/api/client";
import { computePhase } from "@/lib/phase";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  agentMap: Map<number, string>;
  totalColumns: number;
  projectId: number;
  onTaskClick?: (taskId: number) => void;
}

export function Column({ column, tasks, agentMap, totalColumns, projectId, onTaskClick }: ColumnProps) {
  const queryClient = useQueryClient();
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { column },
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState(2);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowMenu(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu]);

  const createTask = useMutation({
    mutationFn: (payload: { project_id: number; column_id: number; title: string; priority: number }) =>
      api.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
      setIsAdding(false);
      setNewTitle("");
      setNewPriority(2);
    },
  });

  const updateColumn = useMutation({
    mutationFn: (payload: { name: string }) => api.updateColumn(column.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "columns"] });
      setIsEditingName(false);
    },
  });

  const deleteColumn = useMutation({
    mutationFn: () => api.deleteColumn(column.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "columns"] });
    },
  });

  const phase = computePhase(column.position, totalColumns);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTask.mutate({
      project_id: projectId,
      column_id: column.id,
      title: newTitle.trim(),
      priority: newPriority,
    });
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || editName.trim() === column.name) {
      setIsEditingName(false);
      setEditName(column.name);
      return;
    }
    updateColumn.mutate({ name: editName.trim() });
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-surface p-3 transition ${
        isOver ? "border-accent ring-1 ring-accent" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        {isEditingName ? (
          <form onSubmit={handleRenameSubmit} className="flex-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              className="w-full rounded-md border border-border bg-surface-sunken px-2 py-1 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            />
          </form>
        ) : (
          <h3
            className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-zinc-100"
            onClick={() => {
              setEditName(column.name);
              setIsEditingName(true);
            }}
            title="Click to rename"
          >
            {column.name}
          </h3>
        )}
        <div className="flex items-center gap-2">
          <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs font-medium text-muted-fg">
            {tasks.length}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="rounded px-1 text-xs text-muted-fg hover:text-zinc-200"
              title="Column actions"
            >
              ⋮
            </button>
            {showMenu && (
              <div ref={menuRef} className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-border bg-surface shadow-lg">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setShowMenu(false);
                    setEditName(column.name);
                    setIsEditingName(true);
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-surface-raised"
                >
                  Rename
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm(`Delete column "${column.name}"?`)) {
                      deleteColumn.mutate();
                    }
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-surface-raised"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            agentColor={agentMap.get(task.assigned_agent_id ?? -1)}
            phase={phase}
            onClick={() => onTaskClick?.(task.id)}
            onDelete={() => {
              if (confirm(`Delete task "${task.title}"?`)) {
                api.deleteTask(task.id)
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] });
                  })
                  .catch((err: Error) => {
                    console.error("Failed to delete task:", err);
                    alert(`Failed to delete task: ${err.message}`);
                  });
              }
            }}
          />
        ))}
      </div>

      {isAdding ? (
        <form onSubmit={handleAddSubmit} className="mt-2 rounded-lg border border-border bg-surface-raised p-2">
          <input
            autoFocus
            placeholder="Task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="mb-2 w-full rounded-md border border-border bg-surface-sunken px-2 py-1.5 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="mb-2 flex gap-1">
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNewPriority(p)}
                className={`flex-1 rounded px-2 py-1 text-[10px] font-semibold uppercase ${
                  newPriority === p
                    ? p === 1
                      ? "bg-red-500/30 text-red-400"
                      : p === 2
                      ? "bg-amber-500/30 text-amber-400"
                      : p === 3
                      ? "bg-blue-500/30 text-blue-400"
                      : "bg-zinc-500/30 text-zinc-400"
                    : "border border-border text-muted-fg hover:text-zinc-200"
                }`}
              >
                P{p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createTask.isPending || !newTitle.trim()}
              className="rounded bg-accent px-3 py-1 text-xs font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTitle("");
                setNewPriority(2);
              }}
              className="rounded border border-border px-3 py-1 text-xs text-muted-fg transition hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-fg transition hover:border-zinc-600 hover:text-zinc-300"
        >
          <span className="text-sm leading-none">+</span> Add task
        </button>
      )}
    </div>
  );
}
