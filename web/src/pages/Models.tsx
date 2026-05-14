import { useState } from "react";
import { useModels, useCreateModel, useUpdateModel, useDeleteModel, useModelsHealth } from "@/hooks/useModels";
import type { Model } from "@/types";

export function Models() {
  const { data: models, isLoading } = useModels();
  const { data: health } = useModelsHealth();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();

  const [form, setForm] = useState({
    name: "",
    provider: "deepseek",
    model_id: "",
    api_key_env: "",
    base_url: "",
    is_enabled: true,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.model_id || !form.api_key_env) return;
    const payload = {
      ...form,
      base_url: form.base_url || undefined,
    };
    if (editingId != null) {
      updateModel.mutate({ id: editingId, payload });
      setEditingId(null);
    } else {
      createModel.mutate(payload);
    }
    setForm({ name: "", provider: "deepseek", model_id: "", api_key_env: "", base_url: "", is_enabled: true });
  };

  const startEdit = (model: Model) => {
    setEditingId(model.id);
    setForm({
      name: model.name,
      provider: model.provider,
      model_id: model.model_id,
      api_key_env: model.api_key_env,
      base_url: model.base_url ?? "",
      is_enabled: model.is_enabled,
    });
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold text-zinc-100">Models</h2>

      {health && health.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {health.map((h) => (
            <span
              key={h.id}
              className={`rounded px-2.5 py-1 text-sm font-medium ${h.env_present ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
            >
              {h.env_var}: {h.env_present ? "set" : "missing"}
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Name"
          className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Provider"
          className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Model ID"
          className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
          value={form.model_id}
          onChange={(e) => setForm({ ...form, model_id: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="API Key Env Var"
          className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
          value={form.api_key_env}
          onChange={(e) => setForm({ ...form, api_key_env: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Base URL (optional)"
          className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
          value={form.base_url}
          onChange={(e) => setForm({ ...form, base_url: e.target.value })}
        />
        <label className="flex items-center gap-2 text-base text-zinc-100">
          <input
            type="checkbox"
            checked={form.is_enabled}
            onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
          />
          Enabled
        </label>
        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-2.5 text-base font-medium text-white hover:opacity-90"
        >
          {editingId != null ? "Update" : "Add"}
        </button>
        {editingId != null && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({ name: "", provider: "deepseek", model_id: "", api_key_env: "", base_url: "", is_enabled: true });
            }}
            className="rounded-md border border-border px-4 py-2 text-base text-zinc-100 hover:bg-surface-raised"
          >
            Cancel
          </button>
        )}
      </form>

      {isLoading ? (
        <div className="text-base text-muted-fg">Loading…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {models?.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface p-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-medium text-zinc-100">{model.name}</span>
                <span className="text-sm text-muted-fg">
                  {model.provider} · {model.model_id} · {model.api_key_env}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2.5 py-1 text-sm font-semibold ${
                    model.is_enabled ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"
                  }`}
                >
                  {model.is_enabled ? "ON" : "OFF"}
                </span>
                <button
                  onClick={() => startEdit(model)}
                  className="rounded-md px-3 py-1.5 text-sm text-zinc-100 hover:bg-surface-raised"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete model "${model.name}"?`)) {
                      deleteModel.mutate(model.id);
                    }
                  }}
                  className="rounded-md px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {(!models || models.length === 0) && (
            <div className="text-base text-muted-fg">No models registered.</div>
          )}
        </div>
      )}
    </div>
  );
}
