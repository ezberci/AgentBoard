import { useEffect, useRef, useState } from "react";
import { useTaskDetail, useUpdateTask, useAddComment } from "@/hooks/useTaskDetail";
import { useAgents } from "@/hooks/useAgents";


interface TaskDetailProps {
  taskId: number | null;
  onClose: () => void;
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

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { data: task, isLoading } = useTaskDetail(taskId);
  const { data: agents } = useAgents();
  const updateTask = useUpdateTask();
  const addComment = useAddComment();
  const drawerRef = useRef<HTMLDivElement>(null);

  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (taskId !== null) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [taskId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAssignAgent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const assigned_agent_id = value ? Number(value) : undefined;
    if (task) {
      updateTask.mutate({
        id: task.id,
        payload: { assigned_agent_id, expected_version: task.version },
      });
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentAuthor.trim() || !commentBody.trim() || !task) return;
    addComment.mutate(
      {
        taskId: task.id,
        payload: { author: commentAuthor.trim(), body: commentBody.trim() },
      },
      {
        onSuccess: () => {
          setCommentBody("");
        },
      }
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        ref={drawerRef}
        className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-border bg-surface shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-bold text-zinc-100">Task Detail</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-fg hover:text-zinc-100"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading || !task ? (
              <div className="text-muted-fg">Loading…</div>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-zinc-100">{task.title}</h3>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${priorityClass(task.priority)}`}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{task.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-fg">
                      Assigned Agent
                    </label>
                    <select
                      value={task.assigned_agent_id ?? ""}
                      onChange={handleAssignAgent}
                      className="w-full rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">Unassigned</option>
                      {agents?.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-fg">
                      Claimed At
                    </label>
                    <div className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-300">
                      {formatDate(task.claimed_at)}
                    </div>
                  </div>
                </div>

                {task.result && (
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-fg">
                      Result
                    </h4>
                    <div className="rounded-md border border-border bg-surface-sunken p-3 text-sm text-zinc-300">
                      {task.result}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">
                    Comments
                  </h4>
                  <div className="flex flex-col gap-3">
                    {task.comments?.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg border border-border bg-surface-sunken p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-200">
                            {comment.author}
                          </span>
                          <span className="text-[10px] text-muted-fg">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-300">{comment.body}</p>
                      </div>
                    ))}
                    {(!task.comments || task.comments.length === 0) && (
                      <div className="text-xs text-muted-fg">No comments yet.</div>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="mt-4 flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Your name"
                      className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      required
                    />
                    <textarea
                      placeholder="Write a comment…"
                      rows={3}
                      className="resize-none rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addComment.isPending}
                        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Add Comment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
