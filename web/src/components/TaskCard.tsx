import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";
import { resolveAgentColor } from "@/lib/agentColors";

interface TaskCardProps {
  task: Task;
  agentColor?: string;
  onClick?: () => void;
  onFocus?: () => void;
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

export function TaskCard({ task, agentColor, onClick, onFocus }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const resolvedColor = resolveAgentColor(agentColor);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-task-id={task.id}
      tabIndex={0}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onClick?.();
        }
      }}
      onClick={onClick}
      className="rounded-lg border border-border bg-surface-raised p-3 shadow-sm transition hover:shadow-md cursor-pointer outline-none focus:ring-2 focus:ring-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-zinc-100">{task.title}</h4>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityClass(task.priority)}`}
        >
          {priorityLabel(task.priority)}
        </span>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-fg">{task.description}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {resolvedColor && (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: resolvedColor }}
            title="Assigned agent"
          />
        )}
        {task.assigned_agent_id && !resolvedColor && (
          <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" title="Assigned agent" />
        )}
      </div>
    </div>
  );
}
