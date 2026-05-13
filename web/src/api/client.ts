import type { Project, Column, Task, Agent, Skill, TaskComment } from "@/types";

const BASE_URL = "http://localhost:8765/api";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  getProjects: () => fetchJson<Project[]>("/projects"),
  getProject: (id: number) => fetchJson<Project>(`/projects/${id}`),
  createProject: (payload: { name: string; description?: string }) =>
    fetchJson<Project>("/projects", { method: "POST", body: JSON.stringify(payload) }),
  updateProject: (id: number, payload: { name?: string; description?: string }) =>
    fetchJson<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProject: (id: number) => fetchJson<void>(`/projects/${id}`, { method: "DELETE" }),

  getColumns: (projectId: number) => fetchJson<Column[]>(`/projects/${projectId}/columns`),
  createColumn: (projectId: number, payload: { name: string; position?: number; is_terminal?: boolean }) =>
    fetchJson<Column>(`/projects/${projectId}/columns`, { method: "POST", body: JSON.stringify(payload) }),
  updateColumn: (id: number, payload: { name?: string; position?: number; is_terminal?: boolean }) =>
    fetchJson<Column>(`/columns/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteColumn: (id: number) => fetchJson<void>(`/columns/${id}`, { method: "DELETE" }),

  getTasks: (projectId: number) => fetchJson<Task[]>(`/projects/${projectId}/tasks`),
  createTask: (payload: {
    project_id: number;
    column_id: number;
    title: string;
    description?: string;
    priority?: number;
  }) => fetchJson<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  getTask: (id: number) => fetchJson<Task & { comments: TaskComment[] }>(`/tasks/${id}`),
  updateTask: (id: number, payload: Partial<Task> & { expected_version?: number }) =>
    fetchJson<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTask: (id: number) => fetchJson<void>(`/tasks/${id}`, { method: "DELETE" }),
  moveTask: (id: number, payload: { column_id: number; expected_version?: number }) =>
    fetchJson<Task>(`/tasks/${id}/move`, { method: "POST", body: JSON.stringify(payload) }),
  addComment: (id: number, payload: { author: string; body: string }) =>
    fetchJson<TaskComment>(`/tasks/${id}/comments`, { method: "POST", body: JSON.stringify(payload) }),

  getAgents: () => fetchJson<Agent[]>("/agents"),
  getAgent: (id: number) => fetchJson<Agent>(`/agents/${id}`),
  createAgent: (payload: { name: string; system_prompt?: string; color?: string }) =>
    fetchJson<Agent>("/agents", { method: "POST", body: JSON.stringify(payload) }),
  updateAgent: (id: number, payload: { name?: string; system_prompt?: string; color?: string }) =>
    fetchJson<Agent>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAgent: (id: number) => fetchJson<void>(`/agents/${id}`, { method: "DELETE" }),
  assignSkill: (agentId: number, skillId: number) =>
    fetchJson<Agent>(`/agents/${agentId}/skills/${skillId}`, { method: "POST" }),
  removeSkill: (agentId: number, skillId: number) =>
    fetchJson<void>(`/agents/${agentId}/skills/${skillId}`, { method: "DELETE" }),

  getSkills: () => fetchJson<Skill[]>("/skills"),
  getSkill: (id: number) => fetchJson<Skill>(`/skills/${id}`),
  createSkill: (payload: { name: string; description?: string; instructions?: string; allowed_tools?: unknown[] }) =>
    fetchJson<Skill>("/skills", { method: "POST", body: JSON.stringify(payload) }),
  updateSkill: (id: number, payload: { name?: string; description?: string; instructions?: string; allowed_tools?: unknown[] }) =>
    fetchJson<Skill>(`/skills/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSkill: (id: number) => fetchJson<void>(`/skills/${id}`, { method: "DELETE" }),

  health: () => fetchJson<{ status: string }>("/health"),
};
