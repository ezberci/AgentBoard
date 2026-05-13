import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useBoard } from "@/hooks/useBoard";
import { Column } from "@/components/Column";

export function Board() {
  const { data: projects, isLoading: projectsLoading, isError: projectsError } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { columns, tasks, isLoading: boardLoading, isError: boardError } = useBoard(selectedProjectId);

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
        )}
      </main>
    </div>
  );
}
