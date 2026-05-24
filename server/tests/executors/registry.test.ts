import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  registerTool,
  getTool,
  listToolNames,
  buildToolMetas,
} from "../../src/tools/registry.js";
import type { ToolDefinition } from "../../src/tools/types.js";

describe("tool registry", () => {
  it("registers and retrieves a tool", () => {
    const def: ToolDefinition = {
      name: "test_tool",
      description: "A test tool",
      parameters: z.object({ input: z.string() }),
      execute: async (params) => `echo: ${params.input}`,
    };

    registerTool(def);
    const retrieved = getTool("test_tool");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("test_tool");
  });

  it("lists registered tool names", () => {
    const names = listToolNames();
    expect(names).toContain("test_tool");
  });

  it("throws on duplicate registration", () => {
    const def: ToolDefinition = {
      name: "test_tool_dup",
      description: "Dup",
      parameters: z.object({}),
      execute: async () => "ok",
    };

    registerTool(def);
    expect(() => registerTool(def)).toThrow('Tool "test_tool_dup" is already registered');
  });

  it("builds OpenAI-compatible tool metadata", () => {
    const def: ToolDefinition = {
      name: "meta_tool",
      description: "Returns metadata",
      parameters: z.object({
        query: z.string(),
        limit: z.number().optional(),
      }),
      execute: async () => "ok",
    };

    registerTool(def);
    const metas = buildToolMetas(["meta_tool"]);
    expect(metas).toHaveLength(1);
    expect(metas[0].type).toBe("function");
    expect(metas[0].function.name).toBe("meta_tool");
    expect(metas[0].function.parameters.type).toBe("object");
    expect(metas[0].function.parameters.properties).toHaveProperty("query");
    expect(metas[0].function.parameters.required).toContain("query");
    expect(metas[0].function.parameters.required).not.toContain("limit");
  });

  it("returns all metas when no filter is given", () => {
    const metas = buildToolMetas();
    expect(metas.length).toBeGreaterThanOrEqual(3);
  });
});
