import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";
import { resolveAgentColor } from "@/lib/agentColors";
import { priorityClass, priorityLabel } from "@/lib/priority";

interface TaskCardProps {
  task: Task;
  agentColor?: string;
  phase?: 1 | 2 | 3 | 4;
  draggable?: boolean;
  onClick?: () => void;
  onFocus?: () => void;
  onDelete?: () => void;
}

function PhaseRibbon({ phase }: { phase?: 1 | 2 | 3 | 4 }) {
  if (!phase) return null;
  return (
    <div className="mt-2 flex gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full ${
            i <= phase ? "bg-accent" : "bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}

export function TaskCard({ task, agentColor, phase, draggable = true, onClick, onFocus, onDelete }: TaskCardProps) {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggable ? `task-${task.id}` : `static-task-${task.id}`,
    data: { task },
    disabled: !draggable,
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
      {...(draggable ? { ...listeners, ...attributes } : {})}
      data-task-id={task.id}
      tabIndex={0}
      role="button"
      onFocus={onFocus}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          e.preventDefault();
          onClick?.();
        }
        if (e.key === "Delete" && onDelete) {
          e.stopPropagation();
          onDelete();
        }
      }}
      onClick={onClick}
      className="group relative rounded-lg border border-border bg-surface-raised p-4 shadow-sm transition hover:shadow-md cursor-pointer outline-none focus:ring-2 focus:ring-accent"
    >
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={`absolute right-2 top-2 rounded p-1 text-xs text-red-400 transition hover:bg-red-500/20 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
          title="Delete task"
          aria-label="Delete task"
        >
          <span className="text-base">🗑</span>
        </button>
      )}
      <div className="flex items-start justify-between gap-2 pr-6">
        <h4 className="text-base font-medium text-zinc-100">{task.title}</h4>
        <span
          className={`shrink-0 rounded px-2.5 py-1 text-sm font-semibold uppercase tracking-wide ${priorityClass(task.priority)}`}
        >
          {priorityLabel(task.priority)}
        </span>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-fg">{task.description}</p>
      )}
      <PhaseRibbon phase={phase} />
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
