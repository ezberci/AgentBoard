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

describe("columns", () => {
  describe("GET /api/projects/:id/columns", () => {
    it("returns columns for a project", async () => {
      const project = await createProject("ColProj");
      await app.request(`/api/projects/${project.id}/columns`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "To Do", position: 0 }),
      });

      const res = await app.request(`/api/projects/${project.id}/columns`, { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("To Do");
    });

    it("returns 404 for missing project", async () => {
      const res = await app.request("/api/projects/99999/columns", { headers: headers() });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/projects/:id/columns", () => {
    it("creates a column", async () => {
      const project = await createProject("ColProj2");
      const res = await app.request(`/api/projects/${project.id}/columns`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "In Progress", position: 1, is_terminal: false }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe("In Progress");
      expect(json.project_id).toBe(project.id);
    });

    it("returns 404 for missing project", async () => {
      const res = await app.request("/api/projects/99999/columns", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/columns/:id", () => {
    it("updates a column", async () => {
      const project = await createProject("ColProj3");
      const colRes = await app.request(`/api/projects/${project.id}/columns`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Old Name" }),
      });
      const column = await colRes.json();

      const res = await app.request(`/api/columns/${column.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("New Name");
    });

    it("returns 404 for missing column", async () => {
      const res = await app.request("/api/columns/99999", {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/columns/:id", () => {
    it("deletes a column", async () => {
      const project = await createProject("ColProj4");
      const colRes = await app.request(`/api/projects/${project.id}/columns`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Done" }),
      });
      const column = await colRes.json();

      const res = await app.request(`/api/columns/${column.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(204);
    });

    it("returns 404 for missing column", async () => {
      const res = await app.request("/api/columns/99999", {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/columns/:id/reorder", () => {
    it("reorders columns", async () => {
      const project = await createProject("ColProj5");
      const c1Res = await app.request(`/api/projects/${project.id}/columns`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "A", position: 0 }),
      });
      const c2Res = await app.request(`/api/projects/${project.id}/columns`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "B", position: 1 }),
      });
      const c1 = await c1Res.json();
      const c2 = await c2Res.json();

      const res = await app.request(`/api/columns/${c1.id}/reorder`, {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ positions: { [String(c1.id)]: 1, [String(c2.id)]: 0 } }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      const names = json.map((c: { name: string }) => c.name);
      expect(names).toEqual(["B", "A"]);
    });

    it("returns 404 for missing column", async () => {
      const res = await app.request("/api/columns/99999/reorder", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ positions: {} }),
      });
      expect(res.status).toBe(404);
    });
  });
});
