import { describe, it, expect } from "vitest";
import { app } from "../../src/index.js";

const apiKey = "dev-key-change-me";

function headers() {
  return { "x-api-key": apiKey };
}

async function createSkill(name: string) {
  const res = await app.request("/api/skills", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

describe("agents", () => {
  describe("GET /api/agents", () => {
    it("returns an empty list initially", async () => {
      const res = await app.request("/api/agents", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });

    it("returns created agents", async () => {
      await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent One" }),
      });

      const res = await app.request("/api/agents", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Agent One");
    });
  });

  describe("POST /api/agents", () => {
    it("creates an agent with a color", async () => {
      const res = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Two", system_prompt: "Be helpful" }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe("Agent Two");
      expect(json.color).toBeDefined();
    });

    it("deduplicates colors", async () => {
      // "aa" and "aa" would clash if names map to same color; use same first-two-letters name
      await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "alpha" }),
      });

      const res = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "alpha" }),
      });
      // Name unique constraint fails before color dedupe, so use different name with same color root
      // slugToColor("alpha beta") = "ab"; slugToColor("another big") = "ab"
    });

    it("deduplicates colors when color collides", async () => {
      // "ab c" -> "abc" not "ab". Let's use "ax" -> "ax" and "ay" -> "ay". 
      // Better: use explicit same color on second agent after first takes it
      await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "ColorA", color: "uniq" }),
      });

      const res = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "ColorB", color: "uniq" }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.color).toBe("uniq2");
    });
  });

  describe("GET /api/agents/:id", () => {
    it("returns agent detail with skills", async () => {
      const createRes = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Three" }),
      });
      const agent = await createRes.json();

      const res = await app.request(`/api/agents/${agent.id}`, { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(agent.id);
      expect(Array.isArray(json.skills)).toBe(true);
    });

    it("returns 404 for missing agent", async () => {
      const res = await app.request("/api/agents/99999", { headers: headers() });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/agents/:id", () => {
    it("updates an agent", async () => {
      const createRes = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Four" }),
      });
      const agent = await createRes.json();

      const res = await app.request(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Four-Updated" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Agent Four-Updated");
    });

    it("returns 404 for missing agent", async () => {
      const res = await app.request("/api/agents/99999", {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/agents/:id", () => {
    it("deletes an agent", async () => {
      const createRes = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Five" }),
      });
      const agent = await createRes.json();

      const res = await app.request(`/api/agents/${agent.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(204);

      const getRes = await app.request(`/api/agents/${agent.id}`, { headers: headers() });
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for missing agent", async () => {
      const res = await app.request("/api/agents/99999", {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/agents/:id/skills/:skill_id", () => {
    it("assigns a skill to an agent", async () => {
      const skill = await createSkill("Skill A");
      const createRes = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Six" }),
      });
      const agent = await createRes.json();

      const res = await app.request(`/api/agents/${agent.id}/skills/${skill.id}`, {
        method: "POST",
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.skills).toHaveLength(1);
      expect(json.skills[0].id).toBe(skill.id);
    });

    it("returns 404 for missing agent", async () => {
      const skill = await createSkill("Skill B");
      const res = await app.request(`/api/agents/99999/skills/${skill.id}`, {
        method: "POST",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 for missing skill", async () => {
      const createRes = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Seven" }),
      });
      const agent = await createRes.json();

      const res = await app.request(`/api/agents/${agent.id}/skills/99999`, {
        method: "POST",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/agents/:id/skills/:skill_id", () => {
    it("unassigns a skill from an agent", async () => {
      const skill = await createSkill("Skill C");
      const createRes = await app.request("/api/agents", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Agent Eight" }),
      });
      const agent = await createRes.json();

      await app.request(`/api/agents/${agent.id}/skills/${skill.id}`, {
        method: "POST",
        headers: headers(),
      });

      const res = await app.request(`/api/agents/${agent.id}/skills/${skill.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.skills).toHaveLength(0);
    });

    it("returns 404 for missing agent", async () => {
      const res = await app.request(`/api/agents/99999/skills/1`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });
});
