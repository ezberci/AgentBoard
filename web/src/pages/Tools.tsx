import { useState } from "react";
import {
  useTools,
  useCreateTool,
  useUpdateTool,
  useDeleteTool,
} from "@/hooks/useAgents";
import type { Tool } from "@/types";

export function Tools() {
  const { data: tools, isLoading } = useTools();
  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const deleteTool = useDeleteTool();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [handlerKey, setHandlerKey] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHandlerKey, setEditHandlerKey] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !handlerKey.trim()) return;
    createTool.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        handler_key: handlerKey.trim(),
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setHandlerKey("");
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteTool.mutate(id);
    setConfirmDelete(null);
  };

  const startEdit = (tool: Tool) => {
    setEditingId(tool.id);
    setEditName(tool.name);
    setEditDescription(tool.description ?? "");
    setEditHandlerKey(tool.handler_key);
    setEditEnabled(tool.is_enabled);
    setConfirmDelete(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditHandlerKey("");
    setEditEnabled(true);
  };

  const handleUpdate = (e: React.FormEvent, id: number) => {
    e.preventDefault();
    if (!editName.trim() || !editHandlerKey.trim()) return;
    updateTool.mutate(
      {
        id,
        payload: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          handler_key: editHandlerKey.trim(),
          is_enabled: editEnabled,
        },
      },
      {
        onSuccess: () => {
          cancelEdit();
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="mb-6 text-3xl font-bold text-zinc-100">Tools</h2>

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-border bg-surface p-4"
      >
        <h3 className="mb-3 text-base font-semibold text-zinc-200">Create Tool</h3>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Name"
            className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Handler key (e.g. read, shell)"
            className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={handlerKey}
            onChange={(e) => setHandlerKey(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {createTool.isError && (
            <p className="text-sm text-red-400">
              {createTool.error instanceof Error ? createTool.error.message : "Failed to create tool"}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-2.5 text-base font-medium text-white hover:opacity-90 disabled:opacity-50"
              disabled={createTool.isPending}
            >
              Create
            </button>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div className="text-base text-muted-fg">Loading tools…</div>
      ) : (
        <div className="flex flex-col gap-4">
          {tools?.map((tool) => (
            <div
              key={tool.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              {editingId === tool.id ? (
                <form onSubmit={(e) => handleUpdate(e, tool.id)} className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Handler key"
                    className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                    value={editHandlerKey}
                    onChange={(e) => setEditHandlerKey(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      checked={editEnabled}
                      onChange={(e) => setEditEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-border bg-surface-sunken"
                    />
                    Enabled
                  </label>
                  {updateTool.isError && (
                    <p className="text-sm text-red-400">
                      {updateTool.error instanceof Error ? updateTool.error.message : "Failed to update tool"}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-border px-5 py-2.5 text-base font-medium text-zinc-300 hover:bg-surface-raised"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-accent px-5 py-2.5 text-base font-medium text-white hover:opacity-90 disabled:opacity-50"
                      disabled={updateTool.isPending}
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-zinc-100">{tool.name}</h3>
                      {!tool.is_enabled && (
                        <span className="rounded bg-surface-sunken px-2 py-0.5 text-xs text-muted-fg">
                          disabled
                        </span>
                      )}
                    </div>
                    {tool.description && (
                      <p className="mt-1 text-sm text-muted-fg">{tool.description}</p>
                    )}
                    <p className="mt-1 text-sm font-mono text-zinc-400">{tool.handler_key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(tool)}
                      className="rounded-md border border-border px-4 py-2 text-base font-medium text-zinc-300 hover:bg-surface-raised"
                    >
                      Edit
                    </button>
                    {confirmDelete === tool.id ? (
                      <>
                        <span className="text-sm text-red-400">Are you sure?</span>
                        <button
                          onClick={() => handleDelete(tool.id)}
                          className="rounded-md bg-red-500 px-4 py-2 text-base font-medium text-white hover:opacity-90"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-md border border-border px-4 py-2 text-base font-medium text-zinc-300 hover:bg-surface-raised"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(tool.id)}
                        className="rounded-md border border-border px-4 py-2 text-base font-medium text-red-400 hover:bg-surface-raised"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!tools || tools.length === 0) && (
            <div className="text-center text-base text-muted-fg">No tools yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
