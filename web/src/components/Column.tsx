import type { Column as ColumnType, Task } from "@/types";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  agentMap: Map<number, string>;
}

export function Column({ column, tasks, agentMap }: ColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{column.name}</h3>
        <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs font-medium text-muted-fg">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} agentColor={agentMap.get(task.assigned_agent_id ?? -1)} />
        ))}
      </div>
    </div>
  );
}
