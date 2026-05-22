import { describe, it, expect } from "vitest";
import { app } from "../../src/index.js";

const apiKey = "dev-key-change-me";

function headers() {
  return { "x-api-key": apiKey };
}

describe("skills", () => {
  describe("GET /api/skills", () => {
    it("returns an empty list initially", async () => {
      const res = await app.request("/api/skills", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });

    it("returns created skills", async () => {
      await app.request("/api/skills", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Skill One" }),
      });

      const res = await app.request("/api/skills", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Skill One");
    });
  });

  describe("POST /api/skills", () => {
    it("creates a skill", async () => {
      const res = await app.request("/api/skills", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Skill Two", description: "desc", instructions: "inst", allowed_tools: "t1,t2" }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe("Skill Two");
      expect(json.description).toBe("desc");
      expect(json.instructions).toBe("inst");
      expect(json.allowed_tools).toBe("t1,t2");
    });
  });

  describe("GET /api/skills/:id", () => {
    it("returns a skill", async () => {
      const createRes = await app.request("/api/skills", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Skill Three" }),
      });
      const skill = await createRes.json();

      const res = await app.request(`/api/skills/${skill.id}`, { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(skill.id);
      expect(json.name).toBe("Skill Three");
    });

    it("returns 404 for missing skill", async () => {
      const res = await app.request("/api/skills/99999", { headers: headers() });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Skill not found");
    });
  });

  describe("PATCH /api/skills/:id", () => {
    it("updates a skill", async () => {
      const createRes = await app.request("/api/skills", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Skill Four" }),
      });
      const skill = await createRes.json();

      const res = await app.request(`/api/skills/${skill.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Skill Four-Updated" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Skill Four-Updated");
    });

    it("returns 404 for missing skill", async () => {
      const res = await app.request("/api/skills/99999", {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/skills/:id", () => {
    it("deletes a skill", async () => {
      const createRes = await app.request("/api/skills", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Skill Five" }),
      });
      const skill = await createRes.json();

      const res = await app.request(`/api/skills/${skill.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(204);

      const getRes = await app.request(`/api/skills/${skill.id}`, { headers: headers() });
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for missing skill", async () => {
      const res = await app.request("/api/skills/99999", {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });
});
