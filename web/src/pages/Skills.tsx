import { useState } from "react";
import { useSkills, useCreateSkill, useDeleteSkill } from "@/hooks/useAgents";

export function Skills() {
  const { data: skills, isLoading } = useSkills();
  const createSkill = useCreateSkill();
  const deleteSkill = useDeleteSkill();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [allowedTools, setAllowedTools] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const tools = allowedTools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    createSkill.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        allowed_tools: tools.length > 0 ? tools : undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setInstructions("");
          setAllowedTools("");
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteSkill.mutate(id);
    setConfirmDelete(null);
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="mb-6 text-3xl font-bold text-zinc-100">Skills</h2>

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-border bg-surface p-4"
      >
        <h3 className="mb-3 text-base font-semibold text-zinc-200">Create Skill</h3>
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
            placeholder="Description (optional)"
            className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="text"
            placeholder="Instructions (optional)"
            className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <input
            type="text"
            placeholder="Allowed tools, comma-separated (optional)"
            className="rounded-md border border-border bg-surface-sunken px-4 py-2.5 text-base text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={allowedTools}
            onChange={(e) => setAllowedTools(e.target.value)}
          />
          {createSkill.isError && (
            <p className="text-sm text-red-400">
              {createSkill.error instanceof Error ? createSkill.error.message : "Failed to create skill"}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-accent px-5 py-2.5 text-base font-medium text-white hover:opacity-90 disabled:opacity-50"
              disabled={createSkill.isPending}
            >
              Create
            </button>
          </div>
        </div>
      </form>

      {isLoading ? (
        <div className="text-base text-muted-fg">Loading skills…</div>
      ) : (
        <div className="flex flex-col gap-4">
          {skills?.map((skill) => (
            <div
              key={skill.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-100">{skill.name}</h3>
                  {skill.description && (
                    <p className="mt-1 text-sm text-muted-fg">{skill.description}</p>
                  )}
                  {skill.instructions && (
                    <p className="mt-1 text-sm text-zinc-400">{skill.instructions}</p>
                  )}
                  {Array.isArray(skill.allowed_tools) && skill.allowed_tools.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(skill.allowed_tools as unknown[]).map((tool: unknown, i: number) => (
                        <span
                          key={i}
                          className="rounded bg-surface-sunken px-2.5 py-0.5 text-sm font-mono text-muted-fg"
                        >
                          {String(tool)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {confirmDelete === skill.id ? (
                    <>
                      <span className="text-sm text-red-400">Are you sure?</span>
                      <button
                        onClick={() => handleDelete(skill.id)}
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
                      onClick={() => setConfirmDelete(skill.id)}
                      className="rounded-md border border-border px-4 py-2 text-base font-medium text-red-400 hover:bg-surface-raised"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(!skills || skills.length === 0) && (
            <div className="text-center text-base text-muted-fg">No skills yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
