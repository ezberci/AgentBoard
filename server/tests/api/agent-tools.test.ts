import { describe, it, expect } from "vitest";
import { app } from "../../src/index.js";

const apiKey = "dev-key-change-me";

function headers() {
  return { "x-api-key": apiKey };
}

async function createAgent(name: string) {
  const res = await app.request("/api/agents", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

async function createTool(name: string) {
  const res = await app.request("/api/tools", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ name, handler_key: "stub" }),
  });
  return res.json();
}

describe("agent-tools", () => {
  describe("POST /api/agents/:id/tools/:toolId", () => {
    it("assigns a tool to an agent", async () => {
      const agent = await createAgent("Agent One");
      const tool = await createTool("Tool One");

      const res = await app.request(`/api/agents/${agent.id}/tools/${tool.id}`, {
        method: "POST",
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tools).toHaveLength(1);
      expect(json.tools[0].id).toBe(tool.id);
    });

    it("returns 404 for missing agent", async () => {
      const tool = await createTool("Tool Two");
      const res = await app.request(`/api/agents/99999/tools/${tool.id}`, {
        method: "POST",
        headers: headers(),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Agent not found");
    });

    it("returns 404 for missing tool", async () => {
      const agent = await createAgent("Agent Two");
      const res = await app.request(`/api/agents/${agent.id}/tools/99999`, {
        method: "POST",
        headers: headers(),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Tool not found");
    });
  });

  describe("DELETE /api/agents/:id/tools/:toolId", () => {
    it("unassigns a tool from an agent", async () => {
      const agent = await createAgent("Agent Three");
      const tool = await createTool("Tool Three");

      await app.request(`/api/agents/${agent.id}/tools/${tool.id}`, {
        method: "POST",
        headers: headers(),
      });

      const res = await app.request(`/api/agents/${agent.id}/tools/${tool.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tools).toHaveLength(0);
    });

    it("returns 404 for missing agent", async () => {
      const res = await app.request(`/api/agents/99999/tools/1`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Agent not found");
    });

    it("returns 404 for missing tool", async () => {
      const agent = await createAgent("Agent Four");
      const res = await app.request(`/api/agents/${agent.id}/tools/99999`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Tool not found");
    });
  });
});
