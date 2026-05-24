import type { z } from "zod";
import type { ToolContext } from "./context.js";

/**
 * Definition of a tool that can be registered and invoked by agents.
 *
 * The `parameters` Zod schema is used both for runtime validation and for
 * generating the JSON Schema sent to the LLM (OpenAI-compatible function
 * calling).
 */
export interface ToolDefinition<P = unknown, R = unknown> {
  /** Unique registry key, e.g. "read", "shell" */
  name: string;

  /** Human-readable description shown in the LLM tools array. */
  description: string;

  /** Zod schema for the tool's parameters. */
  parameters: z.ZodSchema<P>;

  /**
   * Execute the tool.
   *
   * @param params — validated parameters
   * @param ctx    — runtime context (task, agent, abort signal, logger)
   * @returns      — tool result (will be stringified for the LLM)
   */
  execute(params: P, ctx: ToolContext): Promise<R> | R;
}

/**
 * Lightweight metadata about a tool, suitable for sending to the LLM
 * in the `tools` array.
 */
export interface ToolMeta {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
