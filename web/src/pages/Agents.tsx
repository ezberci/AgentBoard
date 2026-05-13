import { useState } from "react";
import {
  useAgents,
  useSkills,
  useCreateAgent,
  useDeleteAgent,
  useAssignSkill,
  useRemoveSkill,
} from "@/hooks/useAgents";
import type { Agent, Skill } from "@/types";

export function Agents() {
  const { data: agents, isLoading } = useAgents();
  const { data: skills } = useSkills();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const assignSkill = useAssignSkill();
  const removeSkill = useRemoveSkill();

  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createAgent.mutate({ name: name.trim(), system_prompt: systemPrompt.trim() || undefined });
    setName("");
    setSystemPrompt("");
  };

  const handleDelete = (id: number) => {
    deleteAgent.mutate(id);
    setConfirmDelete(null);
  };

  const toggleSkill = (agent: Agent, skill: Skill) => {
    const hasSkill = agent.skills.some((s) => s.id === skill.id);
    if (hasSkill) {
      removeSkill.mutate({ agentId: agent.id, skillId: skill.id });
    } else {
      assignSkill.mutate({ agentId: agent.id, skillId: skill.id });
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="mb-6 text-2xl font-bold text-zinc-100">Agents</h2>

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-border bg-surface p-4"
      >
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Create Agent</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Name"
            className="flex-1 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="System prompt (optional)"
            className="flex-1 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-accent"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            disabled={createAgent.isPending}
          >
            Create
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-muted-fg">Loading agents…</div>
      ) : (
        <div className="flex flex-col gap-4">
          {agents?.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-100">{agent.name}</h3>
                    {agent.color && (
                      <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-fg">
                        {agent.color}
                      </span>
                    )}
                  </div>
                  {agent.system_prompt && (
                    <p className="mt-1 text-xs text-muted-fg">{agent.system_prompt}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {confirmDelete === agent.id ? (
                    <>
                      <span className="text-xs text-red-400">Are you sure?</span>
                      <button
                        onClick={() => handleDelete(agent.id)}
                        className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-surface-raised"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(agent.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-surface-raised"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-fg">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skills?.map((skill) => {
                    const hasSkill = agent.skills.some((s) => s.id === skill.id);
                    return (
                      <button
                        key={skill.id}
                        onClick={() => toggleSkill(agent, skill)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          hasSkill
                            ? "bg-accent/20 text-accent ring-1 ring-accent"
                            : "border border-border bg-surface-sunken text-muted-fg hover:text-zinc-200"
                        }`}
                      >
                        {skill.name}
                      </button>
                    );
                  })}
                  {(!skills || skills.length === 0) && (
                    <span className="text-xs text-muted-fg">No skills available.</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(!agents || agents.length === 0) && (
            <div className="text-center text-sm text-muted-fg">No agents yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
