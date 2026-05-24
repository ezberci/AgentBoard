import type { ToolDefinition, ToolMeta } from "./types.js";

const registry = new Map<string, ToolDefinition>();

/**
 * Register a tool definition so it can be discovered and executed.
 */
export function registerTool(def: ToolDefinition): void {
  if (registry.has(def.name)) {
    throw new Error(`Tool "${def.name}" is already registered`);
  }
  registry.set(def.name, def);
}

/**
 * Look up a tool by its registry name.
 */
export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

/**
 * List all registered tool names.
 */
export function listToolNames(): string[] {
  return Array.from(registry.keys());
}

/**
 * Convert a Zod schema to a JSON Schema object.
 *
 * This is a minimal best-effort converter for OpenAI-compatible
 * function calling. For complex schemas you may want to swap in
 * `zod-to-json-schema` later.
 */
function zodSchemaToJsonSchema(schema: unknown): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const z = schema as any;

  if (!z || typeof z._def !== "object") {
    return { type: "object", properties: {} };
  }

  const def = z._def;
  const typeName = def.typeName as string;

  if (typeName === "ZodObject") {
    const shape = def.shape() as Record<string, unknown>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = value as any;
      const isOptional = v._def?.typeName === "ZodOptional";
      const inner = isOptional ? v._def.innerType : v;
      properties[key] = zodSchemaToJsonSchema(inner);
      if (!isOptional) required.push(key);
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  if (typeName === "ZodString") return { type: "string" };
  if (typeName === "ZodNumber") return { type: "number" };
  if (typeName === "ZodBoolean") return { type: "boolean" };
  if (typeName === "ZodArray") {
    return {
      type: "array",
      items: zodSchemaToJsonSchema(def.type),
    };
  }
  if (typeName === "ZodOptional") {
    return zodSchemaToJsonSchema(def.innerType);
  }
  if (typeName === "ZodEnum") {
    return { type: "string", enum: def.values };
  }

  return { type: "object", properties: {} };
}

/**
 * Build OpenAI-compatible tool metadata from registered definitions.
 */
export function buildToolMetas(names?: string[]): ToolMeta[] {
  const defs = names ? names.map((n) => registry.get(n)).filter(Boolean) as ToolDefinition[] : Array.from(registry.values());

  return buildToolMetasFromDefs(defs);
}

/**
 * Build OpenAI-compatible tool metadata from explicit definitions.
 */
export function buildToolMetasFromDefs(defs: ToolDefinition[]): ToolMeta[] {
  return defs.map((def) => ({
    type: "function" as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: zodSchemaToJsonSchema(def.parameters),
    },
  }));
}
