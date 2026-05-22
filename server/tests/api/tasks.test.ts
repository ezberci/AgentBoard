import { describe, it, expect } from "vitest";
import { app } from "../../src/index.js";

const apiKey = "dev-key-change-me";

function headers() {
  return { "x-api-key": apiKey };
}

async function createProject(name: string) {
  const res = await app.request("/api/projects", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

async function createColumn(projectId: number, name: string, position = 0) {
  const res = await app.request(`/api/projects/${projectId}/columns`, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ name, position }),
  });
  return res.json();
}

describe("tasks", () => {
  describe("GET /api/projects/:id/tasks", () => {
    it("returns tasks for a project", async () => {
      const project = await createProject("TaskProj");
      await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Task A" }),
      });

      const res = await app.request(`/api/projects/${project.id}/tasks`, { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].title).toBe("Task A");
    });

    it("returns 404 for missing project", async () => {
      const res = await app.request("/api/projects/99999/tasks", { headers: headers() });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tasks", () => {
    it("creates a task", async () => {
      const project = await createProject("TaskProj2");
      const res = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Task B", description: "desc" }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.title).toBe("Task B");
      expect(json.project_id).toBe(project.id);
      expect(json.version).toBe(1);
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("returns task detail with status", async () => {
      const project = await createProject("TaskProj3");
      const createRes = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Task C" }),
      });
      const task = await createRes.json();

      const res = await app.request(`/api/tasks/${task.id}`, { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(task.id);
      expect(json.status).toBeDefined();
      expect(["todo", "in_progress", "done"]).toContain(json.status);
    });

    it("returns 404 for missing task", async () => {
      const res = await app.request("/api/tasks/99999", { headers: headers() });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/tasks/:id", () => {
    it("updates a task", async () => {
      const project = await createProject("TaskProj4");
      const createRes = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Old Title" }),
      });
      const task = await createRes.json();

      const res = await app.request(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ title: "New Title" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe("New Title");
      expect(json.version).toBe(2);
    });

    it("returns 409 on version mismatch", async () => {
      const project = await createProject("TaskProj5");
      const createRes = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Conflict Task" }),
      });
      const task = await createRes.json();

      const res = await app.request(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ title: "X", expected_version: task.version - 1 }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Task was modified by another client");
    });

    it("returns 404 for missing task", async () => {
      const res = await app.request("/api/tasks/99999", {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ title: "X" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("deletes a task", async () => {
      const project = await createProject("TaskProj6");
      const createRes = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Delete Me" }),
      });
      const task = await createRes.json();

      const res = await app.request(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(204);
    });

    it("returns 404 for missing task", async () => {
      const res = await app.request("/api/tasks/99999", {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tasks/:id/move", () => {
    it("moves a task to a column", async () => {
      const project = await createProject("TaskProj7");
      const col = await createColumn(project.id, "Next", 0);
      const createRes = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Move Me" }),
      });
      const task = await createRes.json();

      const res = await app.request(`/api/tasks/${task.id}/move`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ column_id: col.id }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.column_id).toBe(col.id);
    });

    it("returns 409 on version mismatch", async () => {
      const project = await createProject("TaskProj8");
      const col = await createColumn(project.id, "Next2", 0);
      const createRes = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Conflict Move" }),
      });
      const task = await createRes.json();

      const res = await app.request(`/api/tasks/${task.id}/move`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ column_id: col.id, expected_version: task.version - 1 }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Task was modified by another client");
    });

    it("returns 404 for missing task", async () => {
      const res = await app.request("/api/tasks/99999/move", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ column_id: 1 }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tasks/:id/comments", () => {
    it("adds a comment to a task", async () => {
      const project = await createProject("TaskProj9");
      const createRes = await app.request("/api/tasks", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ project_id: project.id, title: "Comment Task" }),
      });
      const task = await createRes.json();

      const res = await app.request(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ author: "Alice", body: "Nice work" }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.author).toBe("Alice");
      expect(json.body).toBe("Nice work");
      expect(json.task_id).toBe(task.id);
    });

    it("returns 404 for missing task", async () => {
      const res = await app.request("/api/tasks/99999/comments", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ author: "Alice", body: "Nice work" }),
      });
      expect(res.status).toBe(404);
    });
  });
});
