import { describe, it, expect } from "vitest";
import { app } from "../../src/index.js";

const apiKey = "dev-key-change-me";

function headers() {
  return { "x-api-key": apiKey };
}

async function createTool(name: string, handler_key = "stub") {
  const res = await app.request("/api/tools", {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ name, handler_key }),
  });
  return res.json();
}

describe("tools", () => {
  describe("GET /api/tools", () => {
    it("returns an empty list initially", async () => {
      const res = await app.request("/api/tools", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });

    it("returns created tools", async () => {
      await createTool("Tool One");

      const res = await app.request("/api/tools", { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Tool One");
    });
  });

  describe("POST /api/tools", () => {
    it("creates a tool with all fields", async () => {
      const res = await app.request("/api/tools", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({
          name: "Tool Two",
          description: "desc",
          handler_key: "handler",
          json_schema: '{"type":"object"}',
          is_enabled: false,
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe("Tool Two");
      expect(json.description).toBe("desc");
      expect(json.handler_key).toBe("handler");
      expect(json.json_schema).toBe('{"type":"object"}');
      expect(json.is_enabled).toBe(false);
    });

    it("rejects duplicate name", async () => {
      await createTool("Tool Dup");
      const res = await app.request("/api/tools", {
        method: "POST",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Tool Dup", handler_key: "h" }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already exists");
    });
  });

  describe("GET /api/tools/:id", () => {
    it("returns a tool", async () => {
      const tool = await createTool("Tool Three");

      const res = await app.request(`/api/tools/${tool.id}`, { headers: headers() });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(tool.id);
      expect(json.name).toBe("Tool Three");
    });

    it("returns 404 for missing tool", async () => {
      const res = await app.request("/api/tools/99999", { headers: headers() });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Tool not found");
    });
  });

  describe("PATCH /api/tools/:id", () => {
    it("updates name, description and is_enabled", async () => {
      const tool = await createTool("Tool Four");

      const res = await app.request(`/api/tools/${tool.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({
          name: "Tool Four-Updated",
          description: "new desc",
          is_enabled: false,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Tool Four-Updated");
      expect(json.description).toBe("new desc");
      expect(json.is_enabled).toBe(false);
    });

    it("returns 404 for missing tool", async () => {
      const res = await app.request("/api/tools/99999", {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      });
      expect(res.status).toBe(404);
    });

    it("rejects duplicate name on update", async () => {
      await createTool("Tool Alpha");
      const tool = await createTool("Tool Beta");

      const res = await app.request(`/api/tools/${tool.id}`, {
        method: "PATCH",
        headers: { ...headers(), "content-type": "application/json" },
        body: JSON.stringify({ name: "Tool Alpha" }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already exists");
    });
  });

  describe("DELETE /api/tools/:id", () => {
    it("deletes a tool", async () => {
      const tool = await createTool("Tool Five");

      const res = await app.request(`/api/tools/${tool.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(204);

      const getRes = await app.request(`/api/tools/${tool.id}`, { headers: headers() });
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for missing tool", async () => {
      const res = await app.request("/api/tools/99999", {
        method: "DELETE",
        headers: headers(),
      });
      expect(res.status).toBe(404);
    });
  });
});
