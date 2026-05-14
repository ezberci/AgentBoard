import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import { useTaskDetail, useUpdateTask, useAddComment } from "@/hooks/useTaskDetail";
import { useAgents } from "@/hooks/useAgents";
import { useModels } from "@/hooks/useModels";
import { useTaskRuns } from "@/hooks/useTaskRuns";
import { api } from "@/api/client";

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

function relativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useTaskDetail(taskId);
  const { data: agents } = useAgents();
  const { data: models } = useModels();
  const { data: runs } = useTaskRuns(taskId);
  const updateTask = useUpdateTask();
  const addComment = useAddComment();
  const drawerRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const runEndRef = useRef<HTMLDivElement>(null);

  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | "">("");
  const [runPrompt, setRunPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const activeRunId = taskId != null ? queryClient.getQueryData<number | null>(["active_run", taskId]) : null;
  const streamingOutput = activeRunId != null ? queryClient.getQueryData<string>(["run_tokens", activeRunId]) ?? "" : "";

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

  useEffect(() => {
    if (task?.comments && task.comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [task?.comments?.length]);

  useEffect(() => {
    if (streamingOutput) {
      runEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingOutput]);

  useEffect(() => {
    if (task) {
      setRunPrompt(task.description || task.title);
    }
  }, [task?.id]);

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

  const handleRunTask = async () => {
    if (!task || !selectedModelId) return;
    setIsRunning(true);
    try {
      await api.runTask(task.id, { model_id: Number(selectedModelId), prompt: runPrompt });
    } finally {
      setIsRunning(false);
    }
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
                    <div className="mt-2 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{task.description}</ReactMarkdown>
                    </div>
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
                    <div className="rounded-md border border-border bg-surface-sunken p-3 text-sm text-zinc-300 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{task.result}</ReactMarkdown>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-fg">
                    Run
                  </h4>
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedModelId}
                      onChange={(e) => setSelectedModelId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">Select model…</option>
                      {models?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={runPrompt}
                      onChange={(e) => setRunPrompt(e.target.value)}
                      rows={2}
                      className="resize-none rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleRunTask}
                        disabled={isRunning || !selectedModelId}
                        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {isRunning ? "Running…" : "Run"}
                      </button>
                    </div>
                    {activeRunId != null && streamingOutput && (
                      <div className="rounded-md border border-border bg-surface-sunken p-3 text-sm text-zinc-300 prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{streamingOutput}</ReactMarkdown>
                        <div ref={runEndRef} />
                      </div>
                    )}
                  </div>
                </div>

                {runs && runs.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-fg">
                      Run History
                    </h4>
                    <div className="flex flex-col gap-2">
                      {runs.map((run) => (
                        <div key={run.id} className="rounded-md border border-border bg-surface-sunken p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-semibold ${run.status === "completed" ? "text-green-400" : run.status === "failed" ? "text-red-400" : "text-amber-400"}`}>
                              {run.status}
                            </span>
                            <span className="text-muted-fg">{formatDate(run.started_at)}</span>
                          </div>
                          {run.output && (
                            <p className="mt-1 line-clamp-3 text-zinc-300">{run.output}</p>
                          )}
                          {run.error && (
                            <p className="mt-1 text-red-400">{run.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">
                    Comments
                  </h4>
                  <div className="relative flex flex-col gap-0">
                    {task.comments && task.comments.length > 0 && (
                      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                    )}
                    {task.comments?.map((comment) => (
                      <div key={comment.id} className="relative flex gap-3 py-2">
                        <div className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-zinc-200">
                              {comment.author}
                            </span>
                            <span className="text-[10px] text-muted-fg" title={formatDate(comment.created_at)}>
                              {relativeTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-zinc-300 whitespace-pre-wrap">{comment.body}</p>
                        </div>
                      </div>
                    ))}
                    {(!task.comments || task.comments.length === 0) && (
                      <div className="text-xs text-muted-fg">No comments yet.</div>
                    )}
                    <div ref={commentsEndRef} />
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
