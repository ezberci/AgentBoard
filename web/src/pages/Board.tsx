import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import { useBoard } from "@/hooks/useBoard";
import { Column } from "@/components/Column";
import { api } from "@/api/client";

export function Board() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading: projectsLoading, isError: projectsError } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { columns, tasks, isLoading: boardLoading, isError: boardError } = useBoard(selectedProjectId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const tasksByColumn = new Map<number, typeof tasks>();
  for (const col of columns) {
    tasksByColumn.set(col.id, []);
  }
  for (const task of tasks) {
    const list = tasksByColumn.get(task.column_id);
    if (list) {
      list.push(task);
    }
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

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

    // Optimistic update
    queryClient.setQueryData(
      ["projects", selectedProjectId, "tasks"],
      (old: typeof tasks | undefined) => {
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
      if (err instanceof Error && err.message.includes("409")) {
        queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "tasks"] });
        queryClient.invalidateQueries({ queryKey: ["projects", selectedProjectId, "columns"] });
      }
    }
  };

  return (
    <div className="flex h-screen flex-col bg-surface-sunken text-zinc-100">
      <header className="flex items-center gap-4 border-b border-border bg-surface px-6 py-3">
        <h1 className="text-lg font-bold tracking-tight">Vibe Kanban</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="project-select" className="text-sm text-muted-fg">
            Project
          </label>
          <select
            id="project-select"
            className="rounded-md border border-border bg-surface-sunken px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            value={selectedProjectId ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select a project…</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {projectsLoading && <span className="text-xs text-muted-fg">Loading projects…</span>}
        {projectsError && <span className="text-xs text-red-400">Failed to load projects</span>}
      </header>

      <main className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-4">
        {!selectedProjectId ? (
          <div className="flex h-full items-center justify-center text-muted-fg">
            Select a project to view the board.
          </div>
        ) : boardLoading ? (
          <div className="flex h-full items-center justify-center text-muted-fg">Loading board…</div>
        ) : boardError ? (
          <div className="flex h-full items-center justify-center text-red-400">Failed to load board.</div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4">
              {sortedColumns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={tasksByColumn.get(col.id) ?? []}
                  agentMap={new Map()}
                />
              ))}
            </div>
          </DndContext>
        )}
      </main>
    </div>
  );
}
