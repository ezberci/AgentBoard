import { describe, it, expect } from "vitest";
import { app } from "../../src/index.js";

const apiKey = "dev-key-change-me";

function headers() {
  return { "x-api-key": apiKey };
}

describe("projects", () => {
  describe("GET /api/projects", () => {
    it("returns an empty list initially", async () => {
      const res = await app.request("/api/projects", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });

    it("returns created projects", async () => {
      await app.request("/api/projects", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Alpha" }),
      });

      const res = await app.request("/api/projects", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Alpha");
    });
  });

  describe("POST /api/projects", () => {
    it("creates a project with a slug", async () => {
      const res = await app.request("/api/projects", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Beta", description: "desc" }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe("Beta");
      expect(json.slug).toBe("beta");
      expect(json.description).toBe("desc");
    });

    it("deduplicates slugs", async () => {
      await app.request("/api/projects", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Gamma" }),
      });

      const res = await app.request("/api/projects", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Gamma" }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.slug).toBe("gamma2");
    });
  });

  describe("GET /api/projects/:id", () => {
    it("returns a project", async () => {
      const createRes = await app.request("/api/projects", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Delta" }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/projects/${created.id}`, { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(created.id);
      expect(json.name).toBe("Delta");
    });

    it("returns 404 for missing project", async () => {
      const res = await app.request("/api/projects/99999", { headers: headers() });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Project not found");
    });
  });

  describe("PATCH /api/projects/:id", () => {
    it("updates a project", async () => {
      const createRes = await app.request("/api/projects", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Epsilon" }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/projects/${created.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Epsilon-Updated" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Epsilon-Updated");
      expect(json.slug).toBe("epsilon-updated");
    });

    it("returns 404 for missing project", async () => {
      const res = await app.request("/api/projects/99999", {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/projects/:id", () => {
    it("deletes a project", async () => {
      const createRes = await app.request("/api/projects", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Zeta" }),
      });
      const created = await createRes.json();

      const res = await app.request(`/api/projects/${created.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(204);

      const getRes = await app.request(`/api/projects/${created.id}`, { headers: headers() });
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for missing project", async () => {
      const res = await app.request("/api/projects/99999", {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });
});
